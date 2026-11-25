import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  Calendar,
  Activity,
  Award
} from "lucide-react";

interface MoboSummaryRecord {
  id: string;
  name: string;
  groupDriver: string;
  jmlShipment: string;
  activities: {
    mulaiPenugasan: string;
    naikContainer: string;
    muat: string;
    bongkar: string;
    turunContainer: string;
    selesaiPenugasan: string;
  };
  retention: string;
  treatment: string;
}

export default function MasterDataMoboActivity() {
  const [loading, setLoading] = useState<boolean>(true);
  const [metadata, setMetadata] = useState<{
    entity: string;
    month: string;
    year: string;
    overallRetention: string;
    totalDrivers: number;
    groupCounts: Record<string, number>;
    treatmentCounts: Record<string, number>;
  } | null>(null);
  const [records, setRecords] = useState<MoboSummaryRecord[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sheets/master-data/mobo-activity");
      const json = await res.json();
      if (json.success) {
        setMetadata(json.metadata);
        setRecords(json.records || []);
      }
    } catch (e) {
      console.error("Failed to fetch mobo activity master:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered list
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.groupDriver.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup = selectedGroup === "all" || r.groupDriver === selectedGroup;
      const matchesTreatment = selectedTreatment === "all" || r.treatment === selectedTreatment;
      return matchesSearch && matchesGroup && matchesTreatment;
    });
  }, [records, searchQuery, selectedGroup, selectedTreatment]);

  // Unique groups
  const uniqueGroups = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.groupDriver) set.add(r.groupDriver);
    });
    return Array.from(set).sort();
  }, [records]);

  // Unique treatments
  const uniqueTreatments = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.treatment) set.add(r.treatment);
    });
    return Array.from(set).sort();
  }, [records]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Top Header Bar mirroring Google Spreadsheet */}
      <div className="bg-[#1e4a7a] text-white px-5 py-3.5 border-b border-sky-800 flex flex-wrap items-center justify-between gap-3 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
            <Smartphone className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                Master Data Spreadsheet
              </span>
              <span className="text-xs text-sky-200 font-medium hidden sm:inline">
                • Sheet Mirroring
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-black tracking-wide text-white">
              Monitoring Mobo Activity
            </h1>
          </div>
        </div>

        {/* Action Controls & External Link */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-all border border-white/20 cursor-pointer"
            title="Refresh Data dari Spreadsheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sinkronisasi</span>
          </button>

          <a
            href="https://docs.google.com/spreadsheets/d/13JdIg2q3KAs-797Qg2KAjxh-sMsNivW0lFTZkOmBiDg/edit#gid=48124589"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-sm"
            title="Buka Spreadsheet Asli di Google Sheets"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Spreadsheet</span>
          </a>
        </div>
      </div>

      {/* Spreadsheet Mirror Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Spreadsheet Header Mirroring (Entity: PDT | Month: Agustus 2026 | Retention: 51%) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500">Entity:</span>
                <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                  {metadata?.entity || "PDT"}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500">Period:</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {metadata?.month || "Agustus"} {metadata?.year || "2026"}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500">Total Drivers:</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {records.length}
                </span>
              </div>
            </div>

            {/* Overall Retention Metric */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/40 px-4 py-2 rounded-xl border border-sky-200 dark:border-sky-800/60">
              <Award className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                  Overall Retention Rate
                </div>
                <div className="text-xl font-black text-blue-700 dark:text-blue-300">
                  {metadata?.overallRetention || "51%"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Tabel Mirroring: Summary Activity & 6 Milestone Checklist Mobo
              </h2>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Menampilkan {filteredRecords.length} dari {records.length} pengemudi
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No ID, Nama Driver, atau Group Driver..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 font-medium text-xs"
              />
            </div>

            {/* Group Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-300">Group Driver :</span>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Semua Group ({uniqueGroups.length})</option>
                {uniqueGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Treatment Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-300">Treatment :</span>
              <select
                value={selectedTreatment}
                onChange={(e) => setSelectedTreatment(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Semua Treatment ({uniqueTreatments.length})</option>
                {uniqueTreatments.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Master Table Mirroring (Summary Activity Google Sheet format) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* Level 1 Super Header matching Google Spreadsheet */}
                <tr className="bg-[#1e4a7a] text-white font-bold border-b border-sky-800 text-center">
                  <th className="px-3 py-2 border-r border-sky-700 text-left" rowSpan={2}>No ID</th>
                  <th className="px-3 py-2 border-r border-sky-700 text-left" rowSpan={2}>Nama Driver</th>
                  <th className="px-3 py-2 border-r border-sky-700 text-left" rowSpan={2}>Group Driver</th>
                  <th className="px-3 py-2 border-r border-sky-700" rowSpan={2}>Jumlah Shipment</th>
                  <th className="px-3 py-1.5 border-r border-sky-700" colSpan={6}>Activity (6 Tahapan Mobo)</th>
                  <th className="px-3 py-2 border-r border-sky-700" rowSpan={2}>Retention</th>
                  <th className="px-3 py-2" rowSpan={2}>Treatment</th>
                </tr>
                {/* Level 2 Activity Breakdown Header matching Google Spreadsheet */}
                <tr className="bg-[#163a61] text-sky-200 text-[11px] font-semibold border-b border-sky-700 text-center">
                  <th className="px-2 py-1.5 border-r border-sky-700">Mulai Penugasan</th>
                  <th className="px-2 py-1.5 border-r border-sky-700">Naik Container</th>
                  <th className="px-2 py-1.5 border-r border-sky-700">Muat</th>
                  <th className="px-2 py-1.5 border-r border-sky-700">Bongkar</th>
                  <th className="px-2 py-1.5 border-r border-sky-700">Turun Container</th>
                  <th className="px-2 py-1.5 border-r border-sky-700">Selesai Penugasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((r, idx) => (
                    <tr
                      key={`${r.id}-${idx}`}
                      className="hover:bg-sky-50/60 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-700/60">
                        {r.id}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-700/60">
                        {r.name}
                      </td>
                      <td className="px-3 py-2.5 border-r border-slate-100 dark:border-slate-700/60">
                        <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {r.groupDriver}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-700/60">
                        {r.jmlShipment}
                      </td>

                      {/* 6 Activity Milestone Percentages */}
                      <td className="px-2 py-2.5 text-center font-mono text-[11px] border-r border-slate-100 dark:border-slate-700/60 font-semibold text-slate-700 dark:text-slate-300">
                        {r.activities.mulaiPenugasan}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-[11px] border-r border-slate-100 dark:border-slate-700/60 font-semibold text-slate-700 dark:text-slate-300">
                        {r.activities.naikContainer}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-[11px] border-r border-slate-100 dark:border-slate-700/60 font-semibold text-slate-700 dark:text-slate-300">
                        {r.activities.muat}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-[11px] border-r border-slate-100 dark:border-slate-700/60 font-semibold text-slate-700 dark:text-slate-300">
                        {r.activities.bongkar}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-[11px] border-r border-slate-100 dark:border-slate-700/60 font-semibold text-slate-700 dark:text-slate-300">
                        {r.activities.turunContainer}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-[11px] border-r border-slate-100 dark:border-slate-700/60 font-semibold text-slate-700 dark:text-slate-300">
                        {r.activities.selesaiPenugasan}
                      </td>

                      {/* Retention Rate */}
                      <td className="px-3 py-2.5 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400 border-r border-slate-100 dark:border-slate-700/60">
                        {r.retention}
                      </td>

                      {/* Treatment Badge */}
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                            r.treatment === "Good Performance"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : r.treatment === "Nudging and Reminding"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : r.treatment === "Coaching"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {r.treatment}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="text-center py-10 text-slate-400 text-xs font-semibold">
                      Tidak ada data driver yang cocok dengan pencarian / filter ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
