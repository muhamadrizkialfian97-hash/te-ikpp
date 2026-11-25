import React, { useState, useEffect, useMemo } from "react";
import { 
  Database, 
  TableProperties, 
  Search, 
  FileSpreadsheet, 
  Layers, 
  ArrowUpDown, 
  CheckCircle2, 
  Truck, 
  Package, 
  RefreshCw, 
  ExternalLink, 
  Filter, 
  ChevronRight, 
  Info,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { Order, UserAccount } from "../types";
import { fetchLiveOrdersClient, fetchExecutedShipmentsClient } from "../lib/fetchOrdersClient";
import { deriveFreightTypes } from "../lib/freightTypeLookup";
import { useRouteFreightMappings } from "../hooks/useRouteFreightMappings";
import { isCsUser } from "../lib/userStore";

interface MasterLookupPageProps {
  currentUser?: UserAccount | null;
  onNavigate?: (tab: string, filter?: string) => void;
}

interface RoutePivotRow {
  commercialRoute: string;
  assignedFreightType2: string;
  totalOrders: number;
  totalQuantity: number;
  exportCount: number;
  repoFullCount: number;
  repoEmptyCount: number;
  importCount: number;
  otherCount: number;
  doneCount: number;
  inProgressCount: number;
  openCount: number;
  cancelCount: number;
  orders: Order[];
}

export default function MasterLookupPage({ currentUser }: MasterLookupPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRouteForDetail, setSelectedRouteForDetail] = useState<RoutePivotRow | null>(null);
  const [selectedFreightFilter, setSelectedFreightFilter] = useState<string>("all");
  const [dataSourceMode, setDataSourceMode] = useState<"all" | "pooling" | "executed">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { 
    mappings: routeFreightMappings, 
    updateMapping, 
    resolveFreightType2 
  } = useRouteFreightMappings();

  const handleUpdateRouteMapping = (route: string, newType: string) => {
    updateMapping(route, newType);
    setToastMessage(`Pengaturan rute "${route}" berhasil diubah menjadi ${newType || "Default"} dan disinkronkan ke semua dashboard (Overview, Order, Shipment).`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isDigitalSolution = currentUser?.email?.toLowerCase() === "digital.solution@pancaran-logistic.id" || currentUser?.role === "Super Admin";
  const canAccess = isDigitalSolution || isCsUser(currentUser) || !!currentUser;

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [pooling, executed] = await Promise.all([
        fetchLiveOrdersClient(),
        fetchExecutedShipmentsClient()
      ]);

      const combined = [...pooling, ...executed];
      // Ensure freightType2 is assigned using centralized lookup
      const enriched = combined.map(o => {
        const route = (o.commercialRoute || "").trim().toUpperCase();
        return {
          ...o,
          freightType2: resolveFreightType2(route, o.origin || "", o.destination || "", o.notes || "")
        };
      });

      setOrders(enriched);
    } catch (err) {
      console.error("Failed to load master lookup data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [routeFreightMappings]);

  // Compute Pivot Table Grouped by Commercial Route
  const pivotRows = useMemo(() => {
    const map = new Map<string, RoutePivotRow>();

    const filteredOrders = orders.filter(o => {
      if (dataSourceMode === "pooling" && o.sourceSheetName !== "POOLING SINARMAS") return false;
      if (dataSourceMode === "executed" && o.sourceSheetName !== "EXECUTED SINARMAS") return false;
      return true;
    });

    filteredOrders.forEach(order => {
      const route = (order.commercialRoute || "UNASSIGNED ROUTE").trim().toUpperCase();
      if (!map.has(route)) {
        const assignedFt = resolveFreightType2(route, order.origin || "", order.destination || "", order.notes || "");
        map.set(route, {
          commercialRoute: route,
          assignedFreightType2: assignedFt,
          totalOrders: 0,
          totalQuantity: 0,
          exportCount: 0,
          repoFullCount: 0,
          repoEmptyCount: 0,
          importCount: 0,
          otherCount: 0,
          doneCount: 0,
          inProgressCount: 0,
          openCount: 0,
          cancelCount: 0,
          orders: []
        });
      }

      const row = map.get(route)!;
      row.totalOrders += 1;
      const qty = Number(order.quantity) || 1;
      row.totalQuantity += qty;
      row.orders.push(order);

      const ft2 = (row.assignedFreightType2 || order.freightType2 || "").toUpperCase();
      if (ft2.includes("EXPORT") || ft2.includes("EKSPOR")) {
        row.exportCount += 1;
      } else if (ft2.includes("REPO FULL")) {
        row.repoFullCount += 1;
      } else if (ft2.includes("REPO EMPTY")) {
        row.repoEmptyCount += 1;
      } else if (ft2.includes("IMPORT") || ft2.includes("IMPOR")) {
        row.importCount += 1;
      } else {
        row.otherCount += 1;
      }

      const st = (order.status || "").toLowerCase();
      if (st === "done") row.doneCount += 1;
      else if (st === "in_progress") row.inProgressCount += 1;
      else if (st === "open") row.openCount += 1;
      else if (st === "cancel") row.cancelCount += 1;
    });

    let list = Array.from(map.values());

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.commercialRoute.toLowerCase().includes(q));
    }

    // Freight filter
    if (selectedFreightFilter !== "all") {
      list = list.filter(r => {
        if (selectedFreightFilter === "EXPORT") return r.exportCount > 0;
        if (selectedFreightFilter === "REPO FULL") return r.repoFullCount > 0;
        if (selectedFreightFilter === "REPO EMPTY") return r.repoEmptyCount > 0;
        if (selectedFreightFilter === "IMPORT") return r.importCount > 0;
        return true;
      });
    }

    // Sort by total orders descending
    return list.sort((a, b) => b.totalOrders - a.totalOrders);
  }, [orders, searchQuery, selectedFreightFilter, dataSourceMode, routeFreightMappings]);

  // Grand Totals
  const grandTotals = useMemo(() => {
    return pivotRows.reduce((acc, curr) => ({
      totalOrders: acc.totalOrders + curr.totalOrders,
      totalQuantity: acc.totalQuantity + curr.totalQuantity,
      exportCount: acc.exportCount + curr.exportCount,
      repoFullCount: acc.repoFullCount + curr.repoFullCount,
      repoEmptyCount: acc.repoEmptyCount + curr.repoEmptyCount,
      importCount: acc.importCount + curr.importCount,
      otherCount: acc.otherCount + curr.otherCount,
      doneCount: acc.doneCount + curr.doneCount,
      inProgressCount: acc.inProgressCount + curr.inProgressCount,
      openCount: acc.openCount + curr.openCount,
      cancelCount: acc.cancelCount + curr.cancelCount,
    }), {
      totalOrders: 0,
      totalQuantity: 0,
      exportCount: 0,
      repoFullCount: 0,
      repoEmptyCount: 0,
      importCount: 0,
      otherCount: 0,
      doneCount: 0,
      inProgressCount: 0,
      openCount: 0,
      cancelCount: 0,
    });
  }, [pivotRows]);

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <ShieldCheck className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Akses Terbatas (Digital Solution Exclusive)</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
          Menu Master Lookup Pivot Commercial Route hanya dapat diakses oleh akun resmi Digital Solution Pancaran ONE.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 overflow-y-auto pr-2">
      {/* Toast Synchronization Alert */}
      {toastMessage && (
        <div className="bg-emerald-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="ml-3 text-white/80 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Control Bar: Search, Source Filter, Freight Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Commercial Route (e.g. EKSPOR, IMPOR, REPO)..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setDataSourceMode("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dataSourceMode === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
              }`}
            >
              Semua Sumber
            </button>
            <button
              onClick={() => setDataSourceMode("pooling")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dataSourceMode === "pooling" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
              }`}
            >
              Pooling Sinarmas
            </button>
            <button
              onClick={() => setDataSourceMode("executed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dataSourceMode === "executed" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
              }`}
            >
              Executed Sinarmas
            </button>
          </div>

          <select
            value={selectedFreightFilter}
            onChange={(e) => setSelectedFreightFilter(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Freight Type 2</option>
            <option value="EXPORT">EXPORT</option>
            <option value="REPO FULL">REPO FULL</option>
            <option value="REPO EMPTY">REPO EMPTY</option>
            <option value="IMPORT">IMPORT</option>
          </select>
        </div>
      </div>

      {/* Pivot Table View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
              <TableProperties className="w-5 h-5 text-sky-600" />
              <span>Pivot Table: Commercial Route vs Freight Type 2</span>
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">
              Menampilkan rekapitulasi jumlah order, quantity, serta breakdown jenis pengiriman real per rute komersial.
            </p>
          </div>

          <div className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
            Total Rute: {pivotRows.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-6">Commercial Route</th>
                <th className="py-3.5 px-6">Freight Type 2 (Parameter Setting)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {pivotRows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Database className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-bold">Tidak ada data Commercial Route yang ditemukan.</p>
                  </td>
                </tr>
              ) : (
                pivotRows.map((row, idx) => (
                  <tr 
                    key={idx}
                    onClick={() => setSelectedRouteForDetail(row)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    title="Klik untuk melihat detail order"
                  >
                    <td className="py-4 px-6 font-extrabold text-slate-900 dark:text-white">
                      <div className="text-sm" title={row.commercialRoute}>
                        {row.commercialRoute}
                      </div>
                      <div className="text-xs text-slate-400 font-normal mt-0.5">
                        {row.orders.length} transaksi tercatat (Klik untuk detail)
                      </div>
                    </td>

                    <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={row.assignedFreightType2 || ""}
                        onChange={(e) => handleUpdateRouteMapping(row.commercialRoute, e.target.value)}
                        className={`border rounded-xl px-3 py-1.5 text-xs font-extrabold cursor-pointer transition-all ${
                          !row.assignedFreightType2 
                            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-300 animate-pulse" 
                            : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-sky-500"
                        }`}
                      >
                        <option value="">-- Pilih Freight Type (Kosong / Belum Diset) --</option>
                        <option value="EXPORT">EXPORT</option>
                        <option value="REPO FULL">REPO FULL</option>
                        <option value="REPO EMPTY">REPO EMPTY</option>
                        <option value="IMPORT">IMPORT</option>
                      </select>
                      {!row.assignedFreightType2 && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Rute baru: Harap setting parameter freight type</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Modal for Commercial Route Details */}
      {selectedRouteForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 bg-sky-100 dark:bg-sky-950 px-2.5 py-0.5 rounded-full">
                  Commercial Route Inspector
                </span>
                <h3 className="font-black text-slate-900 dark:text-white text-lg mt-1">
                  {selectedRouteForDetail.commercialRoute}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Total Order: {selectedRouteForDetail.totalOrders} | Total Qty: {selectedRouteForDetail.totalQuantity} kontainer
                </p>
              </div>

              <button
                onClick={() => setSelectedRouteForDetail(null)}
                className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Orders List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Daftar Order Terkait dalam Rute Ini ({selectedRouteForDetail.orders.length})
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider border-b">
                      <th className="py-3 px-4">ID Job Order</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Origin → Destination</th>
                      <th className="py-3 px-4">Freight Type 2</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Driver / Nopol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {selectedRouteForDetail.orders.map((ord, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-mono font-bold text-sky-600">{ord.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{ord.customer}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{ord.origin} → {ord.destination}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded font-bold text-[10px]">
                            {resolveFreightType2(ord.commercialRoute, ord.origin, ord.destination, ord.notes)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            ord.status === "done" ? "bg-emerald-100 text-emerald-800" :
                            ord.status === "in_progress" ? "bg-sky-100 text-sky-800" :
                            ord.status === "open" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {ord.vehiclePlate || ord.driver || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => setSelectedRouteForDetail(null)}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Tutup Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
