"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./config";
import { UserRole, ShopMember, PRIMARY_PILOT_SHOP } from "@s2p/shared";

interface AuthContextType {
  user: User | null;
  member: ShopMember | null;
  role: UserRole | null;
  shopId: string | null;
  loading: boolean;
  membershipError: "NO_ACTIVE_MEMBERSHIP" | "MEMBERSHIP_LOOKUP_FAILED" | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshMembership: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  member: null,
  role: null,
  shopId: null,
  loading: true,
  membershipError: null,
  login: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  refreshMembership: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<ShopMember | null>(null);
  const [membershipError, setMembershipError] = useState<"NO_ACTIVE_MEMBERSHIP" | "MEMBERSHIP_LOOKUP_FAILED" | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMembership = async (currentUser: User | null) => {
    if (!currentUser) {
      setMember(null);
      setMembershipError(null);
      setLoading(false);
      return;
    }

    // 1. Authoritative Server-side verification using Admin SDK
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/auth/membership", {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.member?.status === "ACTIVE") {
          setMember(data.member);
          setMembershipError(null);
          setLoading(false);
          return;
        } else if (data.error === "NO_ACTIVE_MEMBERSHIP" || data.error === "MEMBERSHIP_SUSPENDED") {
          setMember(null);
          setMembershipError("NO_ACTIVE_MEMBERSHIP");
          setLoading(false);
          return;
        }
      }
    } catch (apiErr) {
      console.warn("[S2P Auth] Server membership check warning, attempting client SDK:", apiErr);
    }

    // 2. Client-side SDK fallback
    try {
      const membershipDocId = `${currentUser.uid}_${PRIMARY_PILOT_SHOP.id}`;
      const memberRef = doc(db, "shopMembers", membershipDocId);
      const snap = await getDoc(memberRef);

      if (snap.exists()) {
        const data = snap.data() as ShopMember;
        if (data.status === "ACTIVE") {
          setMember({ ...data, id: snap.id });
          setMembershipError(null);
        } else {
          setMember(null);
          setMembershipError("NO_ACTIVE_MEMBERSHIP");
        }
      } else {
        setMember(null);
        setMembershipError("NO_ACTIVE_MEMBERSHIP");
      }
    } catch (err) {
      console.error("[S2P Auth] Client-side fetch shop membership failed:", err);
      setMember(null);
      setMembershipError("MEMBERSHIP_LOOKUP_FAILED");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      await fetchMembership(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
    setMember(null);
    setMembershipError(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshMembership = async () => {
    setLoading(true);
    await fetchMembership(user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        member,
        role: member?.role ?? null,
        shopId: member?.shopId ?? null,
        loading,
        membershipError,
        login,
        logout,
        resetPassword,
        refreshMembership,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
