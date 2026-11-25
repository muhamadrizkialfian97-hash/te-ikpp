import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Truck, ClipboardList, ShieldCheck, BarChart3, FileSpreadsheet, Search, X, ExternalLink, Filter, Eye, CircleDot, Calendar, XCircle, AlertCircle } from "lucide-react";
import TripStepper from "../components/TripStepper";
import StackedBarChart from "../components/StackedBarChart";
import BarChart from "../components/BarChart";
import ServiceStreamCard from "../components/ServiceStreamCard";
import DateRangeFilter, { DateFilterState, filterByDate, parseBookingDate, formatDateIndo } from "../components/DateRangeFilter";
import { useFirebaseRealtime } from "../hooks/useFirebaseRealtime";
import { TabType } from "../components/Sidebar";
import { Order, UserAccount } from "../types";
import { fetchLiveOrdersClient, fetchExecutedShipmentsClient } from "../lib/fetchOrdersClient";
import { fetchPerformancePaIkppData, PaIkppMetrics, PA_IKPP_URL } from "../lib/fetchPerformancePaIkpp";
import { mapCSStatus } from "../lib/statusMapper";
import DetailListModal, { isRepoPdtItem } from "../components/DetailListModal";
import { deriveFreightTypes } from "../lib/freightTypeLookup";
import { useRouteFreightMappings } from "../hooks/useRouteFreightMappings";

const isRepoPdtOrder = (o: Order) => isRepoPdtItem(o);

interface OverviewProps {
  onNavigate: (tab: TabType, filterType?: string) => void;
  currentUser?: UserAccount | null;
}

