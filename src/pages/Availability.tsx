import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Truck, Users, Clock, ShieldCheck, Search, MapPin, CheckCircle2, X, CalendarDays, Calendar, Filter, RefreshCw, Shield, Wrench, FileSpreadsheet, ExternalLink, Layers, LayoutGrid, ChevronDown } from "lucide-react";
import StatCard from "../components/StatCard";
import DataTable, { Column } from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import DateRangeFilter, { DateFilterState } from "../components/DateRangeFilter";
import { useFirebaseRealtime } from "../hooks/useFirebaseRealtime";
import { FleetUnit, UnitStatus } from "../types";
import { fetchAvailabilitySheetUnits, PA_IKPP_URL, CS_SOTO_MASTER_DICTIONARY } from "../lib/fetchPerformancePaIkpp";

export default function AvailabilityPage() {
  const {
    trucks,
    nextSchedule,
    scheduledNotice,
    updateTruckStatus
  } = useFirebaseRealtime();

  // Map Firestore live trucks to FleetUnits dynamically
  const fleetUnits = useMemo<FleetUnit[]>(() => {
    if (!trucks || trucks.length === 0) {
      return [];
    }

    return trucks.map((t) => {
      const uStatus = (t.status || "").toUpperCase();
      const drv = (t.nama_driver || "").toUpperCase();
      const isNoDriver = 
        uStatus.includes("NO DRIVER") || uStatus.includes("NO DRV") || uStatus.includes("TANPA DRIVER") || uStatus.includes("TDK DRIVER") ||
        drv.includes("NO DRIVER") || drv.includes("NO DRV") || drv === "TANPA DRIVER";

      let status: UnitStatus = "utilized";
      if (uStatus.includes("STORING") || uStatus.includes("LAKA") || uStatus.includes("DOWNTIME") || uStatus.includes("BENGKEL") || isNoDriver) {
        status = "downtime";
      } else if (uStatus === "TERSEDIA" || uStatus.includes("STANDBY") || uStatus.includes("READY")) {
        status = "standby";
      }

      const unitType = t.jenis_mobil || "Trailer 4x2 40ft";

      return {
        unitId: t.plat_nomor || t.id,
        unitType,
        status,
        downtimeCategory: isNoDriver ? "NO DRIVER (DOWNTIME)" : undefined,
        lastLocation: `${t.status} ${t.vendor ? `(${t.vendor})` : ""}`,
        lastUpdate: t.terakhirUpdate || new Date().toLocaleDateString("id-ID")
      };
    });
  }, [trucks]);

  // Live Google Sheets state for Availability Center
  const [csSotoUnitsS1, setCsSotoUnitsS1] = useState<FleetUnit[]>([]);
  const [csSotoUnitsS2, setCsSotoUnitsS2] = useState<FleetUnit[]>([]);
  const [sheetUnits, setSheetUnits] = useState<FleetUnit[]>([]);
  const [sheetDate, setSheetDate] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  const [dateFilterState, setDateFilterState] = useState<DateFilterState>({
    startDate: "",
    endDate: "",
    preset: "auto"
  });
  const [availableSheetDates, setAvailableSheetDates] = useState<string[]>([]);
  const [isSheetSyncing, setIsSheetSyncing] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [showLookupModal, setShowLookupModal] = useState<boolean>(false);
  const [lookupSearch, setLookupSearch] = useState<string>("");
  const [lookupFilterCategory, setLookupFilterCategory] = useState<string>("all");

  const loadSheetData = async (isManual = false, targetDate?: string) => {
    setIsSheetSyncing(true);
    const dateToFetch = targetDate !== undefined ? targetDate : selectedDateFilter;
    const res = await fetchAvailabilitySheetUnits(dateToFetch);
    if (res) {
      if (res.availableDates && res.availableDates.length > 0) {
        setAvailableSheetDates(res.availableDates);
      }
      if (res.shift1 && res.shift2) {
        setCsSotoUnitsS1(res.shift1.csSotoUnits);
        setCsSotoUnitsS2(res.shift2.csSotoUnits);
        setSheetUnits(res.shift1.allUnits);
      } else {
        setCsSotoUnitsS1(res.csSotoUnits);
        setCsSotoUnitsS2(res.csSotoUnits);
        setSheetUnits(res.allUnits);
      }
      setSheetDate(res.sheetDate);
      if (!selectedDateFilter && res.sheetDate) {
        setSelectedDateFilter(res.sheetDate);
      }
      const newTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSyncTime(`${newTime} WIB`);
      if (isManual) {
        setSyncToast(`Data Google Sheet berhasil diperbarui (Tanggal Sheet: ${res.sheetDate})!`);
        setTimeout(() => setSyncToast(null), 4000);
      }
    }
    setIsSheetSyncing(false);
  };

  // Auto sync with Google Spreadsheet every 3s
  useEffect(() => {
    let active = true;
    const initialLoad = async () => {
      const res = await fetchAvailabilitySheetUnits(selectedDateFilter);
      if (active && res) {
        if (res.availableDates && res.availableDates.length > 0) {
          setAvailableSheetDates(res.availableDates);
        }
        if (res.shift1 && res.shift2) {
          setCsSotoUnitsS1(res.shift1.csSotoUnits);
          setCsSotoUnitsS2(res.shift2.csSotoUnits);
          setSheetUnits(res.shift1.allUnits);
        } else {
          setCsSotoUnitsS1(res.csSotoUnits);
          setCsSotoUnitsS2(res.csSotoUnits);
          setSheetUnits(res.allUnits);
        }
        setSheetDate(res.sheetDate);
        if (!selectedDateFilter && res.sheetDate) {
          setSelectedDateFilter(res.sheetDate);
        }
        setLastSyncTime(`${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB`);
        setIsSheetSyncing(false);
      }
    };

    initialLoad();
    const interval = setInterval(initialLoad, 3000); // 3s ultra-responsive live polling
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedDateFilter]);

  // Combined LogPro fleet fallback
  const logProFleet = useMemo(() => (fleetUnits.length > 0 ? fleetUnits : sheetUnits), [fleetUnits, sheetUnits]);

  // Helper to compute stats for any unit list
  const calculatePanelStats = (units: FleetUnit[]) => {
    const total = units.length;
    const standby = units.filter((u) => u.status === "standby").length;
    const downtime = units.filter((u) => u.status === "downtime").length;
    const utilized = units.filter((u) => u.status === "utilized").length;
    const available = utilized + standby;
    return {
      total,
      available,
      utilized,
      standby,
      downtime,
      availablePct: total > 0 ? Math.round((available / total) * 100) : 0,
      utilizedPct: total > 0 ? Math.round((utilized / total) * 100) : 0,
      standbyPct: total > 0 ? Math.round((standby / total) * 100) : 0,
      downtimePct: total > 0 ? Math.round((downtime / total) * 100) : 0
    };
  };

  const calculatePanelDriverStats = (pStats: ReturnType<typeof calculatePanelStats>) => {
    const total = pStats.total;
    const onDuty = pStats.utilized;
    const offDuty = pStats.standby + pStats.downtime;
    return {
      total,
      onDuty,
      offDuty,
      onDutyPct: total > 0 ? Math.round((onDuty / total) * 100) : 0,
      offDutyPct: total > 0 ? Math.round((offDuty / total) * 100) : 0
    };
  };

  const calculatePanelTypeBreakdowns = (units: FleetUnit[]) => {
    const types = ["Trailer 4x2 40ft", "Trailer 4x2 20ft"];
    return types.map((type) => {
      const filtered = units.filter((u) => {
        if (type === "Trailer 4x2 40ft") {
          return u.unitType === "Trailer 4x2 40ft" || u.unitType.includes("40") || u.unitType.includes("HC");
        } else {
          return u.unitType === "Trailer 4x2 20ft" || u.unitType.includes("20");
        }
      });
      const total = filtered.length;
      const utilized = filtered.filter((u) => u.status === "utilized").length;
      const standby = filtered.filter((u) => u.status === "standby").length;
      const downtime = filtered.filter((u) => u.status === "downtime").length;
      const available = utilized + standby;
      return {
        type,
        total,
        available,
        utilized,
        standby,
        downtime,
        color: "bg-emerald-500",
        utilColor: "bg-blue-500",
        standbyColor: "bg-sky-500",
        downtimeColor: "bg-rose-500"
      };
    });
  };

  // Dynamic KPI Stats calculated from live logProFleet for LogPro (Panel 1)
  const stats1 = useMemo(() => calculatePanelStats(logProFleet), [logProFleet]);
  const driverStats1 = useMemo(() => calculatePanelDriverStats(stats1), [stats1]);
  const fleetTypeBreakdowns1 = useMemo(() => calculatePanelTypeBreakdowns(logProFleet), [logProFleet]);

  // Panel View Mode State ("both" | "logpro" | "cssoto")
  const [viewMode, setViewMode] = useState<"both" | "logpro" | "cssoto">("both");
  const [activeCsSotoShift, setActiveCsSotoShift] = useState<"both" | "shift1" | "shift2">("both");

  // CS SOTO Modal State for Adding / Editing Unit
  const [showAddCsSotoModal, setShowAddCsSotoModal] = useState(false);
  const [newCsSotoPlat, setNewCsSotoPlat] = useState("");
  const [newCsSotoType, setNewCsSotoType] = useState("Trailer 4x2 40ft");
  const [newCsSotoStatus, setNewCsSotoStatus] = useState<UnitStatus>("standby");
  const [newCsSotoLocation, setNewCsSotoLocation] = useState("-");

  const handleAddCsSotoUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCsSotoPlat.trim()) return;

    const newUnit: FleetUnit = {
      unitId: newCsSotoPlat.toUpperCase(),
      unitType: newCsSotoType,
      status: newCsSotoStatus,
      lastLocation: newCsSotoLocation || "-",
      lastUpdate: new Date().toLocaleDateString("id-ID")
    };

    setCsSotoUnitsS1((prev) => [newUnit, ...prev]);
    setCsSotoUnitsS2((prev) => [newUnit, ...prev]);
    setNewCsSotoPlat("");
    setNewCsSotoLocation("-");
    setShowAddCsSotoModal(false);
  };

  // CS SOTO Shift 1 is strictly bound to Google Spreadsheet (Columns H-N)
  const liveCsSotoUnitsS1 = useMemo<FleetUnit[]>(() => {
    return csSotoUnitsS1 || [];
  }, [csSotoUnitsS1]);

  // CS SOTO Shift 2 is strictly bound to Google Spreadsheet (Columns Q-W)
  const liveCsSotoUnitsS2 = useMemo<FleetUnit[]>(() => {
    return csSotoUnitsS2 || [];
  }, [csSotoUnitsS2]);

  // Dynamic KPI Stats calculated for CS SOTO Shift 1 & Shift 2
  const stats2_S1 = useMemo(() => calculatePanelStats(liveCsSotoUnitsS1), [liveCsSotoUnitsS1]);
  const driverStats2_S1 = useMemo(() => calculatePanelDriverStats(stats2_S1), [stats2_S1]);
  const fleetTypeBreakdowns2_S1 = useMemo(() => calculatePanelTypeBreakdowns(liveCsSotoUnitsS1), [liveCsSotoUnitsS1]);

  const stats2_S2 = useMemo(() => calculatePanelStats(liveCsSotoUnitsS2), [liveCsSotoUnitsS2]);
  const driverStats2_S2 = useMemo(() => calculatePanelDriverStats(stats2_S2), [stats2_S2]);
  const fleetTypeBreakdowns2_S2 = useMemo(() => calculatePanelTypeBreakdowns(liveCsSotoUnitsS2), [liveCsSotoUnitsS2]);

  // Local filter states for Panel 1 (LogPro) and Panel 2 (CS SOTO Shift 1 & Shift 2)
  const [searchQuery1, setSearchQuery1] = useState("");
  const [statusFilter1, setStatusFilter1] = useState<string>("all");
  const [typeFilter1, setTypeFilter1] = useState<string>("all");

  const [searchQuery2_S1, setSearchQuery2_S1] = useState("");
  const [statusFilter2_S1, setStatusFilter2_S1] = useState<string>("all");
  const [typeFilter2_S1, setTypeFilter2_S1] = useState<string>("all");

  const [searchQuery2_S2, setSearchQuery2_S2] = useState("");
  const [statusFilter2_S2, setStatusFilter2_S2] = useState<string>("all");
  const [typeFilter2_S2, setTypeFilter2_S2] = useState<string>("all");

  const filteredFleet1 = useMemo(() => {
    return logProFleet.filter((unit) => {
      const matchesSearch =
        unit.unitId.toLowerCase().includes(searchQuery1.toLowerCase()) ||
        unit.lastLocation.toLowerCase().includes(searchQuery1.toLowerCase()) ||
        unit.unitType.toLowerCase().includes(searchQuery1.toLowerCase());

      const matchesStatus =
        statusFilter1 === "all" ||
        (statusFilter1 === "available"
          ? (unit.status === "standby" || unit.status === "utilized")
          : unit.status === statusFilter1);

      const matchesType = typeFilter1 === "all" || unit.unitType === typeFilter1;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [logProFleet, searchQuery1, statusFilter1, typeFilter1]);

  const filteredFleet2_S1 = useMemo(() => {
    return liveCsSotoUnitsS1.filter((unit) => {
      const matchesSearch =
        unit.unitId.toLowerCase().includes(searchQuery2_S1.toLowerCase()) ||
        unit.lastLocation.toLowerCase().includes(searchQuery2_S1.toLowerCase()) ||
        unit.unitType.toLowerCase().includes(searchQuery2_S1.toLowerCase());

      const matchesStatus =
        statusFilter2_S1 === "all" ||
        (statusFilter2_S1 === "available"
          ? (unit.status === "standby" || unit.status === "utilized")
          : unit.status === statusFilter2_S1);

      const matchesType = typeFilter2_S1 === "all" || unit.unitType === typeFilter2_S1;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [liveCsSotoUnitsS1, searchQuery2_S1, statusFilter2_S1, typeFilter2_S1]);

  const filteredFleet2_S2 = useMemo(() => {
    return liveCsSotoUnitsS2.filter((unit) => {
      const matchesSearch =
        unit.unitId.toLowerCase().includes(searchQuery2_S2.toLowerCase()) ||
        unit.lastLocation.toLowerCase().includes(searchQuery2_S2.toLowerCase()) ||
        unit.unitType.toLowerCase().includes(searchQuery2_S2.toLowerCase());

      const matchesStatus =
        statusFilter2_S2 === "all" ||
        (statusFilter2_S2 === "available"
          ? (unit.status === "standby" || unit.status === "utilized")
          : unit.status === statusFilter2_S2);

      const matchesType = typeFilter2_S2 === "all" || unit.unitType === typeFilter2_S2;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [liveCsSotoUnitsS2, searchQuery2_S2, statusFilter2_S2, typeFilter2_S2]);

  // Columns for Fleet Unit List (Unit ID replaced with Plat Nomor)
  const columns: Column<FleetUnit>[] = [
    {
      key: "unitId",
      header: "Plat Nomor",
      sortable: true,
      render: (item) => <span className="font-mono font-black text-xs sm:text-sm text-gray-950 bg-slate-100 border border-slate-200/80 rounded px-2.5 py-1">{item.unitId}</span>
    },
    {
      key: "unitType",
      header: "Trailer Type",
      sortable: true,
      render: (item) => <span className="text-xs sm:text-sm bg-slate-50 text-slate-700 px-2.5 py-1 rounded font-bold border border-slate-100">{item.unitType}</span>
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: "lastLocation",
      header: "Lokasi Terakhir",
      sortable: true,
      render: (item) => {
        const cleanLoc = (item.lastLocation || "").replace(/^INDAH\s*KIAT(?:\s*PULP\s*&\s*PAPER\s*TBK\.?)?\s*[-–—:]*\s*/gi, "").trim();
        return (
          <span className="text-xs sm:text-sm text-gray-800 flex items-center gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" /> {cleanLoc || item.lastLocation}
          </span>
        );
      }
    },
    {
      key: "lastUpdate",
      header: "Update Terakhir",
      sortable: true,
      render: (item) => <span className="text-xs sm:text-sm font-mono text-gray-600 font-bold">{item.lastUpdate}</span>
    }
  ];

  // Render Single Panel View helper
  const renderPanelContent = (
    panelTitle: string,
    panelSubtitle: string,
    badgeText: string,
    badgeColor: string,
    panelStats: ReturnType<typeof calculatePanelStats>,
    panelDriverStats: ReturnType<typeof calculatePanelDriverStats>,
    panelBreakdowns: ReturnType<typeof calculatePanelTypeBreakdowns>,
    searchQuery: string,
    setSearchQuery: (val: string) => void,
    statusFilter: string,
    setStatusFilter: (val: string) => void,
    typeFilter: string,
    setTypeFilter: (val: string) => void,
    filteredData: FleetUnit[],
    isCsSotoPanel: boolean = false
  ) => {
    const columnsToUse = getPanelColumns(isCsSotoPanel);

    return (
      <div className="space-y-6 bg-slate-100/60 dark:bg-slate-950/60 p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Schedule Auto Refresh Indicator Bar */}
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-3.5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30">
              <Clock className="w-4 h-4 animate-pulse text-blue-400" />
            </div>
            <div>
              <div className="font-black flex items-center gap-2 flex-wrap">
                <span>Jadwal Refresh Otomatis Rutin Data Logistik Pro IKK</span>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30 font-bold">
                  6x Sehari
                </span>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                <CalendarDays className="w-3 h-3 text-indigo-300" />
                <span>Jam: <b>09:00</b> • <b>13:00</b> • <b>15:00</b> • <b>17:00</b> • <b>19:00</b> • <b>23:00</b> WIB</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
            <div className="text-right">
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">Refresh Berikutnya</div>
              <div className="font-black text-amber-300 text-xs flex items-center gap-1">
                <span>{nextSchedule.label}</span>
                <span className="text-[10px] font-medium text-slate-300">({nextSchedule.countdownText})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auto Refresh Event Toast Notice */}
        {scheduledNotice && (
          <div className="bg-emerald-600 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-md animate-bounce">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{scheduledNotice}</span>
            </div>
          </div>
        )}

        {/* Header Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-black text-white px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs ${badgeColor}`}>
                {badgeText}
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-slate-100 tracking-tight flex items-center gap-2 w-full mt-1">
                <Truck className="w-5 h-5 text-[#0B2C6B] dark:text-sky-400 shrink-0" />
                {panelTitle}
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold mt-1">
              {panelSubtitle}
            </p>
          </div>

          {/* Header Right Indicator & Quick Shift Filter */}
          {isCsSotoPanel && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Select Tanggal Sheet */}
              <div className="relative flex items-center">
                <select
                  value={selectedDateFilter || sheetDate}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    setSelectedDateFilter(selectedVal);
                    loadSheetData(true, selectedVal);
                  }}
                  className="appearance-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-extrabold text-xs pl-3 pr-8 py-2 rounded-xl border border-gray-300 dark:border-slate-700 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
                  title={`Pilih Tanggal Spreadsheet (${availableSheetDates.length} tanggal tersedia)`}
                >
                  {availableSheetDates.length > 0 ? (
                    availableSheetDates.map((d) => (
                      <option key={d} value={d}>
                        📅 {d} {d === availableSheetDates[0] ? "(Terbaru)" : ""}
                      </option>
                    ))
                  ) : (
                    <option value={sheetDate || ""}>
                      📅 {sheetDate || "Memuat Tanggal..."}
                    </option>
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
              </div>

              <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveCsSotoShift(activeCsSotoShift === "shift1" ? "both" : "shift1")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeCsSotoShift === "shift1" || activeCsSotoShift === "both"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                  title="Shift 1 (Jam 10:00 WIB • Locked Columns H-N)"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Shift 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCsSotoShift(activeCsSotoShift === "shift2" ? "both" : "shift2")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeCsSotoShift === "shift2" || activeCsSotoShift === "both"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                  title="Shift 2 (Jam 17:00 WIB • Locked Columns Q-W)"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Shift 2</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span>Realtime Live Sync Sheet</span>
                <span className="text-emerald-600 font-medium">({lastSyncTime || "Live"})</span>
              </div>
            </div>
          )}
        </div>

        {/* 5 Kolom KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <div onClick={() => setStatusFilter("all")} className="cursor-pointer transition-transform hover:scale-[1.01]">
            <StatCard
              title="Total Fleet"
              value={String(panelStats.total)}
              icon={Truck}
              statusType="neutral"
              description="Registered Units"
            />
          </div>
          <div onClick={() => setStatusFilter("available")} className="cursor-pointer transition-transform hover:scale-[1.01]">
            <StatCard
              title="Available"
              value={String(panelStats.available)}
              statusType="success"
              description={`Util + Stdb (${panelStats.availablePct}%)`}
            />
          </div>
          <div onClick={() => setStatusFilter("utilized")} className="cursor-pointer transition-transform hover:scale-[1.01]">
            <StatCard
              title="Utilized"
              value={String(panelStats.utilized)}
              statusType="info"
              description={`Active On Trip (${panelStats.utilizedPct}%)`}
            />
          </div>
          <div onClick={() => setStatusFilter("standby")} className="cursor-pointer transition-transform hover:scale-[1.01]">
            <StatCard
              title="Standby"
              value={String(panelStats.standby)}
              statusType="warning"
              description={`Staging / Ready (${panelStats.standbyPct}%)`}
            />
          </div>
          <div onClick={() => setStatusFilter("downtime")} className="cursor-pointer transition-transform hover:scale-[1.01]">
            <StatCard
              title="Downtime"
              value={String(panelStats.downtime)}
              statusType="danger"
              description={`Outages & Service (${panelStats.downtimePct}%)`}
            />
          </div>
        </div>

        {/* Breakdown per Tipe Unit & Driver Status Split layout */}
        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
          {/* Unit Type Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm 2xl:col-span-2 flex flex-col justify-between transition-colors duration-200">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-slate-100 pb-2.5 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-[#0B2C6B] dark:text-sky-400" />
                Breakdown per Unit Type
              </h3>
              
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left border-collapse text-xs sm:text-sm font-bold">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-extrabold uppercase tracking-wider text-[11px]">
                      <th className="pb-2.5 text-left">UNIT TYPE</th>
                      <th className="pb-2.5 text-center">Total</th>
                      <th className="pb-2.5 text-center">Available</th>
                      <th className="pb-2.5 text-center">Utilized</th>
                      <th className="pb-2.5 text-center">Standby</th>
                      <th className="pb-2.5 text-center">Downtime</th>
                      <th className="pb-2.5 text-center w-24">Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-900 dark:text-slate-100 font-semibold">
                    {panelBreakdowns.map((item, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setTypeFilter(item.type)}
                        className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                          typeFilter === item.type ? "bg-blue-50/80 dark:bg-slate-800 font-black" : ""
                        }`}
                      >
                        <td className="py-2.5 font-extrabold text-gray-950 dark:text-slate-100 text-xs sm:text-sm">{item.type}</td>
                        <td className="py-2.5 text-center font-black tabular-nums text-gray-950 dark:text-slate-100">{item.total}</td>
                        <td className="py-2.5 text-center font-black text-emerald-800 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/40 font-mono">{item.available}</td>
                        <td className="py-2.5 text-center font-black text-blue-800 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/40 font-mono">{item.utilized}</td>
                        <td className="py-2.5 text-center font-black text-sky-800 dark:text-sky-400 bg-sky-50/30 dark:bg-sky-950/40 font-mono">{item.standby}</td>
                        <td className="py-2.5 text-center font-black text-rose-800 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/40 font-mono">{item.downtime}</td>
                        <td className="py-2.5">
                          <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full flex overflow-hidden border border-gray-200 dark:border-slate-700 shadow-inner">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.utilized / (item.total || 1)) * 100}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 }}
                              className={`${item.utilColor} h-full`}
                            />
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.standby / (item.total || 1)) * 100}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 + 0.05 }}
                              className={`${item.standbyColor} h-full`}
                            />
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.downtime / (item.total || 1)) * 100}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 + 0.1 }}
                              className={`${item.downtimeColor} h-full`}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[9px] sm:text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500 inline-block"></span> Utilized (On Trip)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-sky-500 inline-block"></span> Standby (Ready)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500 inline-block"></span> Downtime (Outages)</span>
            </div>
          </div>

          {/* Driver Availability */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col justify-between transition-colors duration-200">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-slate-100 pb-2.5 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#0B2C6B] dark:text-sky-400" />
                Driver Availability
              </h3>

              <div className="mt-3 text-center bg-gray-50 dark:bg-slate-800/80 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Total Registered Drivers</span>
                <span className="text-2xl sm:text-3xl font-black block text-gray-800 dark:text-slate-100 tracking-tight mt-0.5 tabular-nums">
                  {panelDriverStats.total}
                </span>
              </div>

              <div className="space-y-3 mt-3">
                <div>
                  <div className="flex justify-between items-center text-[11px] font-bold mb-1">
                    <span className="text-blue-700 dark:text-blue-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> On Duty ({panelDriverStats.onDutyPct}%)
                    </span>
                    <span className="font-mono">{panelDriverStats.onDuty} Drivers</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 border border-gray-200 shadow-inner rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${panelDriverStats.onDutyPct}%` }} transition={{ duration: 1 }} className="h-full bg-blue-500" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[11px] font-bold mb-1">
                    <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Off Duty ({panelDriverStats.offDutyPct}%)
                    </span>
                    <span className="font-mono">{panelDriverStats.offDuty} Drivers</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 border border-gray-200 shadow-inner rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${panelDriverStats.offDutyPct}%` }} transition={{ duration: 1 }} className="h-full bg-rose-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-4 border-t border-gray-100 dark:border-slate-800 flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>SLA Compliance: 98.7%</span>
            </div>
          </div>
        </div>

        {/* Monitoring List Unit */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-slate-100">Monitoring List Unit</h3>
              <p className="text-[11px] text-gray-400 font-semibold">Real-time status tracking updated based on scheduled auto refresh times</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Plat Nomor..."
                  className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs font-medium rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0B2C6B] text-gray-700 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-2 py-1.5">
                <Filter className="w-3 h-3 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-[10px] font-bold text-gray-600 dark:text-slate-300 bg-transparent border-none focus:outline-none cursor-pointer"
                >
                  <option value="all">Status: All</option>
                  <option value="available">Available</option>
                  <option value="utilized">Utilized</option>
                  <option value="standby">Standby</option>
                  <option value="downtime">Downtime</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-2 py-1.5">
                <Filter className="w-3 h-3 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="text-[10px] font-bold text-gray-600 dark:text-slate-300 bg-transparent border-none focus:outline-none cursor-pointer"
                >
                  <option value="all">Type: All</option>
                  <option value="Trailer 4x2 40ft">Trailer 40ft</option>
                  <option value="Trailer 4x2 20ft">Trailer 20ft</option>
                </select>
              </div>

              {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          <DataTable
            columns={columnsToUse}
            data={filteredData}
            itemsPerPage={8}
          />
        </div>
      </div>
    );
  };

  const getPanelColumns = (isCsSoto: boolean): Column<FleetUnit>[] => {
    const baseCols: Column<FleetUnit>[] = [
      {
        key: "unitId",
        header: "Plat Nomor",
        sortable: true,
        render: (item) => <span className="font-mono font-black text-xs sm:text-sm text-gray-950 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded px-2.5 py-1">{item.unitId}</span>
      },
      {
        key: "unitType",
        header: "Trailer Type",
        sortable: true,
        render: (item) => <span className="text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded font-bold border border-slate-100 dark:border-slate-700">{item.unitType}</span>
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (item) => <StatusBadge status={item.status} />
      },
      {
        key: "problemCode",
        header: "Kode Problem",
        sortable: true,
        render: (item) => {
          const code = item.problemCode?.trim();
          if (!code) {
            return <span className="text-gray-400 font-medium text-xs sm:text-sm">-</span>;
          }
          return (
            <div className="flex flex-col gap-0.5 max-w-[220px]">
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-[#0B2C6B] text-amber-300 dark:bg-slate-800 dark:text-amber-300 border border-blue-900/60 dark:border-slate-700 shadow-2xs tracking-wide inline-block w-fit">
                {code}
              </span>
              {item.keterangan && (
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate" title={item.keterangan}>
                  {item.keterangan}
                </span>
              )}
            </div>
          );
        }
      },
      {
        key: "lastLocation",
        header: "Lokasi Terakhir",
        sortable: true,
        render: (item) => {
          const rawLoc = (item.lastLocation || "").trim();

          if (!rawLoc || rawLoc === "-") {
            return <span className="text-gray-400 font-medium text-xs sm:text-sm">-</span>;
          }

          return (
            <span className="text-xs sm:text-sm text-gray-800 dark:text-slate-200 flex items-center gap-1.5 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{rawLoc}</span>
            </span>
          );
        }
      },
      {
        key: "lastUpdate",
        header: "Update Terakhir",
        sortable: true,
        render: (item) => <span className="text-xs sm:text-sm font-mono text-gray-600 dark:text-slate-400 font-bold">{item.lastUpdate}</span>
      }
    ];

    return baseCols;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full overflow-hidden space-y-4"
    >
      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="shrink-0 bg-emerald-600 text-white p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-200 shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View Mode Selector Tabs - Firmly locked at top, never shifts or overlaps */}
      <div className="shrink-0 flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm flex-wrap gap-2.5">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("both")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === "both"
                ? "bg-white dark:bg-slate-700 text-[#0B2C6B] dark:text-sky-300 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Semua (Side-by-Side)</span>
          </button>
          <button
            onClick={() => setViewMode("logpro")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === "logpro"
                ? "bg-[#0B2C6B] text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Tampilan LogPro</span>
          </button>
          <button
            onClick={() => setViewMode("cssoto")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === "cssoto"
                ? "bg-indigo-700 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Tampilan CS SOTO</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="hidden md:block text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
            {viewMode === "both" && "Menampilkan perbandingan kedua armada secara berdampingan"}
            {viewMode === "logpro" && "Menampilkan khusus data Armada LogPro (Full Width)"}
            {viewMode === "cssoto" && "Menampilkan khusus data Armada CS SOTO (Full Width)"}
          </div>
          <button
            onClick={() => setShowLookupModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#0B2C6B] dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Lihat kamus master lookup kode dan status CS SOTO"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Master Lookup CS SOTO</span>
          </button>
        </div>
      </div>

      {/* Dedicated Scrollable Container for Availability Stats & Tables */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-6">

      {/* Main Content Area - Rendered based on viewMode */}
      {viewMode === "both" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {/* Panel 1 - Kiri (LogPro) */}
          {renderPanelContent(
            "Fleet Resources & Availability Center Baseon LogPro",
            "Monitoring Utama Armada LogPro",
            "PANEL LOGPRO",
            "bg-[#0B2C6B]",
            stats1,
            driverStats1,
            fleetTypeBreakdowns1,
            searchQuery1,
            setSearchQuery1,
            statusFilter1,
            setStatusFilter1,
            typeFilter1,
            setTypeFilter1,
            filteredFleet1,
            false
          )}

          {/* Panel 2 - Kanan (CS SOTO - Shift 1 & Shift 2 Stacked or Filtered) */}
          <div className="space-y-6">
            {/* CS SOTO SHIFT 1 */}
            {(activeCsSotoShift === "both" || activeCsSotoShift === "shift1") && (
              renderPanelContent(
                "Fleet Resources & Availability Baseon CS SOTO (Shift 1)",
                "Monitoring CS SOTO - Shift 1 (Jam 10:00 WIB • Locked Columns H-N)",
                "CS SOTO • SHIFT 1 (H-N LOCKED)",
                "bg-emerald-700",
                stats2_S1,
                driverStats2_S1,
                fleetTypeBreakdowns2_S1,
                searchQuery2_S1,
                setSearchQuery2_S1,
                statusFilter2_S1,
                setStatusFilter2_S1,
                typeFilter2_S1,
                setTypeFilter2_S1,
                filteredFleet2_S1,
                true
              )
            )}

            {/* CS SOTO SHIFT 2 */}
            {(activeCsSotoShift === "both" || activeCsSotoShift === "shift2") && (
              renderPanelContent(
                "Fleet Resources & Availability Baseon CS SOTO (Shift 2)",
                "Monitoring CS SOTO - Shift 2 (Jam 17:00 WIB • Locked Columns Q-W)",
                "CS SOTO • SHIFT 2 (Q-W LOCKED)",
                "bg-blue-700",
                stats2_S2,
                driverStats2_S2,
                fleetTypeBreakdowns2_S2,
                searchQuery2_S2,
                setSearchQuery2_S2,
                statusFilter2_S2,
                setStatusFilter2_S2,
                typeFilter2_S2,
                setTypeFilter2_S2,
                filteredFleet2_S2,
                true
              )
            )}
          </div>
        </div>
      )}

      {viewMode === "logpro" && (
        <div className="w-full">
          {renderPanelContent(
            "Fleet Resources & Availability Center Baseon LogPro",
            "Monitoring Utama Armada LogPro",
            "PANEL LOGPRO",
            "bg-[#0B2C6B]",
            stats1,
            driverStats1,
            fleetTypeBreakdowns1,
            searchQuery1,
            setSearchQuery1,
            statusFilter1,
            setStatusFilter1,
            typeFilter1,
            setTypeFilter1,
            filteredFleet1,
            false
          )}
        </div>
      )}

      {viewMode === "cssoto" && (
        <div className="w-full space-y-6">
          {/* CS SOTO SHIFT 1 */}
          {(activeCsSotoShift === "both" || activeCsSotoShift === "shift1") && (
            renderPanelContent(
              "Fleet Resources & Availability Baseon CS SOTO (Shift 1)",
              "Monitoring CS SOTO - Shift 1 (Jam 10:00 WIB • Locked Columns H-N)",
              "CS SOTO • SHIFT 1 (H-N LOCKED)",
              "bg-emerald-700",
              stats2_S1,
              driverStats2_S1,
              fleetTypeBreakdowns2_S1,
              searchQuery2_S1,
              setSearchQuery2_S1,
              statusFilter2_S1,
              setStatusFilter2_S1,
              typeFilter2_S1,
              setTypeFilter2_S1,
              filteredFleet2_S1,
              true
            )
          )}

          {/* CS SOTO SHIFT 2 */}
          {(activeCsSotoShift === "both" || activeCsSotoShift === "shift2") && (
            renderPanelContent(
              "Fleet Resources & Availability Baseon CS SOTO (Shift 2)",
              "Monitoring CS SOTO - Shift 2 (Jam 17:00 WIB • Locked Columns Q-W)",
              "CS SOTO • SHIFT 2 (Q-W LOCKED)",
              "bg-blue-700",
              stats2_S2,
              driverStats2_S2,
              fleetTypeBreakdowns2_S2,
              searchQuery2_S2,
              setSearchQuery2_S2,
              statusFilter2_S2,
              setStatusFilter2_S2,
              typeFilter2_S2,
              setTypeFilter2_S2,
              filteredFleet2_S2,
              true
            )
          )}
        </div>
      )}

      {/* Modal Add CS SOTO Unit */}
      {showAddCsSotoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                Tambah Unit Armada CS SOTO
              </h3>
              <button
                onClick={() => setShowAddCsSotoModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCsSotoUnitSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Plat Nomor (Nomor Polisi)
                </label>
                <input
                  type="text"
                  required
                  value={newCsSotoPlat}
                  onChange={(e) => setNewCsSotoPlat(e.target.value)}
                  placeholder="Contoh: B 9999 SOT"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis / Type Trailer
                </label>
                <select
                  value={newCsSotoType}
                  onChange={(e) => setNewCsSotoType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold focus:outline-none"
                >
                  <option value="Trailer 4x2 40ft">Trailer 4x2 40ft</option>
                  <option value="Trailer 4x2 20ft">Trailer 4x2 20ft</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Kesiapan
                </label>
                <select
                  value={newCsSotoStatus}
                  onChange={(e) => setNewCsSotoStatus(e.target.value as UnitStatus)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold focus:outline-none"
                >
                  <option value="standby">Standby (Ready / Staging)</option>
                  <option value="utilized">Utilized (Active On Trip)</option>
                  <option value="downtime">Downtime (Service / Outages)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lokasi Terakhir
                </label>
                <input
                  type="text"
                  value={newCsSotoLocation}
                  onChange={(e) => setNewCsSotoLocation(e.target.value)}
                  placeholder="Contoh: Depo Cikarang (atau biarkan - jika kosong)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCsSotoModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-xs hover:bg-indigo-700"
                >
                  Simpan Unit CS SOTO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CS SOTO Master Lookup Dictionary Modal */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-gray-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-[#0B2C6B] dark:text-blue-300 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-slate-100">
                    Master Lookup CS SOTO (Source of Truth)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Daftar resmi 47 kode problem, kategori, dan pemetaan status kesiapan armada
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLookupModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                  placeholder="Cari kode (contoh: OPR, DRV, WSP, STB) atau keterangan..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0B2C6B]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={lookupFilterCategory}
                  onChange={(e) => setLookupFilterCategory(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">Semua Kategori ({Object.keys(CS_SOTO_MASTER_DICTIONARY).length})</option>
                  <option value="UTILISASI">UTILISASI (Operasi/Pinjam/Replace)</option>
                  <option value="DT DRIVER">DT DRIVER (Driver Issue)</option>
                  <option value="DT LICENSE">DT LICENSE (Keur/STNK/IBM/TID)</option>
                  <option value="PERSIAPAN UNIT BARU">PERSIAPAN UNIT BARU</option>
                  <option value="STANDBY">STANDBY (No Order/Libur/Kontrak)</option>
                  <option value="DT WSP">DT WSP (Workshop/Repair/Storing)</option>
                  <option value="WAITING SPAREPART">WAITING SPAREPART</option>
                  <option value="DT ASURANSI">DT ASURANSI (Claim/TLO)</option>
                </select>
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-3.5">Kode</th>
                      <th className="py-3 px-3.5">Keterangan</th>
                      <th className="py-3 px-3.5">Kategori 1</th>
                      <th className="py-3 px-3.5">Kategori 2</th>
                      <th className="py-3 px-3.5">Kategori 3</th>
                      <th className="py-3 px-3.5 text-center">Status Output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {Object.values(CS_SOTO_MASTER_DICTIONARY)
                      .filter((item) => {
                        const searchLower = lookupSearch.toLowerCase();
                        const matchesSearch =
                          !searchLower ||
                          item.code.toLowerCase().includes(searchLower) ||
                          item.keterangan.toLowerCase().includes(searchLower) ||
                          item.kategori1.toLowerCase().includes(searchLower) ||
                          item.kategori2.toLowerCase().includes(searchLower);

                        const matchesCategory =
                          lookupFilterCategory === "all" ||
                          item.kategori2.toUpperCase().includes(lookupFilterCategory.toUpperCase()) ||
                          item.kategori1.toUpperCase().includes(lookupFilterCategory.toUpperCase());

                        return matchesSearch && matchesCategory;
                      })
                      .map((item) => (
                        <tr key={item.code} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono font-black text-blue-900 dark:text-blue-300">
                            <span className="px-2 py-1 rounded bg-[#0B2C6B] text-amber-300 dark:bg-slate-800 text-[11px]">
                              {item.code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-gray-900 dark:text-slate-100">
                            {item.keterangan}
                          </td>
                          <td className="py-2.5 px-3.5 text-gray-600 dark:text-slate-300 font-medium">
                            {item.kategori1}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-slate-700 dark:text-slate-300">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px]">
                              {item.kategori2}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-500 dark:text-slate-400 text-[11px]">
                            {item.kategori3}
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <StatusBadge status={item.status} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-xs text-gray-500">
              <span>Total 47 kode terdaftar dalam Master Dictionary CS SOTO</span>
              <button
                onClick={() => setShowLookupModal(false)}
                className="px-4 py-2 bg-[#0B2C6B] hover:bg-blue-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </motion.div>
  );
}

