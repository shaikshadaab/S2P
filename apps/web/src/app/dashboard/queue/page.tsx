"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { PRIMARY_PILOT_SHOP } from "@s2p/shared";
import { PrintJob, Printer as PrinterType } from "@s2p/shared";
import {
  Layers,
  Printer,
  FileText,
  Laptop,
  Clock,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function QueueDashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);
  const [selectedPrinterMap, setSelectedPrinterMap] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      const token = user ? await user.getIdToken() : "";
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const [jobsRes, printersRes] = await Promise.all([
        fetch(`/api/print-jobs?shopId=${PRIMARY_PILOT_SHOP.id}`, { headers }),
        fetch(`/api/printers?shopId=${PRIMARY_PILOT_SHOP.id}`, { headers })
      ]);

      const jobsData = await jobsRes.json();
      if (jobsRes.ok && jobsData.success) {
        setJobs(jobsData.printJobs || []);
      }

      const printersData = await printersRes.json();
      if (printersRes.ok && printersData.success) {
        setPrinters(printersData.printers || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load queue";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleAssignPrinter = async (jobId: string) => {
    const targetPrinterId = selectedPrinterMap[jobId];
    if (!targetPrinterId) return;

    setAssigningJobId(jobId);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch(`/api/print-jobs/${jobId}/assign-printer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          shopId: PRIMARY_PILOT_SHOP.id,
          printerId: targetPrinterId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to assign printer");
      }

      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error assigning printer";
      alert(msg);
    } finally {
      setAssigningJobId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "QUEUED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/30">QUEUED</span>;
      case "LEASED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-500/30">LEASED</span>;
      case "DOWNLOADING":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-500/30">DOWNLOADING</span>;
      case "READY_TO_PRINT":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> READY TO PRINT</span>;
      case "FAILED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/30 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>SOS Print Spooler Queue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative order-to-spool queue for {PRIMARY_PILOT_SHOP.name}
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-[#1f2937] hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#1f2937] flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Active Queue Items</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1e293b] text-slate-300">
            {jobs.length} jobs
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs space-y-2">
            <Layers className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-300">Queue is Empty</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Accepted orders with confirmed payments can be sent here from Orders Dashboard via &ldquo;Queue For Print&rdquo;.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1f2937]">
            {jobs.map((job) => {
              const cfg = (job.printConfigSnapshot || {}) as any;
              const assignedPrinter = printers.find((p) => p.id === job.printerId);

              return (
                <div key={job.id} className="p-4 hover:bg-[#161f2f]/40 transition text-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{job.orderNumber}</span>
                      <span className="text-[10px] font-mono text-slate-500">ID: {job.id}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                        PAID
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(job.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0b0f0e] border border-[#1f2937] rounded-lg p-3">
                    {/* Document details */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3 h-3 text-purple-400" />
                        <span>Document</span>
                      </div>
                      <div className="font-semibold text-slate-200 truncate">{job.fileSnapshot?.filename || "document.pdf"}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {job.fileSnapshot?.pageCount || 1} pages · {((job.fileSnapshot?.sizeBytes || 0) / 1024).toFixed(1)} KB
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono truncate" title={job.fileSnapshot?.sha256}>
                        SHA: {job.fileSnapshot?.sha256?.slice(0, 16)}...
                      </div>
                    </div>

                    {/* Print Configuration */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Printer className="w-3 h-3 text-purple-400" />
                        <span>Print Settings</span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono space-y-0.5">
                        <div>Copies: <strong>{cfg.copies || 1}</strong></div>
                        <div>Color: <strong>{cfg.colorMode || "BW"}</strong> · Paper: <strong>{cfg.paperSize || "A4"}</strong></div>
                        <div>Duplex: <strong>{cfg.duplexMode || "SINGLE"}</strong></div>
                        <div>Orientation: <strong>{cfg.orientation || "AUTO"}</strong> · Scale: <strong>{cfg.scaling || "FIT"}</strong></div>
                        {cfg.pageRange && cfg.pageRange !== "all" && (
                          <div className="text-amber-400">Pages: <strong>{cfg.pageRange}</strong></div>
                        )}
                      </div>
                    </div>

                    {/* Printer & Agent Assignment */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Laptop className="w-3 h-3 text-purple-400" />
                        <span>Routing & Assignment</span>
                      </div>

                      {/* Printer assignment UI */}
                      <div className="text-[11px] font-mono">
                        {assignedPrinter ? (
                          <div className="flex items-center gap-1 text-slate-300">
                            <span>Printer:</span>
                            <strong className="text-white">{assignedPrinter.displayName}</strong>
                            <span className={`px-1 rounded text-[9px] ${assignedPrinter.printerKind === 'PHYSICAL' ? 'bg-blue-950/60 text-blue-300' : 'bg-purple-950/60 text-purple-300'}`}>
                              {assignedPrinter.printerKind}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={selectedPrinterMap[job.id] || ""}
                              onChange={(e) => setSelectedPrinterMap({ ...selectedPrinterMap, [job.id]: e.target.value })}
                              className="bg-[#1e293b] text-slate-200 border border-[#374151] rounded px-1.5 py-0.5 text-[10px]"
                            >
                              <option value="">Select Printer...</option>
                              {printers.map((pr) => (
                                <option key={pr.id} value={pr.id}>
                                  {pr.displayName} ({pr.printerKind || 'PRINTER'})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssignPrinter(job.id)}
                              disabled={!selectedPrinterMap[job.id] || assigningJobId === job.id}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] disabled:opacity-50"
                            >
                              Assign
                            </button>
                          </div>
                        )}
                      </div>

                      {job.lease ? (
                        <div className="text-[11px] text-slate-400 font-mono space-y-0.5 border-t border-[#1f2937] pt-1">
                          <div>Device: <strong className="text-emerald-400">{job.lease.deviceId}</strong></div>
                          <div className="text-amber-400">Lease: {new Date(job.lease.expiresAt).toLocaleTimeString()}</div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 italic">
                          Awaiting Windows Agent claim...
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Queued: {new Date(job.createdAt).toLocaleTimeString()} ({new Date(job.createdAt).toLocaleDateString()})
                    </span>
                    <Link
                      href={`/track/${job.orderId}`}
                      target="_blank"
                      className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
                    >
                      <span>Customer Tracking</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
