import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
// @ts-expect-error - module has no bundled types
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'A4').toUpperCase();
    const destinationUrl = 'https://sos-print.vercel.app/print';

    const isA5 = format === 'A5';
    // A4: 595.28 x 841.89 pt | A5: 419.53 x 595.28 pt
    const width = isA5 ? 419.53 : 595.28;
    const height = isA5 ? 595.28 : 841.89;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([width, height]);

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Color definitions
    const emeraldPrimary = rgb(5 / 255, 150 / 255, 105 / 255); // #059669
    const darkSlate = rgb(15 / 255, 23 / 255, 42 / 255); // #0F172A
    const textMuted = rgb(71 / 255, 85 / 255, 105 / 255); // #475569
    const borderSlate = rgb(226 / 255, 232 / 255, 240 / 255); // #E2E8F0
    const lightBg = rgb(248 / 255, 250 / 255, 252 / 255); // #F8FAFC
    const softAccent = rgb(236 / 255, 253 / 255, 245 / 255); // #ECFDF5

    // Background
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(1, 1, 1)
    });

    // Outer decorative border
    const margin = isA5 ? 20 : 30;
    page.drawRectangle({
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: height - margin * 2,
      borderColor: borderSlate,
      borderWidth: 1.5,
      color: rgb(1, 1, 1)
    });

    // Top Brand Badge
    let cursorY = height - margin - (isA5 ? 35 : 45);

    // Wordmark: SOS PRINT
    const brandTitle = "SOS PRINT";
    const brandSize = isA5 ? 26 : 34;
    const brandWidth = fontBold.widthOfTextAtSize(brandTitle, brandSize);
    page.drawText(brandTitle, {
      x: (width - brandWidth) / 2,
      y: cursorY,
      size: brandSize,
      font: fontBold,
      color: emeraldPrimary
    });

    cursorY -= isA5 ? 18 : 24;
    const shopSubtitle = "SHAKEEL ONLINE SERVICES, GUNTUR";
    const subSize = isA5 ? 10 : 13;
    const subWidth = fontBold.widthOfTextAtSize(shopSubtitle, subSize);
    page.drawText(shopSubtitle, {
      x: (width - subWidth) / 2,
      y: cursorY,
      size: subSize,
      font: fontBold,
      color: darkSlate
    });

    cursorY -= isA5 ? 22 : 30;
    const mainAction = "Scan QR to Upload & Print";
    const actionSize = isA5 ? 14 : 18;
    const actionWidth = fontBold.widthOfTextAtSize(mainAction, actionSize);
    page.drawText(mainAction, {
      x: (width - actionWidth) / 2,
      y: cursorY,
      size: actionSize,
      font: fontBold,
      color: darkSlate
    });

    // Generate high contrast QR code
    const qrPixelSize = isA5 ? 180 : 230;
    cursorY -= qrPixelSize + (isA5 ? 15 : 20);

    const qrPngBuffer = await QRCode.toBuffer(destinationUrl, {
      type: 'png',
      margin: 2,
      width: 500,
      color: { dark: '#0F172A', light: '#FFFFFF' }
    });

    const qrImage = await pdfDoc.embedPng(qrPngBuffer);
    const qrX = (width - qrPixelSize) / 2;

    // QR container box
    page.drawRectangle({
      x: qrX - 8,
      y: cursorY - 8,
      width: qrPixelSize + 16,
      height: qrPixelSize + 16,
      borderColor: darkSlate,
      borderWidth: 2,
      color: rgb(1, 1, 1)
    });

    page.drawImage(qrImage, {
      x: qrX,
      y: cursorY,
      width: qrPixelSize,
      height: qrPixelSize
    });

    // Readable URL beneath QR
    cursorY -= isA5 ? 22 : 28;
    const urlText = destinationUrl.replace(/^https?:\/\//, '');
    const urlSize = isA5 ? 10 : 12;
    const urlWidth = fontBold.widthOfTextAtSize(urlText, urlSize);
    page.drawText(urlText, {
      x: (width - urlWidth) / 2,
      y: cursorY,
      size: urlSize,
      font: fontBold,
      color: darkSlate
    });

    cursorY -= isA5 ? 14 : 18;
    const noAppText = "No app download or login required &bull; Direct mobile upload";
    const noAppClean = "No app download or login required  *  Direct mobile upload";
    const noAppSize = isA5 ? 8 : 10;
    const noAppWidth = fontRegular.widthOfTextAtSize(noAppClean, noAppSize);
    page.drawText(noAppClean, {
      x: (width - noAppWidth) / 2,
      y: cursorY,
      size: noAppSize,
      font: fontRegular,
      color: textMuted
    });

    // 5 English Steps Box
    cursorY -= isA5 ? 20 : 25;
    const boxHeight = isA5 ? 120 : 150;
    const boxWidth = width - margin * 2 - (isA5 ? 20 : 40);
    const boxX = (width - boxWidth) / 2;

    page.drawRectangle({
      x: boxX,
      y: cursorY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      color: lightBg,
      borderColor: borderSlate,
      borderWidth: 1
    });

    const stepsHeader = "HOW TO PRINT IN 5 EASY STEPS:";
    const stepHeadSize = isA5 ? 9 : 11;
    page.drawText(stepsHeader, {
      x: boxX + 16,
      y: cursorY - (isA5 ? 16 : 22),
      size: stepHeadSize,
      font: fontBold,
      color: emeraldPrimary
    });

    const steps = [
      "1. Scan the QR code above with your phone camera.",
      "2. Upload your documents (PDF, JPG or PNG).",
      "3. Choose print settings (B&W/Color, Duplex, Copies).",
      "4. Pay at the counter or by direct UPI.",
      "5. Collect your print once confirmed by staff."
    ];

    let stepY = cursorY - (isA5 ? 32 : 44);
    const stepSize = isA5 ? 8.5 : 10.5;
    const lineSpacing = isA5 ? 17 : 21;

    for (const step of steps) {
      page.drawText(step, {
        x: boxX + 16,
        y: stepY,
        size: stepSize,
        font: fontRegular,
        color: darkSlate
      });
      stepY -= lineSpacing;
    }

    // Secondary Tools & Support Footer
    const footerY = margin + (isA5 ? 28 : 38);
    const secondaryText = "Also Available: Passport Photos * Resume Maker * Photo Sheets * Scan & ID Copy";
    const secSize = isA5 ? 8 : 9.5;
    const secWidth = fontBold.widthOfTextAtSize(secondaryText, secSize);
    page.drawText(secondaryText, {
      x: (width - secWidth) / 2,
      y: footerY + (isA5 ? 14 : 18),
      size: secSize,
      font: fontBold,
      color: textMuted
    });

    const contactText = "Customer Support WhatsApp: +91 9581529381";
    const contactSize = isA5 ? 9 : 11;
    const contactWidth = fontBold.widthOfTextAtSize(contactText, contactSize);
    page.drawText(contactText, {
      x: (width - contactWidth) / 2,
      y: footerY,
      size: contactSize,
      font: fontBold,
      color: darkSlate
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="SOS-Print-Poster-${format}.pdf"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate poster PDF';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
