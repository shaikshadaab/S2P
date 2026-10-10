"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserX,
  Mail,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase/config";
import { useAuth } from "../../../lib/firebase/auth-context";
import { PRIMARY_PILOT_SHOP, ShopMember, UserRole } from "@s2p/shared";

export default function DashboardStaffPage() {
  const { role, user } = useAuth();
  const isOwner = role === "OWNER";

  const [members, setMembers] = useState<ShopMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add Staff Form
  const [newUid, setNewUid] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newDisplayName, setNewDisplayName] = useState<string>("");
  const [newRole, setNewRole] = useState<UserRole>("COUNTER_STAFF");
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [formMsg, setFormMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "shopMembers"),
        where("shopId", "==", PRIMARY_PILOT_SHOP.id)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => d.data() as ShopMember);
      setMembers(list);
    } catch (err: unknown) {
      console.warn("[Staff] Error fetching members:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    const trimmedUid = newUid.trim();
    if (!trimmedUid) {
      setFormMsg({ text: "Firebase Auth UID is required", isError: true });
      return;
    }

    setIsAdding(true);
    setFormMsg(null);

    try {
      const memberDocId = `${trimmedUid}_${PRIMARY_PILOT_SHOP.id}`;
      const now = new Date().toISOString();

      const memberData: ShopMember = {
        id: memberDocId,
        userId: trimmedUid,
        organizationId: PRIMARY_PILOT_SHOP.id,
        shopId: PRIMARY_PILOT_SHOP.id,
        role: newRole as any,
        status: "ACTIVE",
        email: newEmail.trim() || undefined,
        displayName: newDisplayName.trim() || undefined,
        createdAt: now,
        updatedAt: now
      };

      await setDoc(doc(db, "shopMembers", memberDocId), memberData);
      setFormMsg({ text: `Successfully authorized staff member with role ${newRole}!`, isError: false });
      setNewUid("");
      setNewEmail("");
      setNewDisplayName("");
      await fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add member";
      setFormMsg({ text: msg, isError: true });
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleStatus = async (m: ShopMember) => {
    if (!isOwner || m.role === "OWNER" || !m.id) return;

    try {
      const nextStatus = m.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      await updateDoc(doc(db, "shopMembers", m.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      await fetchMembers();
    } catch (err: unknown) {
      alert("Failed to update member status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">Staff & Authorization (RBAC)</h1>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Fail-Closed Security
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Authorize and manage staff access for {PRIMARY_PILOT_SHOP.name}. Creating a Firebase Auth user grants zero permissions without an active membership record.
          </p>
        </div>

        <button
          onClick={fetchMembers}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1f2937] hover:bg-[#374151] disabled:opacity-50 text-white text-xs font-bold rounded-xl border border-[#374151] transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Owner Security Invariant Alert */}
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <span className="font-bold text-white block">
            Strict Authoritative Access Policy
          </span>
          <p className="text-slate-300 leading-relaxed">
            All dashboard endpoints and customer orders are strictly tenant-isolated to <strong className="text-white">{PRIMARY_PILOT_SHOP.name}</strong> ({PRIMARY_PILOT_SHOP.id}). Only approved users with active membership records in Firestore can access staff screens.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members List (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Authorized Members ({members.length})
              </h2>
              <span className="text-[10px] font-mono text-slate-400">
                shopMembers collection
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs">Loading membership records...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No staff members found.
              </div>
            ) : (
              <div className="divide-y divide-[#1f2937]">
                {members.map((m) => (
                  <div
                    key={m.id || m.userId}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {m.displayName || m.email || "Staff User"}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            m.role === "OWNER"
                              ? "bg-purple-950 text-purple-300 border border-purple-500/30"
                              : m.role === "MANAGER"
                              ? "bg-blue-950 text-blue-300 border border-blue-500/30"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {m.role}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            m.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="font-mono text-slate-500">UID: {m.userId}</span>
                        {m.email && <span>• {m.email}</span>}
                      </div>
                    </div>

                    {isOwner && m.role !== "OWNER" && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleToggleStatus(m)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            m.status === "ACTIVE"
                              ? "bg-amber-950/60 hover:bg-amber-900/60 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {m.status === "ACTIVE" ? "Suspend Access" : "Reactivate Access"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Member Form (1 Column) */}
        <div>
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Authorize New Staff</h2>
            </div>
            <p className="text-xs text-slate-400">
              Enter the Firebase Auth UID of the created staff user to grant access.
            </p>

            {formMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  formMsg.isError
                    ? "bg-rose-950/60 border border-rose-500/30 text-rose-300"
                    : "bg-emerald-950/60 border border-emerald-500/30 text-emerald-300"
                }`}
              >
                {formMsg.isError ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                )}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Firebase Auth UID *
                </label>
                <input
                  type="text"
                  required
                  value={newUid}
                  onChange={(e) => setNewUid(e.target.value)}
                  placeholder="e.g. YSakxmoeNRX85x7eQKG2P7KYmPo2"
                  className="w-full py-2 px-3 bg-[#1f2937] border border-[#374151] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="staff@shakeelprint.in"
                  className="w-full py-2 px-3 bg-[#1f2937] border border-[#374151] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Ahmed Cashier"
                  className="w-full py-2 px-3 bg-[#1f2937] border border-[#374151] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Authorized Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full py-2 px-3 bg-[#1f2937] border border-[#374151] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="COUNTER_STAFF">COUNTER_STAFF (Orders & Payments)</option>
                  <option value="PRINT_OPERATOR">PRINT_OPERATOR (Print Queue & Spooler)</option>
                  <option value="MANAGER">MANAGER (Full Operational Access)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isAdding || !isOwner}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
              >
                {isAdding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Authorizing in Firestore...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Authorize Member</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
