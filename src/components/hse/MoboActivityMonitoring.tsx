import React, { useState, useEffect, useMemo } from "react";
import {
  Smartphone as SmartphoneIcon,
  Calendar as CalendarIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  CheckCircle2 as CheckCircle2Icon,
  Clock as ClockIcon,
  AlertTriangle as AlertTriangleIcon,
  Download as DownloadIcon,
  Printer as PrinterIcon,
  MapPin as MapPinIcon,
  Truck as TruckIcon,
  RefreshCw as RefreshCwIcon,
  Eye as EyeIcon,
  UserCheck as UserCheckIcon,
  FileSpreadsheet as FileSpreadsheetIcon,
  ExternalLink as ExternalLinkIcon,
  ShieldCheck as ShieldCheckIcon,
  Layers as LayersIcon,
  Box as BoxIcon,
  Navigation as NavigationIcon,
  Activity as ActivityIcon,
  X as XIcon,
  FileText as FileTextIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import * as XLSX from "xlsx";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LabelList,
  AreaChart,
  Area
} from "recharts";

interface RawMoboItem {
  shipno: string;
  dateStr: string;
  id: string;
  driver: string;
  nopol: string;
  group: string;
  shipmentType: string;
  customer: string;
  mulaiTime: string;
  mulaiLoc: string;
  naikTime: string;
  naikLoc: string;
  muatTime: string;
  muatLoc: string;
  bongkarTime: string;
  bongkarLoc: string;
  turunTime: string;
  turunLoc: string;
  selesaiTime: string;
  selesaiLoc: string;
  scorePct: number;
  weekStr: string;
  monthStr: string;
  yearStr: string;
  entityStr: string;
}

interface DailyMoboRecord {
  id: string;
  date: string;
  nik: string;
  name: string;
  nopol: string;
  groupDriver?: string;
  entity?: string;
  loginTime: string;
  tenkoTime: string;
  tenkoResult: string;
  p2hStatus: string;
  tripCount: number;
  lastGpsLocation: string;
  lastActivity?: string;
  lastSyncTime: string;
  activeHours: string;
  complianceScore: number;
  status: string;
  timeline: {
    time: string;
    fullTime?: string;
    endTime?: string;
    event: string;
    location?: string;
    shipno?: string;
    status: "success" | "warning" | "info";
  }[];
}

interface DriverEvalReport {
  nik: string;
  name: string;
  project: string;
  area: string;
  period: string;
  riskCategory: string;
  treatment: string;
  score: number;
  aspects: {
    period: string;
    indicator: string;
    caseCount: number;
    reducePoint: number;
    feedback: string;
  }[];
}

const ACTIVITY_COLORS: Record<string, string> = {
  "Parkir": "#3b82f6",
  "Menuju Lokasi Berikutnya": "#0ea5e9",
  "Mulai Penugasan": "#10b981",
  "Selesai Penugasan": "#6366f1",
  "Turun Container": "#f59e0b",
  "Bongkar": "#ec4899",
  "Muat": "#8b5cf6",
  "Naik Container": "#14b8a6",
  "Lepas Chasis": "#f97316",
  "Pasang Chasis": "#84cc16"
};

const CUSTOMER_NAME_MAP: Record<string, string> = {
  "BDP INDONESIA": "BDP INDONESIA",
  "MAERSK LOGISTICS INDONESIA": "MAERSK LOGISTICS INDONESIA",
  "PANCARAN LOGISTIK INDONESIA (PLI)": "PANCARAN LOGISTIK INDONESIA (PLI)",
  "PT DSV CONTRACT LOGISTICS": "PT DSV Contract Logistics",
  "PT DSV TRANSPORT INDONESIA": "PT DSV Transport Indonesia",
  "SCHENKER LOGISTICS INDONESIA": "Schenker Logistics Indonesia",
  "YUSEN LOGISTICS INDONESIA": "YUSEN LOGISTICS INDONESIA"
};

const formatPctComma = (val: number | string, decimals = 2): string => {
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num)) return "0%";
  return `${num.toFixed(decimals).replace(".", ",")}%`;
};

