"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Star,
  ShieldCheck,
  RotateCcw,
  Loader2,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Lock
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, OrderReview } from "@s2p/shared";

interface ReviewStats {
  totalReviews: number;
  skippedCount: number;
  averageRating: number;
  distribution: Record<number, number>;
}

export default function DashboardReviewsPage() {
  const [reviews, setReviews] = useState<OrderReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const fetchReviews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews?shopId=${PRIMARY_PILOT_SHOP.id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load customer reviews");
      }
      setReviews(data.reviews || []);
      setStats(data.stats || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error loading reviews";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = filterRating
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
            <span>Customer Experience Feedback</span>
          </div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight mt-1">
            Customer Reviews & Ratings
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Private post-collection feedback submitted by customers after receiving prints at {PRIMARY_PILOT_SHOP.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchReviews}
            disabled={isLoading}
            className="py-2 px-3.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/dashboard/settings"
            className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-xs"
          >
            <span>Google Review Link</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-emerald-950 shadow-xs">
        <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-emerald-900">Private Customer Feedback Guarantee</span>
          <span className="text-[11px] text-emerald-800 leading-relaxed block mt-0.5">
            All feedback below is strictly internal to shop administration. Customer names, mobile numbers, and comments are never automatically published to public testimonials or external directories without explicit written consent.
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs space-y-2">
          <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
            <span>Average Rating</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-[#0F172A]">
              {stats?.averageRating ? stats.averageRating.toFixed(1) : "5.0"}
            </div>
            <div className="text-xs font-bold text-slate-400">/ 5.0</div>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${
                  star <= Math.round(stats?.averageRating || 5)
                    ? "fill-amber-400 text-amber-500"
                    : "fill-slate-100 text-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs space-y-2">
          <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
            <span>Total Reviews</span>
            <MessageSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-[#0F172A]">
            {stats?.totalReviews ?? 0}
          </div>
          <div className="text-[11px] text-[#64748B]">
            Submitted by verified collected orders
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs space-y-2">
          <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
            <span>Skipped Submissions</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-black text-[#0F172A]">
            {stats?.skippedCount ?? 0}
          </div>
          <div className="text-[11px] text-[#64748B]">
            Opted out of reviewing (100% voluntary)
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs space-y-2">
          <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
            <span>Satisfaction Rate</span>
            <ThumbsUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600">
            {stats && stats.totalReviews > 0
              ? `${Math.round(
                  (((stats.distribution[5] || 0) + (stats.distribution[4] || 0)) /
                    stats.totalReviews) *
                    100
                )}%`
              : "100%"}
          </div>
          <div className="text-[11px] text-[#64748B]">
            4-star & 5-star positive responses
          </div>
        </div>
      </div>

      {/* Star Breakdown & Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Rating Distribution Breakdown
          </h2>
          {filterRating && (
            <button
              type="button"
              onClick={() => setFilterRating(null)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
            >
              Clear Filter ({filterRating} Stars)
            </button>
          )}
        </div>

        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats?.distribution[rating] || 0;
            const total = stats?.totalReviews || 1;
            const pct = stats?.totalReviews ? Math.round((count / total) * 100) : 0;
            const isSelected = filterRating === rating;

            return (
              <div
                key={rating}
                onClick={() => setFilterRating(isSelected ? null : rating)}
                className={`flex items-center gap-3 p-2 rounded-xl transition cursor-pointer ${
                  isSelected ? "bg-emerald-50 border border-emerald-200" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1 w-16 text-xs font-bold text-[#0F172A]">
                  <span>{rating}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                </div>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[11px] font-mono text-[#64748B] w-12 text-right">
                  {count} ({pct}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews Table / List */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
            <span>Feedback Feed ({filteredReviews.length})</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Sorted by newest first
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Loading customer reviews...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-xs font-medium space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto text-red-500" />
            <p>{error}</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 stroke-1" />
            <p className="font-bold text-[#0F172A]">No reviews to display yet.</p>
            <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
              Customers will be offered a friendly 1-5 star review card on their tracking screen once their print order is marked ready or completed.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {filteredReviews.map((rev, idx) => (
              <div key={rev.id || idx} className="p-4 hover:bg-slate-50 transition space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {rev.orderNumber}
                    </span>
                    <span className="text-xs font-bold text-[#0F172A]">
                      {rev.customerName || "Customer"}
                    </span>
                    <div className="flex items-center gap-0.5 ml-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= (rev.rating || 5)
                              ? "fill-amber-400 text-amber-500"
                              : "fill-slate-100 text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(rev.submittedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>

                {rev.comment ? (
                  <p className="text-xs text-[#334155] bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    No written comment provided (Star rating only)
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
