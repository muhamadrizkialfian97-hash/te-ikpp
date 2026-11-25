import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Users,
  Award,
  Calendar,
  Layers,
  ChevronDown,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowUpDown,
  Download,
  X,
  Info
} from "lucide-react";

interface MonthlyPerf {
  bulan: string;
  shipment: string;
  retention: string;
}

interface DriverEval {
  id: string;
  driverName: string;
  group: string;
  garage: string;
  entity: string;
  tanggal: string;
  safety: string;
  attendance: string;
  tenko: string;
  moboAct: string;
  opsIssue: string;
  problemRec: string;
  overallScore: string;
  statusPerforma: string;
  jmlShipment: string;
  retention: string;
  treatment: string;
}

interface GroupDriverRosterItem {
  id: string;
  name: string;
  rawGroup: string;
  group: string;
  entity: string;
  groupDescription: string;
}

export default function MasterDataPerformanceDriver() {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    monthlyPerformance: MonthlyPerf[];
    weeklyRetention: any;
    activitiesRetention: { activity: string; rate: string }[];
    driverEvaluations: DriverEval[];
    groupDriverRoster: GroupDriverRosterItem[];
    overview: any;
    sheetUrl: string;
  } | null>(null);

  // Sub-tab view: Driver Evaluation (Mirror Parameter) vs Full Driver Roster (Mirror Group Driver)
  const [activeSubTab, setActiveSubTab] = useState<"evaluation" | "roster">("evaluation");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedGarage, setSelectedGarage] = useState<string>("all");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("all");
  const [selectedDriverModal, setSelectedDriverModal] = useState<DriverEval | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sheets/master-data/performance-driver");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch performance driver master:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered driver evaluations
  const filteredEvaluations = useMemo(() => {
    if (!data?.driverEvaluations) return [];
    return data.driverEvaluations.filter((d) => {
      const matchesSearch =
        d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.group.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup = selectedGroup === "all" || d.group === selectedGroup;
      const matchesEntity = selectedEntity === "all" || d.entity === selectedEntity;
      const matchesGarage = selectedGarage === "all" || d.garage === selectedGarage;
      const matchesTreatment = selectedTreatment === "all" || d.treatment === selectedTreatment;
      return matchesSearch && matchesGroup && matchesEntity && matchesGarage && matchesTreatment;
    });
  }, [data, searchQuery, selectedGroup, selectedEntity, selectedGarage, selectedTreatment]);

  // Filtered roster
  const filteredRoster = useMemo(() => {
    if (!data?.groupDriverRoster) return [];
    return data.groupDriverRoster.filter((d) => {
      const matchesSearch =
        d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.rawGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.group.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup = selectedGroup === "all" || d.group === selectedGroup;
      const matchesEntity = selectedEntity === "all" || d.entity === selectedEntity;
      return matchesSearch && matchesGroup && matchesEntity;
    });
  }, [data, searchQuery, selectedGroup, selectedEntity]);

  // Unique groups, entities, garages for filter dropdown
  const uniqueGroups = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    if (activeSubTab === "evaluation") {
      data.driverEvaluations?.forEach((d) => {
        if (d.group && d.group !== "-") set.add(d.group);
      });
    } else {
      data.groupDriverRoster?.forEach((d) => {
        if (d.group && d.group !== "-") set.add(d.group);
      });
    }
    return Array.from(set).sort();
  }, [data, activeSubTab]);

  const uniqueEntities = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    if (activeSubTab === "evaluation") {
      data.driverEvaluations?.forEach((d) => {
        if (d.entity && d.entity !== "-") set.add(d.entity);
      });
    } else {
      data.groupDriverRoster?.forEach((d) => {
        if (d.entity && d.entity !== "-") set.add(d.entity);
      });
    }
    return Array.from(set).sort();
  }, [data, activeSubTab]);

  const uniqueGarages = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.driverEvaluations?.forEach((d) => {
        if (d.garage && d.garage !== "-") set.add(d.garage);
    });
    return Array.from(set).sort();
  }, [data]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Top Header Bar */}
      <div className="bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-blue-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Dashboard Monitoring Kinerja Driver
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              Monitoring Kinerja & Kepatuhan Keselamatan Pengemudi
            </p>
          </div>
        </div>

        {/* Action Controls */}
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
            href="https://docs.google.com/spreadsheets/d/1NlUpv_imyYijuCQ2jmQbcZVZr7-H7B_zJmHPimV83Ok/edit?gid=1216460076#gid=1216460076"
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

      {/* Welcome Section */}
      <div className="p-4 md:p-6 pb-0">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Welcome to Driver Performance Dashboard
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time monitoring of driver performance, safety compliance, and operational metrics.
            </p>
          </div>
        </div>
      </div>

      {/* Spreadsheet Mirror Grid Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-4 space-y-6">
        {/* Spreadsheet Top Summary Cards (Mirroring Bulan, Shipment, Retention KPI Matrix) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                Total Evaluated Drivers
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {selectedEntity === "all" && selectedGroup === "all" && selectedGarage === "all" ? 1161 : (new Set(filteredEvaluations?.map(d => d.id)).size || 0)}
              </div>
              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Kolom ID, Driver & Retention
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                Retention Implementation
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                78,72%
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                Week 4 (Puncak Implementasi)
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/50 rounded-xl text-purple-600 dark:text-purple-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                Roster Group Driver
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {data?.overview?.totalDriversInRoster || "1.161"}
              </div>
              <div className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                RPT Driver Last Group Master
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                Activities Top Retention
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                94,33%
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                Mulai Penugasan (Start Job)
              </div>
            </div>
          </div>
        </div>

        {/* Table 1: Matrix Bulan x Shipment x Retention (Mirroring Parameter Left Columns) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Tabel Parameter: Monthly Performance Matrix (Bulan, Shipment, Retention)
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              Tab: Parameter (gid: 409443244, Kolom D-F)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-2.5">Bulan</th>
                  <th className="px-4 py-2.5">Shipment Count</th>
                  <th className="px-4 py-2.5">Retention Rate</th>
                  <th className="px-4 py-2.5">Weekly Benchmark (Implementation)</th>
                  <th className="px-4 py-2.5">Status Treatment Matrix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {(data?.monthlyPerformance || [
                  { bulan: "Januari", shipment: "1173", retention: "79,6%" },
                  { bulan: "Februari", shipment: "1145", retention: "78,2%" },
                  { bulan: "Maret", shipment: "929", retention: "75,5%" },
                  { bulan: "April", shipment: "1261", retention: "82,7%" },
                  { bulan: "Mei", shipment: "1244", retention: "76,9%" },
                  { bulan: "Juni", shipment: "1244", retention: "78,1%" },
                  { bulan: "Juli", shipment: "1380", retention: "75,4%" },
                  { bulan: "Agustus", shipment: "1115", retention: "73,8%" },
                  { bulan: "September", shipment: "749", retention: "55,0%" }
                ]).map((m, idx) => (
                  <tr
                    key={m.bulan}
                    className="hover:bg-sky-50/50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {m.bulan}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {m.shipment}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                      {m.retention}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {idx === 0
                        ? "W1: 80,43% • W2: 76,03% • W3: 77,49% • W4: 78,72%"
                        : idx === 1
                        ? "Nudging and Reminding Active"
                        : idx === 2
                        ? "Coaching Session Benchmark"
                        : idx === 3
                        ? "Training & Full Retention"
                        : "Ongoing Tracking"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        parseFloat(m.retention.replace("%", "").replace(",", ".")) >= 78
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : parseFloat(m.retention.replace("%", "").replace(",", ".")) >= 70
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}>
                        {parseFloat(m.retention.replace("%", "").replace(",", ".")) >= 78
                          ? "Good Performance"
                          : parseFloat(m.retention.replace("%", "").replace(",", ".")) >= 70
                          ? "Coaching / Nudging"
                          : "Training Required"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sub-navigation & Filter Toolbar for Driver Tables */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            {/* Tab switch mirroring spreadsheet views */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveSubTab("evaluation")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === "evaluation"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Tabel Evaluasi Driver ({data?.driverEvaluations?.length || 49})
              </button>
              <button
                onClick={() => setActiveSubTab("roster")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === "roster"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Master Group Driver Roster (RPT Driver_Last_Group)
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Menampilkan {activeSubTab === "evaluation" ? filteredEvaluations.length : filteredRoster.length} baris data
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari NIK, Nama Driver, atau Group..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 font-medium text-xs"
              />
            </div>

            {/* Group Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-300">Group :</span>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All</option>
                {uniqueGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-300">Entity :</span>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All</option>
                {uniqueEntities.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            {/* Garage Filter */}
            {activeSubTab === "evaluation" && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600 dark:text-slate-300">Garage :</span>
                <select
                  value={selectedGarage}
                  onChange={(e) => setSelectedGarage(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All</option>
                  {uniqueGarages.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Treatment Filter (only on evaluation subtab) */}
            {activeSubTab === "evaluation" && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600 dark:text-slate-300">Treatment :</span>
                <select
                  value={selectedTreatment}
                  onChange={(e) => setSelectedTreatment(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">Semua Treatment</option>
                  <option value="Good Performance">Good Performance</option>
                  <option value="Nudging and Reminding">Nudging and Reminding</option>
                  <option value="Coaching">Coaching</option>
                  <option value="Training">Training</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Table 2: Mirroring View */}
        {activeSubTab === "evaluation" ? (
          /* Driver Evaluations Table (Mirroring Parameter Sheet Columns ID, Driver, Group, Jml Shipment, Retention, Treatment) */
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0f4c81] text-white font-bold border-b border-sky-800 text-[11px]">
                    <th className="px-3 py-3">No</th>
                    <th className="px-3 py-3">ID (NIK)</th>
                    <th className="px-3 py-3 min-w-[180px]">Nama Driver</th>
                    <th className="px-3 py-3">Tanggal</th>
                    <th className="px-3 py-3">Garasi</th>
                    <th className="px-3 py-3">Entity</th>
                    <th className="px-3 py-3">Group</th>
                    <th className="px-3 py-3 text-center">Safety</th>
                    <th className="px-3 py-3 text-center">Attendance</th>
                    <th className="px-3 py-3 text-center">Tenko</th>
                    <th className="px-3 py-3 text-center">Mobo Act</th>
                    <th className="px-3 py-3 text-center">Ops Issue</th>
                    <th className="px-3 py-3 text-center">Problem Rec</th>
                    <th className="px-3 py-3 text-center bg-blue-700/60">Overall Score</th>
                    <th className="px-3 py-3 text-center">Status Performa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-xs">
                  {filteredEvaluations.length > 0 ? (
                    filteredEvaluations.map((d, idx) => (
                      <tr
                        key={`${d.id}-${idx}`}
                        onClick={() => setSelectedDriverModal(d)}
                        title="Klik untuk melihat detail lengkap pengemudi"
                        className="hover:bg-sky-50/70 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {d.id}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
                          {d.driverName}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {d.tanggal || "01/03/2026"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200 font-semibold">
                          {d.garage || "Garasi Cikarang"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300">
                            {d.entity || "PDT"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            {d.group}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-300">
                          {d.safety || "71,8%"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-300">
                          {d.attendance || "96,7%"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {d.tenko || "100,0%"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-300">
                          {d.moboAct || "84,8%"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {d.opsIssue || "100,0%"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {d.problemRec || "100,0%"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">
                          {d.overallScore || d.retention}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase inline-block ${
                              d.treatment === "Good Performance" || d.treatment === "Best"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : d.treatment === "Nudging and Reminding"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : d.treatment === "Coaching"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            }`}
                          >
                            {d.treatment}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 text-xs font-semibold">
                        Tidak ada driver yang cocok dengan pencarian / filter ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Master Group Driver Roster (Mirroring Tab Group Driver gid=1245558636) */
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold border-b border-slate-700">
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">ID (NIK)</th>
                    <th className="px-4 py-3">Nama Lengkap Driver</th>
                    <th className="px-4 py-3">Group Raw Kontrak</th>
                    <th className="px-4 py-3">Drop Group</th>
                    <th className="px-4 py-3">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                  {filteredRoster.length > 0 ? (
                    filteredRoster.slice(0, 200).map((d, idx) => (
                      <tr
                        key={`${d.id}-${idx}`}
                        className="hover:bg-sky-50/60 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {d.id}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-100">
                          {d.name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={d.rawGroup}>
                          {d.rawGroup}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300">
                            {d.group}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">
                          {d.entity}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 text-xs font-semibold">
                        Tidak ada driver yang cocok dengan pencarian / filter ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredRoster.length > 200 && (
              <div className="p-3 text-center text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                Menampilkan 200 dari {filteredRoster.length} pengemudi. Gunakan filter pencarian untuk mempersempit.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Driver Detail Modal Popup */}
      {selectedDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-900 to-sky-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Users className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Detail Kinerja Pengemudi • {selectedDriverModal.driverName}
                  </h3>
                  <p className="text-xs text-sky-200 font-medium">
                    NIK: {selectedDriverModal.id} • Garasi: {selectedDriverModal.garage} • Entity: {selectedDriverModal.entity}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDriverModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
              {/* Top Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800/60">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Overall Score</p>
                  <p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">
                    {selectedDriverModal.overallScore || selectedDriverModal.retention}
                  </p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Status Performa</p>
                  <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                    {selectedDriverModal.statusPerforma}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800/60">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Group Driver</p>
                  <p className="text-sm font-black text-purple-700 dark:text-purple-300 mt-1 truncate">
                    {selectedDriverModal.group}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Tanggal & Garasi</p>
                  <p className="text-xs font-black text-amber-700 dark:text-amber-300 mt-1 truncate">
                    {selectedDriverModal.tanggal} • {selectedDriverModal.garage}
                  </p>
                </div>
              </div>

              {/* Detailed KPI breakdown grid */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  Rincian Nilai KPI Pengemudi (Sheet Parameter)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 font-semibold text-[11px]">Safety Score</span>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{selectedDriverModal.safety}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 font-semibold text-[11px]">Attendance</span>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{selectedDriverModal.attendance}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 font-semibold text-[11px]">Tenko Verification</span>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedDriverModal.tenko}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 font-semibold text-[11px]">Mobo Activity</span>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{selectedDriverModal.moboAct}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 font-semibold text-[11px]">Ops Issue</span>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedDriverModal.opsIssue}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 font-semibold text-[11px]">Problem Recovery</span>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedDriverModal.problemRec}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedDriverModal(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