export default function MoboActivityMonitoring() {
  // Summary Filter States matching image_6252fff8.png
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedMonth, setSelectedMonth] = useState("Agustus");
  const [selectedEntity, setSelectedEntity] = useState("PDT");
  const [selectedGroupDriver, setSelectedGroupDriver] = useState("Yusen");
  const [selectedTreatmentFilter, setSelectedTreatmentFilter] = useState("Training");

  // Daily Filter States
  const [selectedDailyDate, setSelectedDailyDate] = useState("2026-10-08");
  const [selectedDailyStatus, setSelectedDailyStatus] = useState("Semua");
  const [selectedDailyEntity, setSelectedDailyEntity] = useState("Semua");
  const [selectedDailyGroup, setSelectedDailyGroup] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Live Sheet data state
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("");
  const [rawItems, setRawItems] = useState<RawMoboItem[]>([]);

  // Daily Mobo Live Records
  const [dailyRecords, setDailyRecords] = useState<DailyMoboRecord[]>([]);
  const [selectedDriverDetail, setSelectedDriverDetail] = useState<DailyMoboRecord | null>(null);

  // Daily Summary KPI
  const [dailySummaryKpi, setDailySummaryKpi] = useState({
    totalDrivers: 226,
    driverLogin: 196,
    loginRate: "86.7% Kehadiran Aplikasi",
    tenkoFit: 196,
    tenkoDesc: "100% Lolos Uji Fisik & Tenko",
    p2hUnit: 221,
    p2hDesc: "P2H Unit Terverifikasi",
    totalTrips: 1020,
    totalActivities: 4804,
    avgLoginTime: "05:54 WIB",
    avgLoginDesc: "Tepat Waktu Sesuai Jadwal",
    complianceRate: "94.5%",
    complianceDesc: "Sesuai Standar Operasional Pancaran"
  });

  const [activityDistribution, setActivityDistribution] = useState<{ name: string; count: number }[]>([
    { name: "Parkir", count: 980 },
    { name: "Menuju Lokasi", count: 890 },
    { name: "Mulai Penugasan", count: 860 },
    { name: "Selesai Penugasan", count: 840 },
    { name: "Turun Container", count: 380 },
    { name: "Bongkar", count: 320 },
    { name: "Muat", count: 280 },
    { name: "Naik Container", count: 254 }
  ]);

  const [weeklyMoboTrend, setWeeklyMoboTrend] = useState([
    { date: "02 Okt", loginRate: 92, tenkoRate: 90, syncRate: 88, compliance: 85.4 },
    { date: "03 Okt", loginRate: 94, tenkoRate: 92, syncRate: 90, compliance: 87.1 },
    { date: "04 Okt", loginRate: 89, tenkoRate: 87, syncRate: 85, compliance: 82.3 },
    { date: "05 Okt", loginRate: 96, tenkoRate: 95, syncRate: 93, compliance: 89.6 },
    { date: "06 Okt", loginRate: 95, tenkoRate: 94, syncRate: 92, compliance: 88.0 },
    { date: "07 Okt", loginRate: 97, tenkoRate: 96, syncRate: 95, compliance: 91.2 },
    { date: "08 Okt (Hari Ini)", loginRate: 96, tenkoRate: 94, syncRate: 93, compliance: 90.5 },
  ]);

  // Driver Evaluation Modal State
  const [evalModalDriver, setEvalModalDriver] = useState<DriverEvalReport | null>(null);

  // Fallback initial summary data
  const fallbackRetentionEntity = [
    { entity: "PDT", retention: 63 },
    { entity: "PETRA", retention: 75 }
  ];

  const fallbackCustomerRetention = [
    { name: "BDP INDONESIA", retention: 62 },
    { name: "MAERSK LOGISTICS INDONESIA", retention: 57 },
    { name: "PANCARAN LOGISTIK INDONESIA (PLI)", retention: 46 },
    { name: "PT DSV Contract Logistics", retention: 42 },
    { name: "PT DSV Transport Indonesia", retention: 48 },
    { name: "Schenker Logistics Indonesia", retention: 52 },
    { name: "YUSEN LOGISTICS INDONESIA", retention: 72 }
  ];

  const fallbackShipmentVsRetention = [
    { month: "Januari", shipment: 1173, retention: 79.62 },
    { month: "Februari", shipment: 1145, retention: 78.21 },
    { month: "Maret", shipment: 929, retention: 75.50 },
    { month: "April", shipment: 1261, retention: 82.57 },
    { month: "Mei", shipment: 1244, retention: 78.93 },
    { month: "Juni", shipment: 1244, retention: 78.14 },
    { month: "Juli", shipment: 1380, retention: 75.47 },
    { month: "Agustus", shipment: 1115, retention: 73.81 },
    { month: "September", shipment: 887, retention: 52.41 },
    { month: "Oktober", shipment: 790, retention: 68.73 },
    { month: "November", shipment: 0, retention: 0 },
    { month: "Desember", shipment: 0, retention: 0 }
  ];

  const fallbackWeeklyImplementation = [
    { week: "Week1", retention: 80.43 },
    { week: "Week2", retention: 76.03 },
    { week: "Week3", retention: 77.49 },
    { week: "Week4", retention: 78.72 },
    { week: "Week5", retention: 15.00 }
  ];

  const fallbackTreatmentData = [
    { name: "Good Performance", val: 31.13, color: "#22c55e" },
    { name: "Nudging & Reminding", val: 65.91, color: "#3b82f6" },
    { name: "Coaching", val: 93.74, color: "#eab308" },
    { name: "Training", val: 6.26, color: "#ef4444" }
  ];

  const fallbackActivitiesData = [
    { name: "Mulai Penugasan", val: 94.33 },
    { name: "Naik Container", val: 45.77 },
    { name: "Muat", val: 31.81 },
    { name: "Bongkar", val: 28.93 },
    { name: "Turun Container", val: 75.47 },
    { name: "Selesai Penugasan", val: 92.89 }
  ];

  const fallbackTreatmentTable = [
    { id: "204030023", name: "204030023 - DUDUNG BIN ATAN", group: "Yusen", jmlShipment: 29, retention: 49.66, treatment: "Training" },
    { id: "219240232", name: "219240232 - SAEPUDIN BIN ADUN", group: "Yusen", jmlShipment: 24, retention: 48.33, treatment: "Training" },
    { id: "213200077", name: "213200077 - M. ARYANA ARDIANS", group: "Yusen", jmlShipment: 20, retention: 47.00, treatment: "Training" },
    { id: "201200254", name: "201200254 - ANDRI PEBRIYANA B", group: "Yusen", jmlShipment: 19, retention: 46.32, treatment: "Training" },
    { id: "214210547", name: "214210547 - NURSA'BAN", group: "Yusen", jmlShipment: 15, retention: 48.00, treatment: "Training" },
    { id: "213200090", name: "213200090 - MUHILI", group: "Yusen", jmlShipment: 18, retention: 58.50, treatment: "Coaching" },
    { id: "219070076", name: "219070076 - SARIP HIDAYAT", group: "Yusen", jmlShipment: 22, retention: 64.10, treatment: "Coaching" },
    { id: "213230290", name: "213230290 - MUSLIM BIN SURIP", group: "Yusen", jmlShipment: 17, retention: 74.20, treatment: "Nudging & Reminding" },
    { id: "201220452", name: "201220452 - ASWADI", group: "Yusen", jmlShipment: 21, retention: 76.50, treatment: "Nudging & Reminding" },
    { id: "215210162", name: "215210162 - ODIH", group: "Yusen", jmlShipment: 25, retention: 86.40, treatment: "Good Performance" }
  ];

  // Fetch summary data from GID 262473085
  const fetchSummaryData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const url = `/api/sheets/mobo-summary${forceRefresh ? "?refresh=true" : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setRawItems(data.items);
          setLastSyncTime(
            new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            })
          );
        }
      }
    } catch (err) {
      console.error("Failed to fetch mobo summary data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch daily mobo activity records
  const fetchDailyMoboData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const url = `/api/sheets/mobo-activity?date=${encodeURIComponent(selectedDailyDate)}${forceRefresh ? "&refresh=true" : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.summaryKpi) setDailySummaryKpi(data.summaryKpi);
          if (Array.isArray(data.activityDistribution) && data.activityDistribution.length > 0) {
            setActivityDistribution(data.activityDistribution);
          }
          if (Array.isArray(data.weeklyMoboTrend) && data.weeklyMoboTrend.length > 0) {
            setWeeklyMoboTrend(data.weeklyMoboTrend);
          }
          if (Array.isArray(data.dailyRecords) && data.dailyRecords.length > 0) {
            setDailyRecords(data.dailyRecords);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch daily mobo activity:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData(false);
  }, []);

  useEffect(() => {
    fetchDailyMoboData(false);
  }, [selectedDailyDate]);

  // Filter raw summary items dynamically by top header dropdowns
  const filteredRawItems = useMemo(() => {
    return rawItems.filter((item) => {
      const matchYear = !selectedYear || selectedYear === "Semua" || item.yearStr === selectedYear;
      const matchMonth = !selectedMonth || selectedMonth === "Semua" || item.monthStr === selectedMonth;
      const matchEntity = !selectedEntity || selectedEntity === "Semua" || item.entityStr === selectedEntity;
      const matchGroup = !selectedGroupDriver || selectedGroupDriver === "Semua" || item.group === selectedGroupDriver;
      return matchYear && matchMonth && matchEntity && matchGroup;
    });
  }, [rawItems, selectedYear, selectedMonth, selectedEntity, selectedGroupDriver]);

  // Summary Chart Computations
  const retentionVsEntityData = useMemo(() => {
    if (rawItems.length === 0) return fallbackRetentionEntity;

    const baseForEntity = rawItems.filter((item) => {
      const matchYear = !selectedYear || selectedYear === "Semua" || item.yearStr === selectedYear;
      const matchMonth = !selectedMonth || selectedMonth === "Semua" || item.monthStr === selectedMonth;
      const matchGroup = !selectedGroupDriver || selectedGroupDriver === "Semua" || item.group === selectedGroupDriver;
      return matchYear && matchMonth && matchGroup;
    });

    const pdtScores = baseForEntity.filter((i) => i.entityStr === "PDT").map((i) => i.scorePct);
    const petraScores = baseForEntity.filter((i) => i.entityStr === "PETRA").map((i) => i.scorePct);

    const avgPdt = pdtScores.length > 0 ? Math.round(pdtScores.reduce((a, b) => a + b, 0) / pdtScores.length) : 63;
    const avgPetra = petraScores.length > 0 ? Math.round(petraScores.reduce((a, b) => a + b, 0) / petraScores.length) : 75;

    return [
      { entity: "PDT", retention: avgPdt },
      { entity: "PETRA", retention: avgPetra }
    ];
  }, [rawItems, selectedYear, selectedMonth, selectedGroupDriver]);

  const customerVsRetentionData = useMemo(() => {
    if (filteredRawItems.length === 0) return fallbackCustomerRetention;

    const customerMap: Record<string, { totalScore: number; count: number }> = {};
    filteredRawItems.forEach((item) => {
      let custName = (item.customer || "").trim();
      if (!custName) return;

      Object.entries(CUSTOMER_NAME_MAP).forEach(([raw, mapped]) => {
        if (custName.toUpperCase().includes(raw.substring(0, 8))) {
          custName = mapped;
        }
      });

      if (!customerMap[custName]) customerMap[custName] = { totalScore: 0, count: 0 };
      customerMap[custName].totalScore += item.scorePct;
      customerMap[custName].count += 1;
    });

    const res = Object.entries(customerMap).map(([name, data]) => ({
      name,
      retention: Math.round(data.totalScore / data.count)
    }));

    return res.length > 0 ? res.slice(0, 8) : fallbackCustomerRetention;
  }, [filteredRawItems]);

  const shipmentVsRetentionData = useMemo(() => {
    if (rawItems.length === 0) return fallbackShipmentVsRetention;

    const monthOrder = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const baseForMonth = rawItems.filter((item) => {
      const matchYear = !selectedYear || selectedYear === "Semua" || item.yearStr === selectedYear;
      const matchEntity = !selectedEntity || selectedEntity === "Semua" || item.entityStr === selectedEntity;
      const matchGroup = !selectedGroupDriver || selectedGroupDriver === "Semua" || item.group === selectedGroupDriver;
      return matchYear && matchEntity && matchGroup;
    });

    return monthOrder.map((m) => {
      const mItems = baseForMonth.filter((i) => i.monthStr === m);
      const count = mItems.length;
      const avgScore = count > 0 ? Number((mItems.reduce((a, b) => a + b.scorePct, 0) / count).toFixed(2)) : 0;

      return {
        month: m,
        shipment: count > 0 ? count : (fallbackShipmentVsRetention.find(f => f.month === m)?.shipment || 0),
        retention: count > 0 ? avgScore : (fallbackShipmentVsRetention.find(f => f.month === m)?.retention || 0)
      };
    });
  }, [rawItems, selectedYear, selectedEntity, selectedGroupDriver]);

  const weeklyImplementationData = useMemo(() => {
    if (filteredRawItems.length === 0) return fallbackWeeklyImplementation;

    const weekMap: Record<string, { totalScore: number; count: number }> = {
      "Week1": { totalScore: 0, count: 0 },
      "Week2": { totalScore: 0, count: 0 },
      "Week3": { totalScore: 0, count: 0 },
      "Week4": { totalScore: 0, count: 0 },
      "Week5": { totalScore: 0, count: 0 }
    };

    filteredRawItems.forEach((i) => {
      const wKey = `Week${i.weekStr || "1"}`;
      if (weekMap[wKey]) {
        weekMap[wKey].totalScore += i.scorePct;
        weekMap[wKey].count += 1;
      }
    });

    return Object.entries(weekMap).map(([week, d]) => ({
      week,
      retention: d.count > 0 ? Number((d.totalScore / d.count).toFixed(2)) : (fallbackWeeklyImplementation.find(f => f.week === week)?.retention || 0)
    }));
  }, [filteredRawItems]);

  const treatmentChartData = useMemo(() => {
    if (filteredRawItems.length === 0) return fallbackTreatmentData;

    const driverMap: Record<string, { sum: number; count: number }> = {};
    filteredRawItems.forEach((i) => {
      const key = i.id || i.driver;
      if (!driverMap[key]) driverMap[key] = { sum: 0, count: 0 };
      driverMap[key].sum += i.scorePct;
      driverMap[key].count += 1;
    });

    const drivers = Object.values(driverMap);
    const total = drivers.length || 1;
    let goodCount = 0;
    let nudgingCount = 0;
    let coachingCount = 0;
    let trainingCount = 0;

    drivers.forEach((d) => {
      const avgRet = d.sum / d.count;
      if (avgRet >= 85) goodCount++;
      else if (avgRet >= 70) nudgingCount++;
      else if (avgRet >= 50) coachingCount++;
      else trainingCount++;
    });

    return [
      { name: "Good Performance", val: Number(((goodCount / total) * 100).toFixed(2)), color: "#22c55e" },
      { name: "Nudging & Reminding", val: Number(((nudgingCount / total) * 100).toFixed(2)), color: "#3b82f6" },
      { name: "Coaching", val: Number(((coachingCount / total) * 100).toFixed(2)), color: "#eab308" },
      { name: "Training", val: Number(((trainingCount / total) * 100).toFixed(2)), color: "#ef4444" }
    ];
  }, [filteredRawItems]);

  const activitiesChartData = useMemo(() => {
    if (filteredRawItems.length === 0) return fallbackActivitiesData;

    const total = filteredRawItems.length;
    let mulai = 0, naik = 0, muat = 0, bongkar = 0, turun = 0, selesai = 0;

    filteredRawItems.forEach((i) => {
      if (i.mulaiTime) mulai++;
      if (i.naikTime) naik++;
      if (i.muatTime) muat++;
      if (i.bongkarTime) bongkar++;
      if (i.turunTime) turun++;
      if (i.selesaiTime) selesai++;
    });

    return [
      { name: "Mulai Penugasan", val: Number(((mulai / total) * 100).toFixed(2)) },
      { name: "Naik Container", val: Number(((naik / total) * 100).toFixed(2)) },
      { name: "Muat", val: Number(((muat / total) * 100).toFixed(2)) },
      { name: "Bongkar", val: Number(((bongkar / total) * 100).toFixed(2)) },
      { name: "Turun Container", val: Number(((turun / total) * 100).toFixed(2)) },
      { name: "Selesai Penugasan", val: Number(((selesai / total) * 100).toFixed(2)) }
    ];
  }, [filteredRawItems]);

  const treatmentTableRecords = useMemo(() => {
    if (filteredRawItems.length === 0) {
      if (selectedTreatmentFilter && selectedTreatmentFilter !== "Semua") {
        return fallbackTreatmentTable
          .filter((r) => r.treatment.toLowerCase() === selectedTreatmentFilter.toLowerCase())
          .sort((a, b) => b.jmlShipment - a.jmlShipment);
      }
      return fallbackTreatmentTable;
    }

    const driverMap: Record<string, { id: string; name: string; group: string; jmlShipment: number; totalScore: number }> = {};
    filteredRawItems.forEach((i) => {
      const key = i.id || i.driver;
      if (!driverMap[key]) {
        driverMap[key] = {
          id: i.id || key,
          name: `${i.id ? i.id + " - " : ""}${String(i.driver || "").toUpperCase()}`,
          group: i.group || "Yusen",
          jmlShipment: 0,
          totalScore: 0
        };
      }
      driverMap[key].jmlShipment += 1;
      driverMap[key].totalScore += i.scorePct;
    });

    const rows = Object.values(driverMap).map((d) => {
      const avgRet = Number((d.totalScore / d.jmlShipment).toFixed(2));
      let trt = "Good Performance";
      if (avgRet < 50) trt = "Training";
      else if (avgRet < 70) trt = "Coaching";
      else if (avgRet < 85) trt = "Nudging & Reminding";

      return {
        id: d.id,
        name: d.name,
        group: d.group,
        jmlShipment: d.jmlShipment,
        retention: avgRet,
        treatment: trt
      };
    });

    if (selectedTreatmentFilter && selectedTreatmentFilter !== "Semua") {
      return rows
        .filter((r) => r.treatment.toLowerCase() === selectedTreatmentFilter.toLowerCase())
        .sort((a, b) => b.jmlShipment - a.jmlShipment);
    }

    rows.sort((a, b) => a.retention - b.retention);
    return rows;
  }, [filteredRawItems, selectedTreatmentFilter]);

  // Dynamic filter dropdown options from live data
  const summaryYears = useMemo(() => {
    const set = new Set<string>(["2026", "2025", "2024"]);
    rawItems.forEach((i) => {
      if (i.yearStr && i.yearStr !== "#N/A") set.add(i.yearStr);
    });
    return Array.from(set).sort().reverse();
  }, [rawItems]);

  const summaryGroups = useMemo(() => {
    const set = new Set<string>(["Yusen", "BDP", "KALOG", "PDT Reguler"]);
    rawItems.forEach((i) => {
      if (i.group && i.group !== "#N/A" && i.group !== "-") set.add(i.group);
    });
    return Array.from(set).sort();
  }, [rawItems]);

  const dailyEntities = useMemo(() => {
    const set = new Set<string>(["PDT", "PETRA"]);
    dailyRecords.forEach((r) => {
      if (r.entity && r.entity !== "#N/A") set.add(r.entity);
    });
    return Array.from(set).sort();
  }, [dailyRecords]);

  const dailyGroups = useMemo(() => {
    const set = new Set<string>(["PDT Reguler", "Yusen", "BDP", "KALOG", "PETRA Reguler"]);
    dailyRecords.forEach((r) => {
      if (r.groupDriver && r.groupDriver !== "#N/A" && r.groupDriver !== "-") set.add(r.groupDriver);
    });
    return Array.from(set).sort();
  }, [dailyRecords]);

  // Filtered Daily Records
  const filteredDailyRecords = useMemo(() => {
    return dailyRecords.filter((rec) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rec.name.toLowerCase().includes(q) ||
        rec.nik.includes(q) ||
        rec.nopol.toLowerCase().includes(q) ||
        (rec.groupDriver && rec.groupDriver.toLowerCase().includes(q)) ||
        (rec.lastGpsLocation && rec.lastGpsLocation.toLowerCase().includes(q));

      const matchesStatus = selectedDailyStatus === "Semua" ? true : rec.status === selectedDailyStatus;
      const matchesEntity = selectedDailyEntity === "Semua" ? true : rec.entity === selectedDailyEntity;
      const matchesGroup = selectedDailyGroup === "Semua" ? true : rec.groupDriver === selectedDailyGroup;

      return matchesSearch && matchesStatus && matchesEntity && matchesGroup;
    });
  }, [dailyRecords, searchQuery, selectedDailyStatus, selectedDailyEntity, selectedDailyGroup]);

  // Paginated Daily Records
  const totalPages = Math.ceil(filteredDailyRecords.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedDailyRecords = filteredDailyRecords.slice(startIndex, startIndex + rowsPerPage);

  // Export Daily to Excel (.xlsx)
  const handleExportDailyExcel = () => {
    try {
      const headers = [
        "Tanggal", "NIK", "Nama Pengemudi", "No Polisi", "Entity", "Group Driver",
        "Jam Mulai", "Aktivitas Terakhir", "Tenko Online", "P2H Checklist", "Total Trip",
        "Lokasi Terakhir GPS", "Score Mobo", "Status"
      ];
      const rows = filteredDailyRecords.map((r) => [
        r.date || "-", r.nik || "-", r.name || "-", r.nopol || "-", r.entity || "PDT",
        r.groupDriver || "Umum", r.loginTime || "-", r.lastActivity || "-",
        `${r.tenkoResult || "-"} (${r.tenkoTime || "-"})`, r.p2hStatus || "-",
        `${r.tripCount} Trip`, r.lastGpsLocation || "-", `${r.complianceScore}%`, r.status || "-"
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      worksheet["!cols"] = [
        { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 24 },
        { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 32 },
        { wch: 14 }, { wch: 14 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Mobo Daily Log");
      XLSX.writeFile(workbook, `Mobo_Activity_Daily_${selectedDailyDate}.xlsx`);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const handleOpenPdfModal = (driverId: string, driverName: string, retentionPct = 84, treatmentLabel = "Coaching per 3 bln") => {
    const nik = driverId.split("-")[0]?.trim() || driverId;
    const nameOnly = driverName.includes(" - ") ? driverName.split(" - ")[1] : driverName;
    const riskCat = retentionPct < 50 ? "High Risk (< 50%)" : retentionPct < 70 ? "Medium Performance" : "Good Performance";

    setEvalModalDriver({
      nik: nik,
      name: `${nik} - ${nameOnly}`,
      project: `YSN7-Kontrak PT ${selectedGroupDriver === "Semua" ? "Yusen" : selectedGroupDriver}`,
      area: "Jakarta / Tanah Merdeka",
      period: `${selectedMonth === "Semua" ? "Agustus" : selectedMonth} ${selectedYear === "Semua" ? "2026" : selectedYear}`,
      riskCategory: riskCat,
      treatment: treatmentLabel,
      score: Math.round(retentionPct),
      aspects: [
        { period: "Each Case", indicator: "Leadtime Process Document Shipment", caseCount: 3, reducePoint: 6, feedback: "" },
        { period: "Monthly", indicator: "Effectiveness Tenko", caseCount: 95, reducePoint: 2, feedback: "" },
        { period: "Each Case", indicator: "Downtime - Driver Issue", caseCount: 3, reducePoint: 3, feedback: "" },
        { period: "Monthly", indicator: "Accident", caseCount: 1, reducePoint: 5, feedback: "" },
        { period: "Monthly", indicator: "Effectiveness Precheck", caseCount: 0, reducePoint: 0, feedback: "" }
      ]
    });
  };

  return (
    <div className="space-y-4">
      {/* Unified Light Header & Navigation Card matching HseDashboardPage & image_a7072be8.png */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ActivityIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Dashboard Monitoring Implementasi Aplikasi Mobo Activity
                </h2>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  · Live CDO Realtime
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evaluasi kepatuhan penggunaan aplikasi Mobo Activity & Kinerja Pengemudi PT Pancaran Logistics
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lastSyncTime && (
              <span className="text-[11px] text-slate-400 font-medium tabular-nums mr-1">
                Terakhir sinkron: {lastSyncTime}
              </span>
            )}
            <button
              onClick={() => {
                fetchDailyMoboData(true);
                fetchSummaryData(true);
              }}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Syncing..." : "Sync Sheet"}</span>
            </button>

            <a
              href="https://docs.google.com/spreadsheets/d/1cTLCFfLSKHkuNfkVtFp8d0_O_NcWz67HOazWFHUb3HM/edit?gid=262473085#gid=262473085"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-colors whitespace-nowrap"
            >
              <FileSpreadsheetIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Spreadsheet Google</span>
              <ExternalLinkIcon className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* 5 Top KPI Cards matching image_64815662.png */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Driver Login Mobo</span>
            <UserCheckIcon className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {dailySummaryKpi.driverLogin} <span className="text-xs font-normal text-slate-400">/ {dailySummaryKpi.totalDrivers}</span>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            {dailySummaryKpi.loginRate}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Penugasan (Trip)</span>
            <NavigationIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {dailySummaryKpi.totalTrips} <span className="text-xs font-normal text-slate-400">Shipment</span>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            Rute & SPK Terverifikasi
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Armada Beroperasi</span>
            <TruckIcon className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {dailySummaryKpi.p2hUnit} <span className="text-xs font-normal text-slate-400">Unit Nopol</span>
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
            {dailySummaryKpi.p2hDesc}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Log Aktivitas</span>
            <ActivityIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {dailySummaryKpi.totalActivities.toLocaleString("id-ID")}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
            Mulai, Muat, Bongkar, Parkir
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Compliance Rate</span>
            <ShieldCheckIcon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1.5 tabular-nums">
            {dailySummaryKpi.complianceRate}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {dailySummaryKpi.complianceDesc}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BAGIAN 1 (ATAS): DASHBOARD IMPLEMENTASI & TREATMENT       */}
      {/* ========================================================= */}
      <div className="space-y-4">
        {/* Section Title + Uniform White Filter Toolbar matching image_a7072be8.png & image_aeaac9be.png */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col gap-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700/70">
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Dashboard Implementasi, Retention & Evaluasi Treatment Mobo Activity
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              Filtered Data: <strong className="text-slate-800 dark:text-white">{filteredRawItems.length}</strong> records
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Years Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-400">Years:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer tabular-nums"
                >
                  {summaryYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                  <option value="Semua">Semua</option>
                </select>
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-400">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Bulan</option>
                  {[
                    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
                  ].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Entity Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-400">Entity:</span>
                <select
                  value={selectedEntity}
                  onChange={(e) => setSelectedEntity(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Entity</option>
                  <option value="PDT">PDT</option>
                  <option value="PETRA">PETRA</option>
                </select>
              </div>

              {/* Group Driver Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-400">Group Driver:</span>
                <select
                  value={selectedGroupDriver}
                  onChange={(e) => setSelectedGroupDriver(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer max-w-[160px]"
                >
                  <option value="Semua">Semua Group</option>
                  {summaryGroups.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {(selectedYear !== "2026" || selectedMonth !== "Agustus" || selectedEntity !== "PDT" || selectedGroupDriver !== "Yusen") && (
                <button
                  onClick={() => {
                    setSelectedYear("2026");
                    setSelectedMonth("Agustus");
                    setSelectedEntity("PDT");
                    setSelectedGroupDriver("Yusen");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 1: 4 Charts Side-by-Side Matching image_aeaac9be.png */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-stretch">
          {/* 1. Retention vs Entity */}
          <div className="xl:col-span-2 min-w-0 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Retention vs Entity
              </h3>
            </div>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={retentionVsEntityData} margin={{ top: 18, right: 8, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="entity" tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }} />
                  <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(val: number) => [`${val}%`, "Retention"]} />
                  <Bar dataKey="retention" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={48} isAnimationActive={false}>
                    <LabelList
                      dataKey="retention"
                      content={(props: any) => {
                        const { x, y, width, value } = props;
                        if (x === undefined || y === undefined) return null;
                        const num = Number(value || 0);
                        const inside = num >= 20;
                        return (
                          <text
                            x={x + width / 2}
                            y={inside ? y + 14 : y - 5}
                            fill={inside ? "#ffffff" : "#1e3a8a"}
                            textAnchor="middle"
                            fontSize={10}
                            fontWeight="bold"
                          >
                            {num}%
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Customer vs Retention */}
          <div className="xl:col-span-3 min-w-0 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Customer vs Retention
              </h3>
            </div>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerVsRetentionData} margin={{ top: 18, right: 8, left: -22, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 8, fill: "#475569" }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tickFormatter={(val: string) => (val.length > 16 ? `${val.slice(0, 15)}…` : val)}
                  />
                  <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(val: number) => [`${val}%`, "Retention"]} />
                  <Bar dataKey="retention" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false}>
                    <LabelList
                      dataKey="retention"
                      content={(props: any) => {
                        const { x, y, width, value } = props;
                        if (x === undefined || y === undefined) return null;
                        const num = Number(value || 0);
                        const inside = num >= 20;
                        return (
                          <text
                            x={x + width / 2}
                            y={inside ? y + 13 : y - 5}
                            fill={inside ? "#ffffff" : "#1e3a8a"}
                            textAnchor="middle"
                            fontSize={9}
                            fontWeight="bold"
                          >
                            {num}%
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Shipment vs Retention */}
          <div className="xl:col-span-4 min-w-0 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Shipment vs Retention
              </h3>
              <div className="flex items-center gap-2.5 text-[10px] font-semibold text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-blue-500" /> Shipment
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-red-500" /> Retention
                </span>
              </div>
            </div>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={shipmentVsRetentionData} margin={{ top: 20, right: 6, left: -20, bottom: 26 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 8, fill: "#475569" }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis yAxisId="left" domain={[0, "auto"]} tick={{ fontSize: 8, fill: "#64748b" }} hide />
                  <YAxis yAxisId="right" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 8, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(val: any, name: string) =>
                      name === "Retention %" ? [formatPctComma(val, 1), name] : [val, name]
                    }
                  />
                  <Bar yAxisId="left" dataKey="shipment" fill="#3b82f6" name="Total Shipment" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="shipment" position="top" style={{ fontSize: "8px", fontWeight: "bold", fill: "#1d4ed8" }} isAnimationActive={false} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="retention" stroke="#ef4444" strokeWidth={2} dot={{ r: 2.5, fill: "#ef4444" }} name="Retention %" isAnimationActive={false}>
                    <LabelList
                      dataKey="retention"
                      position="bottom"
                      formatter={(v: number) => (v > 0 ? formatPctComma(v, 1) : "")}
                      style={{ fontSize: "7.5px", fontWeight: "bold", fill: "#dc2626" }}
                      isAnimationActive={false}
                    />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Implementation Per Weeks */}
          <div className="xl:col-span-3 min-w-0 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Implementation Per Weeks
              </h3>
            </div>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyImplementationData} margin={{ top: 22, right: 16, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#475569", fontWeight: 600 }} />
                  <YAxis width={48} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 8.5, fill: "#64748b" }} tickFormatter={(v) => formatPctComma(v, 2)} />
                  <Tooltip formatter={(val: number) => [formatPctComma(val, 2), "Retention"]} />
                  <Line
                    type="linear"
                    dataKey="retention"
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 4, fill: "#16a34a", strokeWidth: 1.5, stroke: "#ffffff" }}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="retention"
                      position="top"
                      formatter={(v: number) => formatPctComma(v, 2)}
                      style={{ fontSize: "8.5px", fontWeight: "bold", fill: "#15803d" }}
                      isAnimationActive={false}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 2: Treatment & Activities Matching image_aeaac9be.png & image_a7072be8.png */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* 5. Treatment Horizontal Bar */}
          <div className="lg:col-span-7 min-w-0 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Treatment
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                Distribusi kategori tindak lanjut pengemudi
              </span>
            </div>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={treatmentChartData} layout="vertical" margin={{ top: 8, right: 45, left: 8, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v) => formatPctComma(v, 2)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9.5, fill: "#475569", fontWeight: 600 }} width={125} />
                  <Tooltip formatter={(val: number) => [formatPctComma(val, 2), "Percentage"]} />
                  <Bar dataKey="val" radius={[0, 4, 4, 0]} barSize={28} isAnimationActive={false}>
                    {treatmentChartData.map((entry, idx) => (
                      <Cell key={`cell-trt-${idx}`} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="val"
                      content={(props: any) => {
                        const { x, y, width, height, value } = props;
                        if (x === undefined || y === undefined) return null;
                        const num = Number(value || 0);
                        const inside = width > 52;
                        return (
                          <text
                            x={inside ? x + width - 8 : x + width + 6}
                            y={y + height / 2 + 3.5}
                            fill={inside ? "#ffffff" : "#334155"}
                            textAnchor={inside ? "end" : "start"}
                            fontSize={9.5}
                            fontWeight="bold"
                          >
                            {formatPctComma(num, 2)}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6. Activities Vertical Bar */}
          <div className="lg:col-span-5 min-w-0 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Activities
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                Persentase kelengkapan 6 tahapan Mobo
              </span>
            </div>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activitiesChartData} margin={{ top: 18, right: 12, left: 0, bottom: 26 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 8.5, fill: "#475569" }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                  />
                  <YAxis width={48} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 8.5, fill: "#64748b" }} tickFormatter={(v) => formatPctComma(v, 2)} />
                  <Tooltip formatter={(val: number) => [formatPctComma(val, 2), "Activity Rate"]} />
                  <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                    <LabelList
                      dataKey="val"
                      content={(props: any) => {
                        const { x, y, width, value } = props;
                        if (x === undefined || y === undefined) return null;
                        const num = Number(value || 0);
                        const inside = num >= 20;
                        return (
                          <text
                            x={x + width / 2}
                            y={inside ? y + 13 : y - 5}
                            fill={inside ? "#ffffff" : "#1e40af"}
                            textAnchor="middle"
                            fontSize={8.5}
                            fontWeight="bold"
                          >
                            {formatPctComma(num, 2)}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detail Treatment Table Section matching image_f7c9dc5a.png */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <LayersIcon className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Detail Treatment {selectedTreatmentFilter === "Training" ? "(Retention < 50% / Training)" : `— ${selectedTreatmentFilter}`} ({treatmentTableRecords.length} Drivers)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Treatment:</span>
              <select
                value={selectedTreatmentFilter}
                onChange={(e) => setSelectedTreatmentFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
              >
                <option value="Training">Training (&lt; 50%)</option>
                <option value="Coaching">Coaching (50% - 69%)</option>
                <option value="Nudging & Reminding">Nudging &amp; Reminding (70% - 84%)</option>
                <option value="Good Performance">Good Performance (&ge; 85%)</option>
                <option value="Semua">Semua Treatment</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-white sticky top-0 font-bold">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3 text-center">Group</th>
                  <th className="py-2.5 px-3 text-center">Jml Shipment</th>
                  <th className="py-2.5 px-3 text-center">Retention</th>
                  <th className="py-2.5 px-3 text-center">Treatment</th>
                  <th className="py-2.5 px-3 text-center">Action / PDF Rapor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {treatmentTableRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      Tidak ada driver yang membutuhkan treatment ini.
                    </td>
                  </tr>
                ) : (
                  treatmentTableRecords.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                        {row.id}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {row.name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]">
                          {row.group}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                        {row.jmlShipment}
                      </td>
                      <td className={`py-2.5 px-3 text-center font-black tabular-nums ${row.retention < 50 ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"}`}>
                        {formatPctComma(row.retention, 2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.treatment === "Training"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              : row.treatment === "Coaching"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : row.treatment === "Nudging & Reminding"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {row.treatment}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleOpenPdfModal(row.id, row.name, row.retention, row.treatment)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                        >
                          <ExternalLinkIcon className="w-3.5 h-3.5" />
                          <span>Rapor PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Menampilkan <strong>{treatmentTableRecords.length}</strong> driver berdasarkan filter {selectedTreatmentFilter}</span>
            <span className="tabular-nums">Total Record Terverifikasi: <strong className="text-slate-700 dark:text-slate-200">{filteredRawItems.length}</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BAGIAN 2 (BAWAH): MONITORING MOBO ACTIVITY HARIAN (DAILY) */}
      {/* ========================================================= */}
      <div className="space-y-4 pt-2">
        {/* Daily Section Title + Filters Bar matching image_a7072be8.png */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col gap-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700/70">
            <div className="flex items-center gap-2">
              <SmartphoneIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Monitoring Mobo Activity Harian (Fokus Hari Ini)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              Menampilkan <strong className="text-slate-800 dark:text-white">{filteredDailyRecords.length}</strong> driver aktif/terdaftar
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Date Picker */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-600 dark:text-slate-300">Tanggal:</span>
                <input
                  type="date"
                  value={selectedDailyDate}
                  onChange={(e) => {
                    setSelectedDailyDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-xs font-semibold outline-none cursor-pointer tabular-nums"
                />
              </div>

              {/* Entity Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-400">Entity:</span>
                <select
                  value={selectedDailyEntity}
                  onChange={(e) => {
                    setSelectedDailyEntity(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Entity</option>
                  {dailyEntities.map((ent) => (
                    <option key={ent} value={ent}>{ent}</option>
                  ))}
                </select>
              </div>

              {/* Group Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-400">Group:</span>
                <select
                  value={selectedDailyGroup}
                  onChange={(e) => {
                    setSelectedDailyGroup(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer max-w-[140px]"
                >
                  <option value="Semua">Semua Group</option>
                  {dailyGroups.map((grp) => (
                    <option key={grp} value={grp}>{grp}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/70 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                {["Semua", "Aktif Berjalan", "Selesai", "Offline"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setSelectedDailyStatus(st);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedDailyStatus === st
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search & Export */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari Driver, NIK, Nopol..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-blue-500 w-44 sm:w-48"
                />
              </div>

              <button
                onClick={handleExportDailyExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Daily Visual Activity Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Real Activity Type Breakdown */}
          <div className="lg:col-span-7 min-w-0 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <BoxIcon className="w-3.5 h-3.5 text-blue-600" />
                  Distribusi Tipe Aktivitas Mobo CDO (Hari Ini)
                </h3>
                <p className="text-[10px] text-slate-400">
                  Frekuensi log aktivitas operasional pengemudi yang tercatat pada sistem
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 tabular-nums">
                {dailySummaryKpi.totalActivities} Total Event
              </span>
            </div>

            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityDistribution} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: "#64748b" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(val: number) => [`${val.toLocaleString("id-ID")} kali`, "Total Aktivitas"]}
                    contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                  />
                  <Bar dataKey="count" name="Jumlah Aktivitas" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {activityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ACTIVITY_COLORS[entry.name] || "#3b82f6"} />
                    ))}
                    <LabelList dataKey="count" position="top" style={{ fontSize: "9px", fontWeight: "bold", fill: "#1e3a8a" }} isAnimationActive={false} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trend Kepatuhan Mobo 7 Hari Terakhir */}
          <div className="lg:col-span-5 min-w-0 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Trend Kepatuhan Mobo (7 Hari)
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600" /> Login
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Tenko
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">
                Persentase login tepat waktu dan verifikasi Tenko fisik harian
              </p>
            </div>

            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyMoboTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="blueGradientMobo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="greenGradientMobo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} />
                  <YAxis domain={[75, 100]} ticks={[75, 82, 89, 96, 100]} tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(val: number) => [`${val}%`, ""]} />
                  <Area type="monotone" dataKey="loginRate" stroke="#2563eb" strokeWidth={2} fill="url(#blueGradientMobo)" name="Login Rate" isAnimationActive={false} />
                  <Area type="monotone" dataKey="tenkoRate" stroke="#10b981" strokeWidth={2} fill="url(#greenGradientMobo)" name="Tenko Online" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Daily Log Driver Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <LayersIcon className="w-4 h-4 text-blue-600" />
              Data Log Aktivitas Pengemudi ({filteredDailyRecords.length} Driver)
            </h3>
            <span className="text-xs font-medium text-slate-400 tabular-nums">
              Tanggal: <strong className="text-slate-600 dark:text-slate-300">{selectedDailyDate}</strong>
            </span>
          </div>

          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-white sticky top-0 font-bold">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Pengemudi (NIK - Nama)</th>
                  <th className="py-2.5 px-2.5 text-center">No. Polisi</th>
                  <th className="py-2.5 px-2.5 text-center">Entity / Group</th>
                  <th className="py-2.5 px-2.5 text-center">Jam Mulai</th>
                  <th className="py-2.5 px-3">Aktivitas Terakhir</th>
                  <th className="py-2.5 px-2.5 text-center">Penugasan (Trip)</th>
                  <th className="py-2.5 px-3">Lokasi Terakhir / GPS</th>
                  <th className="py-2.5 px-2.5 text-center">Score Mobo</th>
                  <th className="py-2.5 px-2.5 text-center">Status</th>
                  <th className="py-2.5 px-2.5 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {paginatedDailyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                      Tidak ada data log aktivitas Mobo yang cocok dengan pencarian / filter.
                    </td>
                  </tr>
                ) : (
                  paginatedDailyRecords.map((driver, idx) => (
                    <tr key={driver.id || idx} className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-400 tabular-nums">
                        {startIndex + idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        <div>{driver.name}</div>
                        <div className="text-[10px] font-normal text-slate-400">NIK: {driver.nik}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-semibold text-slate-700 dark:text-slate-200">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-[11px] font-mono border border-slate-200 dark:border-slate-700">
                          {driver.nopol}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {driver.entity || "PDT"}
                          </span>
                          <span className="text-[9px] text-slate-400 truncate max-w-[100px]">
                            {driver.groupDriver || "Umum"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                        {driver.loginTime}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {driver.lastActivity || "-"}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
                          {driver.tripCount} Trip
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1 text-[11px] truncate max-w-[190px]">
                          <MapPinIcon className="w-3 h-3 text-red-500 shrink-0" />
                          <span className="truncate">{driver.lastGpsLocation}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-black tabular-nums">
                        <span className={driver.complianceScore >= 90 ? "text-emerald-600" : "text-blue-600"}>
                          {driver.complianceScore}%
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            driver.status === "Aktif Berjalan"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : driver.status === "Selesai"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {driver.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <button
                          onClick={() => setSelectedDriverDetail(driver)}
                          className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:hover:bg-blue-800 dark:text-blue-300 font-bold text-[11px] transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                        >
                          Timeline ({driver.timeline?.length || 0})
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="text-slate-500">
              Menampilkan <strong>{filteredDailyRecords.length > 0 ? startIndex + 1 : 0}</strong> - <strong>{Math.min(startIndex + rowsPerPage, filteredDailyRecords.length)}</strong> dari <strong>{filteredDailyRecords.length}</strong> Driver
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="px-2 font-bold tabular-nums">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DRIVER DAILY TIMELINE MODAL */}
      {selectedDriverDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 text-blue-600" />
                  Timeline Log Aktivitas Mobo CDO
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDriverDetail.name} (NIK: {selectedDriverDetail.nik}) • Unit: {selectedDriverDetail.nopol} • {selectedDriverDetail.groupDriver}
                </p>
              </div>
              <button
                onClick={() => setSelectedDriverDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-xs px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="space-y-3 py-1 overflow-y-auto flex-1 pr-1">
              {selectedDriverDetail.timeline && selectedDriverDetail.timeline.length > 0 ? (
                selectedDriverDetail.timeline.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-20 text-slate-500 font-mono font-bold shrink-0 text-[11px]">
                      {step.time}
                    </div>
                    <div className="mt-1 w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 ring-4 ring-blue-100 dark:ring-blue-950" />
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-100 text-blue-800 border-blue-200">
                          {step.event}
                        </span>
                        {step.shipno && (
                          <span className="text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            SPK: {step.shipno}
                          </span>
                        )}
                      </div>
                      {step.location && step.location !== "-" && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 pt-0.5">
                          <MapPinIcon className="w-3 h-3 text-red-500 shrink-0" />
                          <span className="font-medium">{step.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 italic text-xs">
                  Tidak ada catatan log aktivitas rinci untuk driver ini.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500 font-medium">
                Total Penugasan: <strong className="text-slate-800 dark:text-white">{selectedDriverDetail.tripCount} Trip</strong>
              </span>
              <button
                onClick={() => setSelectedDriverDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold cursor-pointer hover:bg-blue-700 transition-colors shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVER PERFORMANCE EVALUATION PDF REPORT MODAL */}
      {evalModalDriver && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-black text-sm">
                <FileTextIcon className="w-5 h-5 text-blue-600" />
                <span>DRIVER PERFORMANCE EVALUATION (Operator & Partner Control)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <PrinterIcon className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
                <button
                  onClick={() => setEvalModalDriver(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-white text-slate-900 p-6 rounded-xl border border-slate-300 space-y-6 shadow-sm font-sans" id="driver-pdf-report">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-sky-500 rounded-lg flex items-center justify-center font-black text-white text-xl tracking-tighter">
                    P
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">PANCARAN LOGISTIC</h1>
                    <p className="text-xs font-bold text-slate-500">PT. PANCARAN DARAT TRANSPORT / PETRA</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-black text-slate-900 uppercase">DRIVER PERFORMANCE EVALUATION</h2>
                  <p className="text-xs font-semibold text-slate-600">Operator & Partner Control</p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-8 space-y-1.5 text-xs">
                  <div className="grid grid-cols-12">
                    <span className="col-span-3 font-bold text-slate-600">No ID:</span>
                    <span className="col-span-9 font-bold text-slate-900">{evalModalDriver.nik}</span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-3 font-bold text-slate-600">Name:</span>
                    <span className="col-span-9 font-bold text-slate-900">{evalModalDriver.name}</span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-3 font-bold text-slate-600">Project Name:</span>
                    <span className="col-span-9 font-bold text-slate-900">{evalModalDriver.project}</span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-3 font-bold text-slate-600">Area / Site:</span>
                    <span className="col-span-9 font-bold text-slate-900">{evalModalDriver.area}</span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-3 font-bold text-slate-600">Period:</span>
                    <span className="col-span-9 font-bold text-slate-900">{evalModalDriver.period}</span>
                  </div>
                  <div className="grid grid-cols-12 pt-1 border-t border-slate-200">
                    <span className="col-span-3 font-bold text-slate-600">Risk Category:</span>
                    <span className="col-span-9 font-bold text-amber-700">{evalModalDriver.riskCategory}</span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-3 font-bold text-slate-600">Treatment:</span>
                    <span className="col-span-9 font-bold text-blue-700">{evalModalDriver.treatment}</span>
                  </div>
                </div>

                <div className="col-span-4 bg-slate-50 p-4 rounded-xl border-2 border-slate-900 text-center space-y-1">
                  <div className="text-xs font-bold text-slate-700 uppercase">Score</div>
                  <div className="text-5xl font-black text-slate-900 tracking-tight">{evalModalDriver.score}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-800 text-center">
                  PERFORMANCE EVALUATION ASPECT
                </h3>
                <div className="overflow-x-auto border border-slate-900 rounded-lg">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="py-2 px-3 border-r border-slate-700 text-center w-28">Period Assessment</th>
                        <th className="py-2 px-3 border-r border-slate-700">Leading Indicator</th>
                        <th className="py-2 px-3 border-r border-slate-700 text-center w-16">Case</th>
                        <th className="py-2 px-3 border-r border-slate-700 text-center w-24">Reduce Point</th>
                        <th className="py-2 px-3 text-center">Feedback / Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {evalModalDriver.aspects.map((asp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 border-r border-slate-300 text-center font-semibold text-slate-700">{asp.period}</td>
                          <td className="py-2.5 px-3 border-r border-slate-300 font-bold text-slate-900">{asp.indicator}</td>
                          <td className="py-2.5 px-3 border-r border-slate-300 text-center font-bold text-slate-800">{asp.caseCount}</td>
                          <td className="py-2.5 px-3 border-r border-slate-300 text-center font-black text-rose-600">{asp.reducePoint}</td>
                          <td className="py-2.5 px-3 text-slate-500 italic">{asp.feedback || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs font-bold border-t border-slate-300">
                <div>
                  <div className="text-slate-500 mb-12">Evaluated By</div>
                  <div className="border-b border-slate-900 pb-1">HSE & Operations Control</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-12">Approved By</div>
                  <div className="border-b border-slate-900 pb-1">Fleet / Project Manager</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-12">Driver Signature</div>
                  <div className="border-b border-slate-900 pb-1">{evalModalDriver.name}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setEvalModalDriver(null)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>Print & Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
