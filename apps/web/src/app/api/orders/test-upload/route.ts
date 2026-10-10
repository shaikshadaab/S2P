import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { getActiveShopMember } from '@/server/order-service';
import { issueUploadGrant } from '@/server/upload-grant-service';
import { PRIMARY_PILOT_SHOP, Device } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);

    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json(
        { success: false, error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required. Only shop OWNER or MANAGER can perform commissioning test uploads.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const shopId = body.shopId || PRIMARY_PILOT_SHOP.id;

    // 1. Role verification
    const member = await getActiveShopMember(adminDb, identity.uid, shopId);
    if (!['OWNER', 'MANAGER'].includes(member.role)) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED_ROLE', message: 'Only OWNER or MANAGER can trigger commissioning upload tests.' },
        { status: 403 }
      );
    }

    // 2. Online device verification
    const now = Date.now();
    const devicesSnap = await adminDb.collection('devices')
      .where('shopId', '==', shopId)
      .get();

    const onlineDevices = devicesSnap.docs
      .map(d => d.data() as Device)
      .filter(d => d.status === 'ONLINE' && (now - new Date(d.lastHeartbeatAt || 0).getTime() <= 90000));

    if (onlineDevices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'AGENT_OFFLINE', message: 'Shop counter PC is offline. Please launch start-agent.bat.' },
        { status: 503 }
      );
    }

    const primaryDevice = onlineDevices[0];
    const agentUploadUrl = (primaryDevice.agentUploadUrl || '').trim();

    if (!agentUploadUrl) {
      return NextResponse.json(
        { success: false, error: 'UPLOAD_ENDPOINT_NOT_CONFIGURED', message: 'Upload tunnel URL is not configured. Run start-free-tunnel.bat.' },
        { status: 400 }
      );
    }

    // 3. Live health ping test
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const pingRes = await fetch(`${agentUploadUrl}/api/agent/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!pingRes.ok) {
        throw new Error(`Endpoint returned HTTP ${pingRes.status}`);
      }
    } catch (pingErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'TUNNEL_UNREACHABLE',
          message: `Shop PC upload tunnel is unreachable (${pingErr?.message || 'timeout'}). Ensure start-free-tunnel.bat is running on the shop PC.`
        },
        { status: 502 }
      );
    }

    // 4. Locate test_visible_a4.pdf
    const candidatePaths = [
      path.join(process.cwd(), 'public', 'test_visible_a4.pdf'),
      path.join(process.cwd(), 'apps', 'web', 'public', 'test_visible_a4.pdf'),
      path.join(process.cwd(), 'test_visible_a4.pdf')
    ];
    const foundPdfPath = candidatePaths.find(p => fs.existsSync(p));
    if (!foundPdfPath) {
      return NextResponse.json(
        { success: false, error: 'TEST_FILE_NOT_FOUND', message: 'test_visible_a4.pdf not found on server.' },
        { status: 500 }
      );
    }

    const fileBuffer = fs.readFileSync(foundPdfPath);
    const draftId = `draft_comm_${now.toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

    // Create commissioning draft in DB
    await adminDb.collection('orderDrafts').doc(draftId).set({
      id: draftId,
      shopId,
      organizationId: primaryDevice.organizationId,
      ownerUid: identity.uid,
      isGuest: false,
      files: [],
      isCommissioningDraft: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(now + 15 * 60 * 1000).toISOString()
    });

    // 5. Issue upload grant
    const grant = await issueUploadGrant(adminDb, {
      shopId,
      draftId,
      filename: 'test_visible_a4.pdf',
      mimeType: 'application/pdf',
      sizeBytes: fileBuffer.length
    }, {
      uid: identity.uid,
      isGuest: false
    });

    // 6. Direct upload to shop PC agent
    const form = new FormData();
    form.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), 'test_visible_a4.pdf');

    const agentUploadEndpoint = `${agentUploadUrl}/api/agent/upload`;
    const agentRes = await fetch(agentUploadEndpoint, {
      method: 'POST',
      headers: {
        'x-upload-grant-id': grant.grantId,
        'x-upload-grant-token': grant.token
      },
      body: form
    });

    const agentJson = await agentRes.json().catch(() => ({}));
    if (!agentRes.ok || !agentJson.success) {
      return NextResponse.json(
        {
          success: false,
          error: agentJson.error || 'AGENT_UPLOAD_FAILED',
          message: agentJson.message || 'Shop PC rejected commissioning test upload.'
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Commissioning test upload successful! File safely received on shop PC.',
      file: agentJson.file,
      agentUploadUrl,
      deviceId: primaryDevice.id,
      hostname: primaryDevice.hostname
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Commissioning upload test failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