export default function Overview({ onNavigate, currentUser }: OverviewProps) {
  const isSuperAdmin = currentUser?.role === "Super Admin" || currentUser?.email?.toLowerCase() === "digital.solution@pancaran-logistic.id";
  const { resolveFreightType2 } = useRouteFreightMappings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [executedShipments, setExecutedShipments] = useState<Order[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    startDate: "",
    endDate: "",
    preset: "auto"
  });
  const [fleetDateFilter, setFleetDateFilter] = useState<DateFilterState>({
    startDate: "",
    endDate: "",
    preset: "auto"
  });
  const [dateType, setDateType] = useState<"booking" | "stuffing">("stuffing");
  const { trucks } = useFirebaseRealtime();

  // Live Google Sheets state & dedicated Date Filter for Performance PA IKPP
  const [paIkppSelectedDate, setPaIkppSelectedDate] = useState<string>("");
  const [paIkppData, setPaIkppData] = useState<PaIkppMetrics | null>(null);
  const [paIkppLoading, setPaIkppLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const loadPaIkpp = async () => {
      const dateToFetch = paIkppSelectedDate || fleetDateFilter;
      const data = await fetchPerformancePaIkppData(dateToFetch);
      if (active && data) {
        setPaIkppData(data);
        setPaIkppLoading(false);
      }
    };

    loadPaIkpp();
    const interval = setInterval(loadPaIkpp, 3000); // Live real-time sync every 3s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [paIkppSelectedDate, fleetDateFilter.startDate, fleetDateFilter.endDate, fleetDateFilter.preset]);

  // Modal state for viewing detail list when KPI numbers are clicked
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    data: any[];
    dataType: "order" | "shipment";
  }>({
    isOpen: false,
    title: "",
    data: [],
    dataType: "order",
  });

  // Filter orders and shipments dynamically by selected date range
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const targetStr = dateType === "stuffing" ? o.requestStuffing : o.bookingDate;
      return filterByDate(targetStr, dateFilter);
    });
  }, [orders, dateFilter, dateType]);

  const filteredExecutedShipments = useMemo(() => {
    return executedShipments.filter((o) => {
      const targetStr = dateType === "stuffing" ? o.requestStuffing : o.bookingDate;
      return filterByDate(targetStr, dateFilter);
    });
  }, [executedShipments, dateFilter, dateType]);

  // Real-time live auto-connection to Google Sheets with Vercel client fallback support
  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      try {
        const [liveOrders, liveExecuted] = await Promise.all([
          fetchLiveOrdersClient(),
          fetchExecutedShipmentsClient()
        ]);
        if (isMounted) {
          if (Array.isArray(liveOrders) && liveOrders.length > 0) {
            setOrders(liveOrders);
          }
          if (Array.isArray(liveExecuted) && liveExecuted.length > 0) {
            setExecutedShipments(liveExecuted);
          }
        }
      } catch (err) {
        // Silent catch during background syncs
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Live real-time sync every 10s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fleet stats derived directly from Firestore live data (mirroring Availability page)
  const fleetStats = useMemo(() => {
    if (!trucks || trucks.length === 0) {
      const total = 54;
      const standby = 36;
      const downtime = 2;
      const utilized = 16;
      const available = utilized + standby; // 52
      return {
        total,
        available,
        utilized,
        standby,
        downtime,
        availablePct: Math.round((available / total) * 100),
        utilizedPct: Math.round((utilized / total) * 100),
        standbyPct: Math.round((standby / total) * 100),
        downtimePct: Math.round((downtime / total) * 100)
      };
    }

    const total = trucks.length;
    let standby = 0;
    let downtime = 0;
    let utilized = 0;

    trucks.forEach((t) => {
      const uStatus = (t.status || "").toUpperCase();
      const drv = (t.nama_driver || "").toUpperCase();
      const isNoDriver = 
        uStatus.includes("NO DRIVER") || uStatus.includes("NO DRV") || uStatus.includes("TANPA DRIVER") || uStatus.includes("TDK DRIVER") ||
        drv.includes("NO DRIVER") || drv.includes("NO DRV") || drv === "TANPA DRIVER";

      if (uStatus.includes("STORING") || uStatus.includes("LAKA") || uStatus.includes("DOWNTIME") || uStatus.includes("BENGKEL") || isNoDriver) {
        downtime++;
      } else if (uStatus === "TERSEDIA" || uStatus.includes("STANDBY") || uStatus.includes("READY")) {
        standby++;
      } else {
        utilized++;
      }
    });

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
  }, [trucks]);

  const getCat = (o: Order) => {
    return resolveFreightType2(o.commercialRoute, o.origin, o.destination, o.notes);
  };

  // Compute live Order Metrics from spreadsheet
  const orderStats = useMemo(() => {
    const total = filteredOrders.length;
    // CONFIRM: statusPooling order is confirm
    const confirm = filteredOrders.filter((o) => (o.statusPooling || "").toUpperCase().includes("CONFIRM")).length;
    // CANCEL: statusPooling cancel
    const cancel = filteredOrders.filter((o) => (o.statusPooling || "").toUpperCase().includes("CANCEL")).length;
    // NEED ACTION: statusPooling is empty or NEED ACTION
    const needAction = filteredOrders.filter((o) => {
      const s = (o.statusPooling || "").toUpperCase();
      return !s.includes("CONFIRM") && !s.includes("CANCEL");
    }).length;

    const activeTotal = needAction + confirm;

    const exportOrders = filteredOrders.filter((o) => getCat(o) === "EXPORT");
    const repoFullOrders = filteredOrders.filter((o) => getCat(o) === "REPO FULL");
    const repoEmptyOrders = filteredOrders.filter((o) => getCat(o) === "REPO EMPTY");
    const importOrders = filteredOrders.filter((o) => getCat(o) === "IMPORT");

    const getBreakdown = (list: Order[]) => {
      const listTotal = list.length || 1;
      const needAction = list.filter((o) => {
        const s = (o.statusPooling || "").toUpperCase();
        return !s.includes("CONFIRM") && !s.includes("CANCEL");
      }).length;
      const confirm = list.filter((o) => (o.statusPooling || "").toUpperCase().includes("CONFIRM")).length;
      const cancel = list.filter((o) => (o.statusPooling || "").toUpperCase().includes("CANCEL")).length;

      return {
        total: list.length,
        needAction,
        confirm,
        cancel,
        segments: [
          { label: "need action", count: needAction, percentage: Math.round((needAction / listTotal) * 100), color: "bg-amber-500", hoverColor: "bg-amber-400", shadowColor: "#f59e0b" },
          { label: "confirm", count: confirm, percentage: Math.round((confirm / listTotal) * 100), color: "bg-blue-600", hoverColor: "bg-blue-500", shadowColor: "#2563eb" },
          { label: "cancel", count: cancel, percentage: Math.round((cancel / listTotal) * 100), color: "bg-rose-500", hoverColor: "bg-rose-400", shadowColor: "#f43f5e" }
        ]
      };
    };

    return {
      total,
      activeTotal,
      cancel,
      needAction,
      confirm,
      export: getBreakdown(exportOrders),
      repoFull: getBreakdown(repoFullOrders),
      repoEmpty: getBreakdown(repoEmptyOrders),
      import: getBreakdown(importOrders),
      exportCount: exportOrders.length,
      repoFullCount: repoFullOrders.length,
      repoEmptyCount: repoEmptyOrders.length,
      importCount: importOrders.length,
      // Legacy compatibility keys
      ekspor: getBreakdown(exportOrders),
      repo: getBreakdown(repoFullOrders),
      impor: getBreakdown(importOrders),
      repoPdt: getBreakdown(repoEmptyOrders)
    };
  }, [filteredOrders]);

  // Compute Live Shipment Stats directly from EXECUTED SINARMAS sheet rows
  const shipmentStats = useMemo(() => {
    let total = 0;
    let preTrip = 0;
    let onTrip = 0;
    let endTrip = 0;
    let cancel = 0;
    let cancelCustomer = 0;
    let pendingShipment = 0;

    const dataset = filteredExecutedShipments.length > 0 ? filteredExecutedShipments : filteredOrders;

    dataset.forEach((o) => {
      const qty = filteredExecutedShipments.length > 0 ? 1 : (o.quantity || 1);
      const { shipmentStatus } = mapCSStatus(o.lastUpdateCS);

      total += qty;
      if (shipmentStatus === "pre_trip") {
        preTrip += qty;
      } else if (shipmentStatus === "on_trip") {
        onTrip += qty;
      } else if (shipmentStatus === "end_trip") {
        endTrip += qty;
      } else if (shipmentStatus === "cancel") {
        cancel += qty;
      }

      const cs = (o.lastUpdateCS || "").toUpperCase();
      if (cs.includes("CANCEL CUSTOMER") || cs.includes("CANCEL CUST")) {
        cancelCustomer += qty;
      }
      if (cs.includes("BON MUAT") || cs.includes("HOLD") || (o.orderStatus || "").toLowerCase() === "hold") {
        pendingShipment += qty;
      }
    });

    const activeTotal = preTrip + onTrip + endTrip;

    const preTripPct = activeTotal > 0 ? Math.round((preTrip / activeTotal) * 100) : 0;
    const onTripPct = activeTotal > 0 ? Math.round((onTrip / activeTotal) * 100) : 0;
    const endTripPct = activeTotal > 0 ? Math.round((endTrip / activeTotal) * 100) : 0;

    return {
      total,
      activeTotal,
      cancel,
      cancelCustomer,
      pendingShipment,
      preTrip,
      onTrip,
      endTrip,
      preTripPct,
      onTripPct,
      endTripPct
    };
  }, [filteredExecutedShipments, filteredOrders]);

  const totalOrders = orderStats.total;

  // Stacked bar segments for Order Types
  const orderTypeSegments = [
    { label: "Export", count: orderStats.exportCount, percentage: totalOrders ? Math.round((orderStats.exportCount / totalOrders) * 100) : 0, color: "bg-sky-500" },
    { label: "Repo Full", count: orderStats.repoFullCount, percentage: totalOrders ? Math.round((orderStats.repoFullCount / totalOrders) * 100) : 0, color: "bg-emerald-500" },
    { label: "Repo Empty", count: orderStats.repoEmptyCount, percentage: totalOrders ? Math.round((orderStats.repoEmptyCount / totalOrders) * 100) : 0, color: "bg-purple-600" },
    { label: "Import", count: orderStats.importCount, percentage: totalOrders ? Math.round((orderStats.importCount / totalOrders) * 100) : 0, color: "bg-blue-600" }
  ];

  const orderDistributionData = [
    { name: "Export", value: orderStats.exportCount, color: "#0EA5E9" },    // sky-500
    { name: "Repo Full", value: orderStats.repoFullCount, color: "#10B981" }, // emerald-500
    { name: "Repo Empty", value: orderStats.repoEmptyCount, color: "#9333EA" },    // purple-600
    { name: "Import", value: orderStats.importCount, color: "#2563EB" }       // blue-600
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full overflow-hidden space-y-4"
    >
      {/* Top Welcome & KPI row - Stays firmly locked at top, never overlaps or blends with scrolled content */}
      <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl text-gray-900 dark:text-slate-100 shadow-sm relative overflow-hidden border border-gray-200 dark:border-slate-800 transition-colors duration-200">
        <div className="z-10 flex flex-wrap items-center justify-between w-full gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 text-gray-900 dark:text-slate-100">
              Welcome to Pancaran One Dashboard
            </h2>
            <p className="text-gray-500 dark:text-slate-400 text-[11px] sm:text-xs font-semibold mt-1">
              Real-time monitoring of fleet allocation, container orders, and client shipments for PT Indah Kiat Pulp & Paper Tbk (IKPP).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tanggal for Dashboard */}
            <DateRangeFilter
              value={dateFilter}
              onChange={setDateFilter}
              dateType={dateType}
              onDateTypeChange={setDateType}
              align="right"
            />
          </div>
        </div>

        {/* Background decorative vector details */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-gray-50 dark:bg-slate-800/40 rounded-full blur-2xl"></div>
        <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-gray-50 dark:bg-slate-800/40 rounded-full blur-xl"></div>
      </div>

      {/* Dedicated Scrollable Container for Dashboard Widgets */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-6">
        {/* Grid of 4 Widget Boxes (Bento Dashboard Grid) - now perfectly equal & aligned */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        
        {/* BOX 1: PERFORMANCE PA IKPP */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col justify-start space-y-3.5 transition-colors duration-200 h-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2.5 gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 dark:bg-slate-800 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-slate-700 shadow-xs">
                <Truck className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-black text-gray-900 dark:text-slate-100 leading-tight">Performance PA IKPP</h4>
                  {paIkppData?.sheetDate && (
                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 px-1.5 py-0.5 rounded">
                      Sheet: {paIkppData.sheetDate}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <p className="text-[10px] text-gray-400 dark:text-slate-400 font-semibold">Active fleet dispatch readiness status</p>
                  {paIkppSelectedDate && paIkppData?.sheetDate && (
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                      (Filter khusus PA: {paIkppData.sheetDate})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dedicated Date Control for Performance PA IKPP */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-0.5" />
                <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 hidden sm:inline">Set Tanggal PA:</span>
                <select
                  value={paIkppSelectedDate}
                  onChange={(e) => setPaIkppSelectedDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-[11px] font-bold rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-xs"
                >
                  <option value="">Auto (Sheet Terbaru)</option>
                  {paIkppData?.availableDates?.map((d) => (
                    <option key={d} value={d}>
                      Sheet: {d}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split("-");
                      if (y && m && d) {
                        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
                        const formatted = `${parseInt(d, 10)}-${months[parseInt(m, 10) - 1]}-${y}`;
                        setPaIkppSelectedDate(formatted);
                      }
                    }
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-[10px] font-medium rounded-md px-1.5 py-1 focus:outline-none cursor-pointer hidden md:block"
                  title="Pilih tanggal kalender"
                />
                {paIkppSelectedDate && (
                  <button
                    onClick={() => setPaIkppSelectedDate("")}
                    className="text-[9.5px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                    title="Reset ke tanggal terbaru"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-start space-y-3.5 pt-0">
            {/* 4 Shift Availability & Utilization Cards Split into 2 Separate Containers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
              {/* Shift 1 Group Container */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                  <span>SHIFT 1 SUMMARY</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{paIkppData?.shift1.totalUnits ?? 64} Units</span>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full">
                  {/* Card 1: AVG AVAILABILITY SHIFT 1 */}
                  <div className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 border border-gray-200/80 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 text-center flex flex-col justify-between shadow-xs">
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                      AVG AVAILABILITY SHIFT 1
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100 my-1 tabular-nums">
                      {(paIkppData?.shift1.avgAvailabilityPct ?? 73.74).toFixed(2)}%
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                      <span>⬇</span>
                      <span>{(paIkppData?.shift1.avgDowntimePct ?? 0).toFixed(1)}% Average Downtime %</span>
                    </div>
                  </div>

                  {/* Card 2: AVG UTILIZATION SHIFT 1 */}
                  <div className="bg-white dark:bg-slate-900 border-l-4 border-l-blue-600 border border-gray-200/80 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 text-center flex flex-col justify-between shadow-xs">
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                      AVG UTILIZATION SHIFT 1
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100 my-1 tabular-nums">
                      {(paIkppData?.shift1.avgUtilizationPct ?? 92.59).toFixed(2)}%
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                      <span>⬇</span>
                      <span>{(paIkppData?.shift1.avgStandbyPct ?? 0).toFixed(1)}% Average Standby %</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shift 2 Group Container */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                  <span>SHIFT 2 SUMMARY</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{paIkppData?.shift2.totalUnits ?? 64} Units</span>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full">
                  {/* Card 3: AVG AVAILABILITY SHIFT 2 */}
                  <div className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 border border-gray-200/80 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 text-center flex flex-col justify-between shadow-xs">
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                      AVG AVAILABILITY SHIFT 2
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100 my-1 tabular-nums">
                      {(paIkppData?.shift2.avgAvailabilityPct ?? 0).toFixed(2)}%
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                      <span>⬇</span>
                      <span>{(paIkppData?.shift2.avgDowntimePct ?? 0).toFixed(1)}% Average Downtime %</span>
                    </div>
                  </div>

                  {/* Card 4: AVG UTILIZATION SHIFT 2 */}
                  <div className="bg-white dark:bg-slate-900 border-l-4 border-l-blue-600 border border-gray-200/80 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 text-center flex flex-col justify-between shadow-xs">
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                      AVG UTILIZATION SHIFT 2
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100 my-1 tabular-nums">
                      {(paIkppData?.shift2.avgUtilizationPct ?? 0).toFixed(2)}%
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                      <span>⬇</span>
                      <span>{(paIkppData?.shift2.avgStandbyPct ?? 0).toFixed(1)}% Average Standby %</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Progress Bars & Percentages (2 Garis Terpisah) Split into 2 Containers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
              {/* Shift 1 Ratio Container */}
              <div className="bg-gray-50/60 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-0.5">
                  <span>SHIFT 1 AVAILABILITY & UTILIZATION</span>
                  <span className="text-gray-400 font-semibold text-[9px]">{paIkppData?.shift1.totalUnits ?? 64} UNITS</span>
                </div>

                {/* 1. Availability Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>AVG AVAILABILITY SHIFT 1 <span className="text-emerald-600 dark:text-emerald-400 font-extrabold ml-1">{(paIkppData?.shift1.avgAvailabilityPct ?? 81.25).toFixed(2)}%</span></span>
                    </div>
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/40">⬇ {(paIkppData?.shift1.avgDowntimePct ?? 0).toFixed(1)}% Downtime</span>
                  </div>
                  <div className="h-2 w-full bg-rose-100 dark:bg-rose-950/30 rounded-full overflow-hidden flex">
                    <div style={{ width: `${paIkppData?.shift1.avgAvailabilityPct ?? 81.25}%` }} className="bg-emerald-500 h-full rounded-full transition-all" title={`Availability ${(paIkppData?.shift1.avgAvailabilityPct ?? 81.25).toFixed(2)}%`} />
                  </div>
                </div>

                {/* 2. Utilization Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      <span>AVG UTILIZATION SHIFT 1 <span className="text-blue-600 dark:text-blue-400 font-extrabold ml-1">{(paIkppData?.shift1.avgUtilizationPct ?? 46.88).toFixed(2)}%</span></span>
                    </div>
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/40">⬇ {(paIkppData?.shift1.avgStandbyPct ?? 0).toFixed(1)}% Standby</span>
                  </div>
                  <div className="h-2 w-full bg-sky-100 dark:bg-sky-950/30 rounded-full overflow-hidden flex">
                    <div style={{ width: `${paIkppData?.shift1.avgUtilizationPct ?? 46.88}%` }} className="bg-blue-600 h-full rounded-full transition-all" title={`Utilization ${(paIkppData?.shift1.avgUtilizationPct ?? 46.88).toFixed(2)}%`} />
                  </div>
                </div>
              </div>

              {/* Shift 2 Ratio Container */}
              <div className="bg-gray-50/60 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-0.5">
                  <span>SHIFT 2 AVAILABILITY & UTILIZATION</span>
                  <span className="text-gray-400 font-semibold text-[9px]">{paIkppData?.shift2.totalUnits ?? 64} UNITS</span>
                </div>

                {/* 1. Availability Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>AVG AVAILABILITY SHIFT 2 <span className="text-emerald-600 dark:text-emerald-400 font-extrabold ml-1">{(paIkppData?.shift2.avgAvailabilityPct ?? 0).toFixed(2)}%</span></span>
                    </div>
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/40">⬇ {(paIkppData?.shift2.avgDowntimePct ?? 0).toFixed(1)}% Downtime</span>
                  </div>
                  <div className="h-2 w-full bg-rose-100 dark:bg-rose-950/30 rounded-full overflow-hidden flex">
                    <div style={{ width: `${paIkppData?.shift2.avgAvailabilityPct ?? 0}%` }} className="bg-emerald-500 h-full rounded-full transition-all" title={`Availability ${(paIkppData?.shift2.avgAvailabilityPct ?? 0).toFixed(2)}%`} />
                  </div>
                </div>

                {/* 2. Utilization Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      <span>AVG UTILIZATION SHIFT 2 <span className="text-blue-600 dark:text-blue-400 font-extrabold ml-1">{(paIkppData?.shift2.avgUtilizationPct ?? 0).toFixed(2)}%</span></span>
                    </div>
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/40">⬇ {(paIkppData?.shift2.avgStandbyPct ?? 0).toFixed(1)}% Standby</span>
                  </div>
                  <div className="h-2 w-full bg-sky-100 dark:bg-sky-950/30 rounded-full overflow-hidden flex">
                    <div style={{ width: `${paIkppData?.shift2.avgUtilizationPct ?? 0}%` }} className="bg-blue-600 h-full rounded-full transition-all" title={`Utilization ${(paIkppData?.shift2.avgUtilizationPct ?? 0).toFixed(2)}%`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOX 2: ORDER MANAGEMENT & SERVICE STREAMS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-5 transition-colors duration-200 h-full">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-slate-800 rounded-lg text-blue-600 dark:text-sky-400 border border-blue-100 dark:border-slate-700 shadow-xs">
                <ClipboardList className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-slate-100 leading-tight">Order Management & Service Streams</h4>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 font-semibold">Load assignments and active channels</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("order")}
              className="text-[10px] font-bold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100/75 dark:hover:bg-slate-700 border border-blue-100 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              Explore Orders →
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* 5 Stat Cards Highlighted - Equal height & alignment */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {/* Total Order */}
              <div
                onClick={() => {
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Total Order",
                    subtitle: "Seluruh order yang terdaftar dalam sistem / sheet",
                    data: filteredOrders,
                    dataType: "order"
                  });
                }}
                className="bg-slate-50/60 dark:bg-slate-800/60 border-l-4 border-l-slate-500 border border-slate-200/80 dark:border-slate-700 p-2.5 rounded-xl flex flex-col justify-center min-h-[80px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Total Order
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mt-1 block">
                    {orderStats.total}
                  </span>
                  <span className="text-[8px] text-rose-600 dark:text-rose-400 font-bold mt-1 block leading-none">
                    Total Cancel: {orderStats.cancel}
                  </span>
                </div>
              </div>

              {/* Total Shipment (Samping Kanan Total Order) */}
              <div
                onClick={() => {
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Total Shipment",
                    subtitle: "Seluruh eksekusi trip shipment dalam sistem / sheet",
                    data: filteredExecutedShipments,
                    dataType: "shipment"
                  });
                }}
                className="bg-sky-50/30 dark:bg-sky-950/20 border-l-4 border-l-sky-500 border border-sky-200/60 dark:border-sky-800/40 p-2.5 rounded-xl flex flex-col justify-center min-h-[80px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-[9px] font-black text-sky-800 dark:text-sky-300 uppercase tracking-wider block">
                    Total Shipment
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-sky-700 dark:text-sky-300 tracking-tight leading-none mt-1 block">
                    {shipmentStats.total}
                  </span>
                  <span className="text-[8px] text-sky-600 dark:text-sky-400 font-bold mt-1 block leading-none">
                    Executed Trips
                  </span>
                </div>
              </div>
              
              {/* Need Action (Open Queue) */}
              <div
                onClick={() => {
                  const needActionList = filteredOrders.filter((o) => {
                    const s = (o.statusPooling || "").toUpperCase();
                    return !s.includes("CONFIRM") && !s.includes("CANCEL");
                  });
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Need Action",
                    subtitle: "Order dengan Status Pooling belum dikonfirmasi (Kosong / Need Action)",
                    data: needActionList,
                    dataType: "order"
                  });
                }}
                className="bg-amber-50/25 dark:bg-amber-950/20 border-l-4 border-l-amber-500 border border-amber-200/60 dark:border-amber-800/40 p-2.5 rounded-xl flex flex-col justify-center min-h-[80px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-[9px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider block">Need Action</span>
                  <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-none mt-1 block">{orderStats.needAction}</span>
                  <span className="text-[8px] text-amber-500 dark:text-amber-400 font-bold mt-1 block leading-none">Status Pooling Empty</span>
                </div>
              </div>

              {/* Confirm (In Progress) */}
              <div
                onClick={() => {
                  const confirmList = filteredOrders.filter((o) => (o.statusPooling || "").toUpperCase().includes("CONFIRM"));
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Confirm",
                    subtitle: "Order dengan Status Pooling telah dikonfirmasi (Confirm)",
                    data: confirmList,
                    dataType: "order"
                  });
                }}
                className="bg-blue-50/25 dark:bg-blue-950/20 border-l-4 border-l-blue-500 border border-blue-200/60 dark:border-blue-800/40 p-2.5 rounded-xl flex flex-col justify-center min-h-[80px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-[9px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider block">Confirm</span>
                  <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none mt-1 block">{orderStats.confirm}</span>
                  <span className="text-[8px] text-blue-500 dark:text-blue-400 font-bold mt-1 block leading-none">Status Pooling Order</span>
                </div>
              </div>

              {/* Cancel (Completed) */}
              <div
                onClick={() => {
                  const cancelList = filteredOrders.filter((o) => (o.statusPooling || "").toUpperCase().includes("CANCEL"));
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Cancel",
                    subtitle: "Order dengan Status Pooling Cancel",
                    data: cancelList,
                    dataType: "order"
                  });
                }}
                className="bg-rose-50/25 dark:bg-rose-950/20 border-l-4 border-l-rose-500 border border-rose-200/60 dark:border-rose-800/40 p-2.5 rounded-xl flex flex-col justify-center min-h-[80px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-[9px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider block">Cancel</span>
                  <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none mt-1 block">{orderStats.cancel}</span>
                  <span className="text-[8px] text-rose-500 dark:text-rose-400 font-bold mt-1 block leading-none">Status Pooling Cancel</span>
                </div>
              </div>
            </div>

            {/* Service Streams Progress Breakdown */}
            <div className="bg-gray-50/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex-1 flex flex-col justify-center">
              <span className="text-[9px] text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider block mb-2.5">
                Service Streams Progress Breakdown
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <ServiceStreamCard
                  title="EXPORT"
                  total={orderStats.export.total}
                  themeColor="sky"
                  segments={orderStats.export.segments}
                  onClick={() => setDetailModal({
                    isOpen: true,
                    title: "Detail Data: EXPORT SERVICE",
                    subtitle: "Rincian order untuk kategori service Export",
                    data: filteredOrders.filter((o) => getCat(o) === "EXPORT"),
                    dataType: "order"
                  })}
                />

                <ServiceStreamCard
                  title="REPO FULL"
                  total={orderStats.repoFull.total}
                  themeColor="emerald"
                  segments={orderStats.repoFull.segments}
                  onClick={() => setDetailModal({
                    isOpen: true,
                    title: "Detail Data: REPO FULL SERVICE",
                    subtitle: "Rincian order untuk kategori service Repo Full",
                    data: filteredOrders.filter((o) => getCat(o) === "REPO FULL"),
                    dataType: "order"
                  })}
                />

                <ServiceStreamCard
                  title="REPO EMPTY"
                  total={orderStats.repoEmpty.total}
                  themeColor="purple"
                  segments={orderStats.repoEmpty.segments}
                  onClick={() => setDetailModal({
                    isOpen: true,
                    title: "Detail Data: REPO EMPTY SERVICE",
                    subtitle: "Rincian order untuk kategori service Repo Empty",
                    data: filteredOrders.filter((o) => getCat(o) === "REPO EMPTY"),
                    dataType: "order"
                  })}
                />

                <ServiceStreamCard
                  title="IMPORT"
                  total={orderStats.import.total}
                  themeColor="blue"
                  segments={orderStats.import.segments}
                  onClick={() => setDetailModal({
                    isOpen: true,
                    title: "Detail Data: IMPORT SERVICE",
                    subtitle: "Rincian order untuk kategori service Import",
                    data: filteredOrders.filter((o) => getCat(o) === "IMPORT"),
                    dataType: "order"
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOX 3: SHIPMENT TRACKING & PIPELINE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-5 transition-colors duration-200 h-full">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-slate-800 rounded-lg text-[#0B2C6B] dark:text-sky-400 border border-blue-100 dark:border-slate-700 shadow-xs">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-slate-100 leading-tight">Shipment Tracking & Pipeline</h4>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 font-semibold">Active pre-trip & transit GPS status checkpoints</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("shipment")}
              className="text-[10px] font-bold text-[#0B2C6B] dark:text-sky-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100/75 dark:hover:bg-slate-700 border border-blue-100 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              Track Shipments →
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* 6 Stat Cards Highlighted - Equal height & alignment */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
              {/* Total Shipment */}
              <div
                onClick={() => {
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Total Shipment",
                    subtitle: "Seluruh data eksekusi shipment dalam periode terpilih",
                    data: filteredExecutedShipments,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-[#0B2C6B] dark:border-l-sky-500 border border-slate-200/80 dark:border-slate-700/80 p-2.5 sm:p-3 rounded-xl flex flex-col justify-between min-h-[85px] sm:min-h-[90px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm min-w-0"
              >
                <div className="flex items-start justify-between gap-1 h-[24px] sm:h-[26px] min-w-0">
                  <span className="text-[10px] sm:text-[10.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block" title="Total Shipment">
                    Total Shipment
                  </span>
                  <div className="p-1 bg-slate-100 dark:bg-slate-700/80 rounded text-slate-400 shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-1">
                  <span className="text-xl sm:text-2xl xl:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none block">
                    {shipmentStats.total}
                  </span>
                </div>
              </div>

              {/* Total Cancel Customer */}
              <div
                onClick={() => {
                  const cancelList = filteredExecutedShipments.filter(
                    (s) =>
                      (s.orderStatus || "").toLowerCase().includes("cancel customer") ||
                      (s.lastUpdateCS || "").toLowerCase().includes("cancel customer") ||
                      (s.lastUpdateCS || "").toLowerCase().includes("cancel cust")
                  );
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Total Cancel Customer",
                    subtitle: "Trip shipment dengan status order cancel customer",
                    data: cancelList,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-rose-500 border border-slate-200/80 dark:border-slate-700/80 p-2.5 sm:p-3 rounded-xl flex flex-col justify-between min-h-[85px] sm:min-h-[90px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm min-w-0"
              >
                <div className="flex items-start justify-between gap-1 h-[24px] sm:h-[26px] min-w-0">
                  <span className="text-[10px] sm:text-[10.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block" title="Total Cancel Customer">
                    Total Cancel Customer
                  </span>
                  <div className="p-1 bg-slate-100 dark:bg-slate-700/80 rounded text-slate-400 shrink-0">
                    <XCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-1">
                  <span className="text-xl sm:text-2xl xl:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none block">
                    {shipmentStats.cancelCustomer}
                  </span>
                </div>
              </div>

              {/* Pending Shipment */}
              <div
                onClick={() => {
                  const pendingList = filteredExecutedShipments.filter((s) => {
                    const cs = (s.lastUpdateCS || "").toUpperCase();
                    return cs.includes("BON MUAT") || cs.includes("HOLD") || s.orderStatus === "hold";
                  });
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Pending Shipment",
                    subtitle: "Shipment dalam antrian Bon Muat atau status Hold CS",
                    data: pendingList,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-rose-500 border border-slate-200/80 dark:border-slate-700/80 p-2.5 sm:p-3 rounded-xl flex flex-col justify-between min-h-[85px] sm:min-h-[90px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm min-w-0"
              >
                <div className="flex items-start justify-between gap-1 h-[24px] sm:h-[26px] min-w-0">
                  <span className="text-[10px] sm:text-[10.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block" title="Pending Shipment">
                    Pending Shipment
                  </span>
                  <div className="p-1 bg-slate-100 dark:bg-slate-700/80 rounded text-slate-400 shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-1">
                  <span className="text-xl sm:text-2xl xl:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none block">
                    {shipmentStats.pendingShipment}
                  </span>
                </div>
              </div>

              {/* Pre-Trip */}
              <div
                onClick={() => {
                  const preTripList = filteredExecutedShipments.filter((s) => {
                    const cs = (s.lastUpdateCS || "").toLowerCase();
                    const isCancel =
                      s.tripStatus === "cancel" ||
                      (s.orderStatus || "").toLowerCase().includes("cancel") ||
                      cs.includes("cancel");
                    return s.tripStatus === "pre_trip" && !isCancel;
                  });
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Pre-Trip",
                    subtitle: "Persiapan unit dan antrian muat barang (Pre-Trip)",
                    data: preTripList,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-sky-500 border border-slate-200/80 dark:border-slate-700/80 p-2.5 sm:p-3 rounded-xl flex flex-col justify-between min-h-[85px] sm:min-h-[90px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm min-w-0"
              >
                <div className="flex items-start justify-between gap-1 h-[24px] sm:h-[26px] min-w-0">
                  <span className="text-[10px] sm:text-[10.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block" title="Pre-Trip">
                    Pre-Trip
                  </span>
                  <div className="p-1 bg-slate-100 dark:bg-slate-700/80 rounded text-slate-400 shrink-0">
                    <CircleDot className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-1">
                  <span className="text-xl sm:text-2xl xl:text-3xl font-black text-sky-600 dark:text-sky-400 tracking-tight leading-none block">
                    {shipmentStats.preTrip}
                  </span>
                </div>
              </div>

              {/* On Trip */}
              <div
                onClick={() => {
                  const onTripList = filteredExecutedShipments.filter((s) => s.tripStatus === "on_trip");
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: On Trip",
                    subtitle: "Armada sedang dalam perjalanan ke lokasi tujuan (In Transit)",
                    data: onTripList,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-blue-600 border border-slate-200/80 dark:border-slate-700/80 p-2.5 sm:p-3 rounded-xl flex flex-col justify-between min-h-[85px] sm:min-h-[90px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm min-w-0"
              >
                <div className="flex items-start justify-between gap-1 h-[24px] sm:h-[26px] min-w-0">
                  <span className="text-[10px] sm:text-[10.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block" title="On Trip">
                    On Trip
                  </span>
                  <div className="p-1 bg-slate-100 dark:bg-slate-700/80 rounded text-slate-400 shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-1">
                  <span className="text-xl sm:text-2xl xl:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none block">
                    {shipmentStats.onTrip}
                  </span>
                </div>
              </div>

              {/* End Trip */}
              <div
                onClick={() => {
                  const endTripList = filteredExecutedShipments.filter((s) => s.tripStatus === "end_trip");
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: End Trip",
                    subtitle: "Pengiriman barang telah selesai dan armada tiba dengan aman",
                    data: endTripList,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-emerald-500 border border-slate-200/80 dark:border-slate-700/80 p-2.5 sm:p-3 rounded-xl flex flex-col justify-between min-h-[85px] sm:min-h-[90px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm min-w-0"
              >
                <div className="flex items-start justify-between gap-1 h-[24px] sm:h-[26px] min-w-0">
                  <span className="text-[10px] sm:text-[10.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block" title="End Trip">
                    End Trip
                  </span>
                  <div className="p-1 bg-slate-100 dark:bg-slate-700/80 rounded text-slate-400 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-1">
                  <span className="text-xl sm:text-2xl xl:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none block">
                    {shipmentStats.endTrip}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipment Pipeline Status Stepper underneath */}
            <div className="bg-gray-50/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[9px] text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                  Shipment Pipeline Status Stepper
                </span>
                <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 px-2 py-0.5 rounded">
                  Total: {shipmentStats.total} Shipments
                </span>
              </div>
              <div className="py-2 bg-white dark:bg-slate-800/80 rounded-lg border border-gray-100/60 dark:border-slate-700 shadow-xs px-2 sm:px-4">
                <TripStepper
                  preTripCount={shipmentStats.preTrip}
                  onTripCount={shipmentStats.onTrip}
                  endTripCount={shipmentStats.endTrip}
                  hideCard={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOX 4: ORDER ALLOCATION RATIO */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-5 transition-colors duration-200 h-full">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-slate-800 rounded-lg text-blue-600 dark:text-sky-400 border border-blue-100 dark:border-slate-700 shadow-xs">
                <BarChart3 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-slate-100 leading-tight">Order Allocation Ratio</h4>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 font-semibold">Service stream distribution</p>
              </div>
            </div>
            <div className="text-[10px] font-black text-blue-700 dark:text-sky-300 bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-xs">
              Total: {totalOrders} Orders
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* 4 Stat Cards Highlighted - Equal height & alignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Export */}
              <div 
                onClick={() => setDetailModal({
                  isOpen: true,
                  title: "Detail Data: EXPORT",
                  subtitle: "Rincian order untuk kategori service EXPORT",
                  data: filteredOrders.filter((o) => getCat(o) === "EXPORT"),
                  dataType: "order"
                })}
                className="bg-sky-50/25 dark:bg-sky-950/20 border-l-4 border-l-sky-400 border border-sky-200/60 dark:border-sky-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 tracking-tight leading-none">{orderStats.exportCount}</span>
                <span className="text-[10px] font-black text-sky-800 dark:text-sky-300 uppercase tracking-wider mt-1.5 leading-none block">Export</span>
                <span className="text-[9px] text-sky-500 dark:text-sky-400 font-bold mt-1 block leading-none">{totalOrders ? Math.round((orderStats.exportCount / totalOrders) * 100) : 0}% Share</span>
              </div>

              {/* Repo Full */}
              <div 
                onClick={() => setDetailModal({
                  isOpen: true,
                  title: "Detail Data: REPO FULL",
                  subtitle: "Rincian order untuk kategori service REPO FULL",
                  data: filteredOrders.filter((o) => getCat(o) === "REPO FULL"),
                  dataType: "order"
                })}
                className="bg-emerald-50/25 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 border border-emerald-200/60 dark:border-emerald-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">{orderStats.repoFullCount}</span>
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mt-1.5 leading-none block">Repo Full</span>
                <span className="text-[9px] text-emerald-500 dark:text-emerald-400 font-bold mt-1 block leading-none">{totalOrders ? Math.round((orderStats.repoFullCount / totalOrders) * 100) : 0}% Share</span>
              </div>

              {/* Repo Empty */}
              <div 
                onClick={() => setDetailModal({
                  isOpen: true,
                  title: "Detail Data: REPO EMPTY",
                  subtitle: "Rincian order untuk kategori service REPO EMPTY",
                  data: filteredOrders.filter((o) => getCat(o) === "REPO EMPTY"),
                  dataType: "order"
                })}
                className="bg-purple-50/25 dark:bg-purple-950/20 border-l-4 border-l-purple-500 border border-purple-200/60 dark:border-purple-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight leading-none">{orderStats.repoEmptyCount}</span>
                <span className="text-[10px] font-black text-purple-800 dark:text-purple-300 uppercase tracking-wider mt-1.5 leading-none block">Repo Empty</span>
                <span className="text-[9px] text-purple-500 dark:text-purple-400 font-bold mt-1 block leading-none">{totalOrders ? Math.round((orderStats.repoEmptyCount / totalOrders) * 100) : 0}% Share</span>
              </div>

              {/* Import */}
              <div 
                onClick={() => setDetailModal({
                  isOpen: true,
                  title: "Detail Data: IMPORT",
                  subtitle: "Rincian order untuk kategori service IMPORT",
                  data: filteredOrders.filter((o) => getCat(o) === "IMPORT"),
                  dataType: "order"
                })}
                className="bg-blue-50/25 dark:bg-blue-950/20 border-l-4 border-l-blue-500 border border-blue-200/60 dark:border-blue-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none">{orderStats.importCount}</span>
                <span className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider mt-1.5 leading-none block">Import</span>
                <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold mt-1 block leading-none">{totalOrders ? Math.round((orderStats.importCount / totalOrders) * 100) : 0}% Share</span>
              </div>
            </div>

            {/* Recharts Diagrams placed underneath */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
              {/* Interactive BarChart Diagram */}
              <div className="bg-gray-50/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex flex-col justify-center">
                <span className="text-[9px] text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider block mb-2">Order Allocation Diagram</span>
                <div className="min-h-0 flex items-center justify-center">
                  <BarChart data={orderDistributionData} totalValue={totalOrders} unit="Orders" />
                </div>
              </div>

              {/* Horizontal Ratio Allocation Stacked bar */}
              <div className="bg-gray-50/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex flex-col justify-center">
                <span className="text-[9px] text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider block mb-3">Horizontal Ratio Allocation</span>
                <div className="py-2 px-2 bg-white dark:bg-slate-800/80 rounded-lg border border-gray-100/60 dark:border-slate-700 shadow-xs min-h-0 flex flex-col justify-center">
                  <StackedBarChart segments={orderTypeSegments} total={totalOrders} />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      </div>

      {/* Detail List Modal for KPI Clicks */}
      <DetailListModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal((prev) => ({ ...prev, isOpen: false }))}
        title={detailModal.title}
        subtitle={detailModal.subtitle}
        data={detailModal.data}
        dataType={detailModal.dataType}
      />
    </motion.div>
  );
}
