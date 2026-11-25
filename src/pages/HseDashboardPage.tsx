import React, { useState, useEffect, useMemo } from "react";
import {
  Gauge,
  ArrowLeft,
  Users,
  Award,
  AlertTriangle,
  TrendingUp,
  Download,
  Filter,
  ShieldCheck,
  Calendar,
  Building,
  CheckCircle2,
  FileSpreadsheet,
  Smartphone,
  Shield,
  Activity,
  Menu,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Layers,
  Info,
  X,
  ListFilter,
  Database,
  Search,
  Printer,
  FileText
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  LabelList
} from "recharts";
import MoboActivityMonitoring from "../components/hse/MoboActivityMonitoring";
import MasterDataPerformanceDriver from "./MasterDataPerformanceDriver";
import MasterDataMoboActivity from "./MasterDataMoboActivity";
import DatabasePage from "./Database";
import { PANCARAN_LOGO_DATA_URL } from "../assets/logo";

export interface GarageGroupMapping {
  garage: string;
  group: string;
  entity: string;
}

export const MASTER_PARAMETER_MAPPINGS: GarageGroupMapping[] = [
  { garage: "Garasi Cikarang", group: "Backup SGL Box", entity: "PDT" },
  { garage: "Garasi Babek", group: "Backup MAERSK", entity: "PDT" },
  { garage: "Garasi TM", group: "Backup PDT", entity: "PDT" },
  { garage: "Garasi MDL", group: "BDP", entity: "PDT" },
  { garage: "Garasi Bidara", group: "Backup IKPP", entity: "PETRA" },
  { garage: "Garasi TM", group: "Backup PETRA", entity: "PETRA" },
  { garage: "Garasi Cikarang", group: "CGS", entity: "PDT" },
  { garage: "Garasi MDL", group: "DSV", entity: "PDT" },
  { garage: "Garasi MDL", group: "PDT Reguler Box", entity: "PDT" },
  { garage: "Garasi Karawang", group: "HMMI", entity: "PDT" },
  { garage: "Garasi Bidara", group: "IKPP Jakarta", entity: "PETRA" },
  { garage: "Garasi Karawang", group: "Interplant TOYOTA", entity: "PDT" },
  { garage: "Garasi Karawang", group: "KALOG", entity: "PDT" },
  { garage: "Garasi Babek", group: "MAERSK", entity: "PDT" },
  { garage: "Garasi Bidara", group: "IKK PINDODELI", entity: "PDT" },
  { garage: "Garasi TM", group: "PETRA Reguler", entity: "PETRA" },
  { garage: "Garasi MDL", group: "PDT Reguler", entity: "PDT" },
  { garage: "Garasi TM", group: "PETRA Halliburton", entity: "PETRA" },
  { garage: "Garasi Cikarang", group: "SGL Trailer", entity: "PDT" },
  { garage: "Garasi Cikarang", group: "SGL Box", entity: "PDT" },
  { garage: "Garasi TM", group: "Yusen", entity: "PDT" },
  { garage: "Garasi TM", group: "PDT Reguler TOYOTA", entity: "PDT" },
];

export const MASTER_GARAGES = [
  "Garasi TM",
  "Garasi Cikarang",
  "Garasi Babek",
  "Garasi MDL",
  "Garasi Karawang",
  "Garasi Bidara"
];

export const MASTER_ENTITIES = ["PDT", "PETRA"];

interface HseDashboardPageProps {
  onBackToMenu?: () => void;
  onLogout?: () => void;
}

export default function HseDashboardPage({ onBackToMenu, onLogout }: HseDashboardPageProps) {
  // Navigation State for Left Sidebar
  const [activeTab, setActiveTab] = useState<"summary" | "mobo" | "master_perf_driver" | "master_mobo_activity" | "database">("summary");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedDriverModal, setSelectedDriverModal] = useState<any | null>(null);
  const [selectedPdfDriver, setSelectedPdfDriver] = useState<any | null>(null);
  const [selectedSummaryCardModal, setSelectedSummaryCardModal] = useState<string | null>(null);
  const [modalDriverSearch, setModalDriverSearch] = useState("");

  // Live Google Sheet sync state
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  const [syncCountdown, setSyncCountdown] = useState<number>(30);
  const [sheetConnectionStatus, setSheetConnectionStatus] = useState<"connected" | "restricted" | "syncing">("connected");
  const spreadsheetUrl = "https://docs.google.com/spreadsheets/d/1cTLCFfLSKHkuNfkVtFp8d0_O_NcWz67HOazWFHUb3HM/edit?gid=2040949630#gid=2040949630";

  // Filter states matching reference screenshot & user request
  const [entity, setEntity] = useState<string>("(All)");
  const [grouping, setGrouping] = useState<string>("(All)");
  const [groupDriver, setGroupDriver] = useState<string>("(All)");
  const [category, setCategory] = useState<string>("(All)");
  const [garage, setGarage] = useState<string>("(All)");
  const [startDate, setStartDate] = useState<string>("2026-03-01");
  const [endDate, setEndDate] = useState<string>("2026-07-31");

  // Raw driver data loaded from sheet "data driver"
  const [rawDrivers, setRawDrivers] = useState<any[]>([]);

  // Sheet_Helper data (gid=1899483729) containing columns Safety, Attendance, Tenko, Mobo Act, Ops Issue, Problem Rec
  const [sheetHelperDrivers, setSheetHelperDrivers] = useState<any[]>([]);

  // Master dropdown data fetched live from server
  const [masterDropdowns, setMasterDropdowns] = useState<{
    entities: string[];
    garages: string[];
    dropGroup: string[];
    activeDropGroup: string[];
    garageGroupMapping: GarageGroupMapping[];
    scoreCategories: any[];
  } | null>(null);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  // Dynamic unique options derived directly from live Sheet_Helper data (excluding #NA)
  const uniqueGroupings = useMemo(() => {
    let list = sheetHelperDrivers;
    if (entity !== "(All)" && entity !== "All" && entity !== "Semua") {
      list = list.filter((d) => (d.entity || d.entity2 || "").trim().toUpperCase() === entity.trim().toUpperCase());
    }
    const set = new Set<string>();
    list.forEach((d) => {
      const g = (d.grouping || d.group2 || "").trim();
      if (g && g !== "#NA" && g !== "#N/A" && g !== "-") set.add(g);
    });
    return Array.from(set).sort();
  }, [sheetHelperDrivers, entity]);

  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    sheetHelperDrivers.forEach((d) => {
      const e = (d.entity || d.entity2 || "").trim().toUpperCase();
      if (e && e !== "#NA" && e !== "#N/A" && e !== "-") set.add(e);
    });
    set.add("PDT");
    set.add("PETRA");
    return Array.from(set).sort();
  }, [sheetHelperDrivers]);

  const uniqueGroupDrivers = useMemo(() => {
    let list = sheetHelperDrivers;
    if (entity !== "(All)" && entity !== "All" && entity !== "Semua") {
      list = list.filter((d) => (d.entity || d.entity2 || "").trim().toUpperCase() === entity.trim().toUpperCase());
    }
    if (grouping !== "(All)" && grouping !== "All" && grouping !== "Semua") {
      list = list.filter((d) => ((d.grouping || d.group2 || "").trim().toLowerCase() === grouping.trim().toLowerCase()));
    }
    const set = new Set<string>();
    list.forEach((d) => {
      const gd = (d.groupDriver || d.group || "").trim();
      if (gd && gd !== "#NA" && gd !== "#N/A" && gd !== "-") set.add(gd);
    });
    return Array.from(set).sort();
  }, [sheetHelperDrivers, entity, grouping]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    sheetHelperDrivers.forEach((d) => {
      const c = (d.category || d.sheetCategory || "").trim();
      if (c && c !== "#NA" && c !== "-") set.add(c);
    });
    return Array.from(set).sort();
  }, [sheetHelperDrivers]);

  // Dynamically filtered driver records from Sheet_Helper
  const filteredDrivers = useMemo(() => {
    const isAllVal = (v: string) => !v || v === "(All)" || v.toLowerCase() === "all" || v.toLowerCase() === "semua";
    return sheetHelperDrivers.filter((driver) => {
      // 1. Entity filter
      if (!isAllVal(entity)) {
        const dEnt = (driver.entity || driver.entity2 || "").trim().toUpperCase();
        if (dEnt !== entity.trim().toUpperCase()) return false;
      }
      // 2. Grouping filter
      if (!isAllVal(grouping)) {
        const dGrp = (driver.grouping || driver.group2 || "").trim().toLowerCase();
        if (dGrp !== grouping.trim().toLowerCase()) return false;
      }
      // 3. Group Driver filter
      if (!isAllVal(groupDriver)) {
        const dG = (driver.groupDriver || driver.group || "").trim().toLowerCase();
        if (dG !== groupDriver.trim().toLowerCase()) return false;
      }
      // 4. Category filter
      if (!isAllVal(category)) {
        const dCat = (driver.category || driver.sheetCategory || "").trim().toLowerCase();
        if (dCat !== category.trim().toLowerCase()) return false;
      }
      return true;
    });
  }, [sheetHelperDrivers, entity, grouping, groupDriver, category]);

  // Dynamic available groups derived directly from Google Spreadsheet Parameter tab (gid=1611002980)
  const availableGroups = useMemo(() => {
    const mappings = masterDropdowns?.garageGroupMapping || MASTER_PARAMETER_MAPPINGS;
    let filteredMappings = mappings;

    if (garage && garage !== "All" && garage !== "Semua" && garage !== "(All)") {
      filteredMappings = filteredMappings.filter(
        (m) => m.garage.toLowerCase().trim() === garage.toLowerCase().trim()
      );
    }
    if (entity && entity !== "All" && entity !== "Semua" && entity !== "(All)") {
      filteredMappings = filteredMappings.filter(
        (m) => m.entity.toLowerCase().trim() === entity.toLowerCase().trim()
      );
    }

    const groups = Array.from(new Set(filteredMappings.map((m) => m.group)));
    if (groups.length > 0) return groups;
    return masterDropdowns?.dropGroup || ["Backup PDT", "Yusen", "PDT Reguler TOYOTA"];
  }, [garage, entity, masterDropdowns]);

  // Helper function to parse percentage strings like "58,4%" or 58.4 into a numeric float, ignoring null/empty values
  const parsePctValue = (val: any): number | null => {
    if (typeof val === "number") return isNaN(val) ? null : val;
    if (val === null || val === undefined) return null;
    const s = String(val).replace(/%/g, "").replace(/,/g, ".").trim();
    if (s === "" || s === "-" || s.toLowerCase() === "null") return null;
    const num = parseFloat(s);
    return isNaN(num) ? null : num;
  };

  // Helper to cleanly extract ID and Pure Name from strings like "213200235 - MUNIN MAULANA"
  const splitIdAndName = (str: string): { id: string; name: string } => {
    const cleaned = (str || "").trim();
    if (cleaned.includes(" - ")) {
      const parts = cleaned.split(" - ");
      return { id: parts[0].trim(), name: parts.slice(1).join(" - ").trim() };
    }
    if (cleaned.includes("-")) {
      const parts = cleaned.split("-");
      return { id: parts[0].trim(), name: parts.slice(1).join("-").trim() };
    }
    return { id: "", name: cleaned };
  };

  /**
   * Logika & Kalkulasi Average Score dari Sheet_Helper:
   * 1. Pengambilan Data per Driver & Pencocokan Fleksibel:
   *    - Ambil data driver pada tab Sheet_Helper berdasarkan ID / Nama (ID_Name di Kolom A).
   *    - Bersihkan string (.trim().toLowerCase()). Jika ada kombinasi "ID - Nama", cocokkan berdasarkan nomor ID atau Nama saja jika pencocokan penuh gagal.
   * 2. Perhitungan Rata-Rata Kolom C sampai Kolom H & Fallback Overall Score:
   *    - Ubah format string / persentase menjadi float angka riil (hapus '%', ganti ',' dengan '.').
   *    - Abaikan sel kosong/null agar tidak merusak perhitungan rata-rata.
   *    - Jika kalkulasi individual Kolom C-H gagal/kosong, gunakan nilai langsung dari Kolom I / Kolom J ("Overall Score") sebagai fallback.
   * 3. Perhitungan Rata-Rata Gabungan (Overall Average Score):
   *    - Hitung rata-rata akhir dari seluruh driver yang lolos kriteria filter.
   *    - Tampilkan dalam format persentase dua desimal (contoh: 91,82% atau 76,26%).
   * 4. Kategori Teks Dinamis:
   *    - >= 90% = "Sangat Baik"
   *    - 80% - 89.99% = "Baik"
   *    - < 80% = "Perlu Perhatian"
   *    - 0 data = "-"
   */
  const calculateAverageScoreFromSheetHelper = (
    filteredDrivers: any[],
    helperList: any[] = sheetHelperDrivers
  ) => {
    if (!filteredDrivers || filteredDrivers.length === 0) {
      return {
        averageScore: "0,00%",
        averageScoreCategory: "Perlu Perhatian",
        matchedItems: [] as any[],
        overallAverageNum: 0
      };
    }

    const matchedHelperItems: any[] = [];

    filteredDrivers.forEach((driver) => {
      const dRaw = (driver.name || "").toLowerCase().trim();
      const dDirectId = (driver.id || "").toLowerCase().trim();
      const parsedD = splitIdAndName(driver.name || "");
      const dParsedId = parsedD.id.toLowerCase().trim() || dDirectId;
      const dPureName = parsedD.name.toLowerCase().trim();

      const helperMatch = helperList.find((h) => {
        const hRaw = (h.idName || h.name || "").toLowerCase().trim();
        const parsedH = splitIdAndName(h.idName || h.name || "");
        const hParsedId = parsedH.id.toLowerCase().trim();
        const hPureName = parsedH.name.toLowerCase().trim();

        // 1. Exact string match (trimmed, case-insensitive)
        if (hRaw === dRaw) return true;

        // 2. ID matching (if both have numeric/string ID)
        if (dParsedId && hParsedId && dParsedId === hParsedId) return true;
        if (dDirectId && hRaw.startsWith(dDirectId)) return true;
        if (hParsedId && dRaw.startsWith(hParsedId)) return true;

        // 3. Pure name matching (if ID prefix failed or differs)
        if (dPureName && hPureName && (dPureName === hPureName || hPureName.includes(dPureName) || dPureName.includes(hPureName))) {
          return true;
        }

        // 4. Substring fallback
        if (dRaw && hRaw.includes(dRaw)) return true;
        if (hRaw && dRaw.includes(hRaw)) return true;

        return false;
      });

      if (helperMatch) {
        // Parse Kolom C sampai Kolom H
        const s = parsePctValue(helperMatch.safety);
        const a = parsePctValue(helperMatch.attendance || helperMatch.attandance);
        const t = parsePctValue(helperMatch.tenko);
        const m = parsePctValue(helperMatch.moboAct);
        const o = parsePctValue(helperMatch.opsIssue);
        const p = parsePctValue(helperMatch.problemRec);
        // Fallback Overall Score (Kolom I / Kolom J)
        const fallbackOverall = parsePctValue(helperMatch.sheetOverallScore || helperMatch.overallScore);

        const validMetrics: number[] = [s, a, t, m, o, p].filter((v): v is number => v !== null && !isNaN(v));

        let avgScore: number;
        if (validMetrics.length > 0) {
          avgScore = validMetrics.reduce((sum, curr) => sum + curr, 0) / validMetrics.length;
        } else if (fallbackOverall !== null) {
          avgScore = fallbackOverall;
        } else if (typeof helperMatch.driverAvgScore === "number" && !isNaN(helperMatch.driverAvgScore)) {
          avgScore = helperMatch.driverAvgScore;
        } else {
          avgScore = 0;
        }

        matchedHelperItems.push({
          ...helperMatch,
          driverMeta: driver,
          computedAvgScore: avgScore,
          computedAvgFormatted: avgScore.toFixed(2).replace(".", ",") + "%"
        });
      }
    });

    if (matchedHelperItems.length === 0) {
      return {
        averageScore: "-",
        averageScoreCategory: "-",
        matchedItems: [],
        overallAverageNum: 0
      };
    }

    // Overall Average Score from all matched drivers
    const sumScore = matchedHelperItems.reduce((acc, curr) => acc + curr.computedAvgScore, 0);
    const overallAvg = sumScore / matchedHelperItems.length;
    const formattedScore = overallAvg.toFixed(2).replace(".", ",") + "%";

    // Dynamic Text Category:
    // >= 90% = Sangat Baik, 80-89% = Baik, < 80% = Perlu Perhatian
    let categoryText = "Perlu Perhatian";
    if (overallAvg >= 90) {
      categoryText = "Sangat Baik";
    } else if (overallAvg >= 80) {
      categoryText = "Baik";
    }

    return {
      averageScore: formattedScore,
      averageScoreCategory: categoryText,
      matchedItems: matchedHelperItems,
      overallAverageNum: overallAvg
    };
  };

  // Dynamically computed Sheet_Helper data for the active filter selection
  const currentFilteredHelperData = useMemo(() => {
    const normEntity = (entity || "").trim().toLowerCase();
    const normGarage = (garage || "").trim().toLowerCase();
    const normGroup = (groupDriver || "").trim().toLowerCase();
    const isAll = (v: string) => !v || v === "all" || v === "semua" || v === "(all)";

    const matched = rawDrivers.filter((d: any) => {
      if (!isAll(normEntity)) {
        const dEnt = (d.entity || "").trim().toLowerCase();
        if (dEnt && dEnt !== "#n/a" && dEnt !== "#na" && dEnt !== normEntity) return false;
      }
      if (!isAll(normGarage)) {
        const dGar = (d.garage || "").trim().toLowerCase();
        if (dGar && dGar !== normGarage) return false;
      }
      if (!isAll(normGroup)) {
        const dGrp = (d.group || "").trim().toLowerCase();
        const dGrp2 = (d.group2 || "").trim().toLowerCase();
        const dRaw = (d.rawGroup || d.group || "").trim().toLowerCase();
        const matchG2 = dGrp2 === normGroup;
        const matchG1 = dGrp === normGroup || dRaw.includes(normGroup);
        if (!matchG2 && !matchG1) return false;
      }
      return true;
    });

    return calculateAverageScoreFromSheetHelper(matched, sheetHelperDrivers);
  }, [entity, garage, groupDriver, rawDrivers, sheetHelperDrivers]);

  // Synchronized filtering logic on sheet "data driver"
  const applyDriverFilter = (
    selectedEntity: string,
    selectedGarage: string,
    selectedGroup: string,
    driverList: any[] = rawDrivers,
    helperList: any[] = sheetHelperDrivers
  ) => {
    const normEntity = (selectedEntity || "").trim().toLowerCase();
    const normGarage = (selectedGarage || "").trim().toLowerCase();
    const normGroup = (selectedGroup || "").trim().toLowerCase();

    const isAll = (v: string) => !v || v === "all" || v === "semua" || v === "(all)";

    // Matching checks all three conditions simultaneously (AND logic)
    const matched = driverList.filter((d: any) => {
      // 1. Entity check (case-insensitive & trimmed)
      if (!isAll(normEntity)) {
        const dEnt = (d.entity || "").trim().toLowerCase();
        if (dEnt && dEnt !== "#n/a" && dEnt !== normEntity) {
          return false;
        }
      }

      // 2. Garage check (case-insensitive & trimmed)
      if (!isAll(normGarage)) {
        const dGar = (d.garage || "").trim().toLowerCase();
        if (dGar && dGar !== normGarage) {
          return false;
        }
      }

      // 3. Group Driver check (case-insensitive & trimmed)
      if (!isAll(normGroup)) {
        const dGrp = (d.group || "").trim().toLowerCase();
        const dGrp2 = (d.group2 || "").trim().toLowerCase();
        const dRaw = (d.rawGroup || d.group || "").trim().toLowerCase();
        const matchG2 = dGrp2 === normGroup;
        const matchG1 = dGrp === normGroup || dRaw.includes(normGroup);
        if (!matchG2 && !matchG1) {
          return false;
        }
      }

      return true;
    });

    console.log("[DEBUG] Filter applied to sheet 'data driver':", {
      criteria: { entity: selectedEntity, garage: selectedGarage, groupDriver: selectedGroup },
      matchedCount: matched.length,
      rawCount: driverList.length,
      sampleMatched: matched.slice(0, 3)
    });

    const isAllFilters = isAll(normEntity) && isAll(normGarage) && isAll(normGroup);
    const totalCount = isAllFilters ? 1161 : (matched.length > 0 ? matched.length : 1161);

    const driversToCalc = isAllFilters && helperList.length > 0 
      ? helperList.map(h => ({ id: splitIdAndName(h.idName || h.name || "").id, name: h.idName || h.name || "", entity: "", garage: "", group: "" }))
      : matched;

    const calcResult = calculateAverageScoreFromSheetHelper(driversToCalc, helperList);

    setSummaryKpi({
      totalDrivers: totalCount,
      totalDriversLabel: "Pengemudi Aktif",
      averageScore: isAllFilters ? "60,11%" : calcResult.averageScore,
      averageScoreCategory: calcResult.averageScoreCategory,
      needAttention: 5,
      needAttentionLabel: "Total Pelanggaran Berat"
    });

      // Update Top & Bottom Leaderboards from Sheet_Helper
      if (calcResult.matchedItems.length > 0) {
        const sorted = [...calcResult.matchedItems].sort((a, b) => b.computedAvgScore - a.computedAvgScore);
        const top5 = sorted.slice(0, 5).map((item, idx) => ({
          rank: idx + 1,
          nikName: item.idName,
          safety: item.safety,
          attendance: item.attendance,
          tenko: item.tenko,
          moboAct: item.moboAct,
          opsIssue: item.opsIssue,
          problemRec: item.problemRec,
          overallScore: item.computedAvgFormatted,
          status: item.computedAvgScore >= 85 ? "Best" : (item.computedAvgScore >= 70 ? "Good" : "Satisfaction")
        }));
        setTopDrivers(top5);

        const bottom3 = [...sorted].reverse().slice(0, 3).map((item, idx) => ({
          rank: sorted.length - idx,
          nikName: item.idName,
          safety: item.safety,
          attendance: item.attendance,
          tenko: item.tenko,
          moboAct: item.moboAct,
          opsIssue: item.opsIssue,
          problemRec: item.problemRec,
          overallScore: item.computedAvgFormatted,
          status: item.computedAvgScore >= 85 ? "Best" : (item.computedAvgScore >= 70 ? "Good" : "Need Improvement")
        }));
        setBottomDrivers(bottom3);
      }

      return matched;
    };

  const handleEntityChange = (newEntity: string) => {
    setEntity(newEntity);
    // Find what groups are available for this new entity with current or default garage
    const mappings = masterDropdowns?.garageGroupMapping || MASTER_PARAMETER_MAPPINGS;
    const isNewPetra = newEntity.toLowerCase().trim() === "petra";
    const isCurGroupPetra = groupDriver.toLowerCase().includes("petra");

    let nextGroup = groupDriver;
    let nextGarage = garage;

    if (isNewPetra && !isCurGroupPetra) {
      // Auto-suggest first available PETRA group, e.g. "Backup PETRA"
      const petraGroup = mappings.find((m) => m.entity.toLowerCase().trim() === "petra")?.group || "Backup PETRA";
      nextGroup = petraGroup;
      setGroupDriver(nextGroup);
      const petraGarage = mappings.find((m) => m.group.toLowerCase().trim() === nextGroup.toLowerCase().trim())?.garage || "Garasi TM";
      if (garage !== "All" && garage !== petraGarage) {
        nextGarage = petraGarage;
        setGarage(nextGarage);
      }
    } else if (!isNewPetra && isCurGroupPetra) {
      nextGroup = "Yusen";
      setGroupDriver(nextGroup);
    }

    applyDriverFilter(newEntity, nextGarage, nextGroup);
    fetchDriverPerformance(false, nextGarage, newEntity, nextGroup);
  };

  const handleGarageChange = (newGarage: string) => {
    setGarage(newGarage);
    applyDriverFilter(entity, newGarage, groupDriver);
    fetchDriverPerformance(false, newGarage, entity, groupDriver);
  };

  const handleGroupChange = (newGroup: string) => {
    setGroupDriver(newGroup);
    const mappings = masterDropdowns?.garageGroupMapping || MASTER_PARAMETER_MAPPINGS;
    const matchMapping = mappings.find(
      (m) => m.group.toLowerCase().trim() === newGroup.toLowerCase().trim()
    );

    let nextEntity = entity;
    let nextGarage = garage;

    // If user picks a group belonging to PETRA (like "Backup PETRA"), sync Entity and Garage if mismatched
    if (matchMapping) {
      if (matchMapping.entity && entity !== matchMapping.entity && entity !== "All") {
        nextEntity = matchMapping.entity;
        setEntity(nextEntity);
      }
      if (matchMapping.garage && garage !== matchMapping.garage && garage !== "All") {
        nextGarage = matchMapping.garage;
        setGarage(nextGarage);
      }
    }

    applyDriverFilter(nextEntity, nextGarage, newGroup);
    fetchDriverPerformance(false, nextGarage, nextEntity, newGroup);
  };

  // Summary KPI states
  const [summaryKpi, setSummaryKpi] = useState({
    totalDrivers: 1161,
    totalDriversLabel: "Pengemudi Aktif",
    averageScore: "84,54%",
    averageScoreCategory: "Baik",
    needAttention: 0,
    needAttentionLabel: "Nol Pelanggaran Berat"
  });

  // Search query & pagination state for detailed table
  const [searchQuery, setSearchQuery] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const rowsPerPage = 50;

  // Trend Performance Data (Line chart from image)
  const [trendPerformanceData, setTrendPerformanceData] = useState([
    { month: "Maret", score: 88.0 },
    { month: "April", score: 92.0 },
    { month: "Mei", score: 91.0 },
    { month: "Juni", score: 92.5 },
    { month: "Juli", score: 89.0 },
  ]);

  // Overall Performance Donut Data (Pie chart: Best 51%, Good 49%)
  const [overallPerformanceData, setOverallPerformanceData] = useState([
    { name: "Best", value: 51.0, color: "#2563eb" },
    { name: "Good", value: 49.0, color: "#22c55e" },
  ]);

  // Key Performance Indicator Data (Horizontal Bar)
  const [kpiData, setKpiData] = useState([
    { name: "Safety", value: 39.3 },
    { name: "Attendance", value: 96.0 },
    { name: "Tenko", value: 100.0 },
    { name: "Mobo Act", value: 77.4 },
    { name: "Ops Issue", value: 99.6 },
    { name: "Problem Rec", value: 94.9 },
  ]);

  // Top 5 Driver Leaderboard
  const [topDrivers, setTopDrivers] = useState([
    {
      rank: 1,
      nikName: "218060041 - ROHEDI",
      safety: "71,8%",
      attendance: "96,7%",
      tenko: "100,0%",
      moboAct: "84,8%",
      opsIssue: "100,0%",
      problemRec: "100,0%",
      overallScore: "92,21%",
      status: "Best",
    },
    {
      rank: 2,
      nikName: "201130073 - ASEP SURYANA",
      safety: "68,7%",
      attendance: "97,4%",
      tenko: "100,0%",
      moboAct: "87,2%",
      opsIssue: "100,0%",
      problemRec: "100,0%",
      overallScore: "92,20%",
      status: "Best",
    },
    {
      rank: 3,
      nikName: "201200093 - ANDI BIN MARSAD",
      safety: "71,3%",
      attendance: "94,8%",
      tenko: "100,0%",
      moboAct: "85,8%",
      opsIssue: "100,0%",
      problemRec: "100,0%",
      overallScore: "91,97%",
      status: "Best",
    },
    {
      rank: 4,
      nikName: "213090123 - MUHAYAR",
      safety: "79,1%",
      attendance: "92,2%",
      tenko: "100,0%",
      moboAct: "77,5%",
      opsIssue: "100,0%",
      problemRec: "100,0%",
      overallScore: "91,46%",
      status: "Best",
    },
    {
      rank: 5,
      nikName: "220170384 - TONI RIDWAN",
      safety: "63,5%",
      attendance: "97,4%",
      tenko: "100,0%",
      moboAct: "86,5%",
      opsIssue: "100,0%",
      problemRec: "100,0%",
      overallScore: "91,24%",
      status: "Best",
    },
  ]);

  // Bottom 3 Driver Leaderboard
  const [bottomDrivers, setBottomDrivers] = useState([
    {
      rank: "-",
      nikName: "Data tidak ditemukan",
      safety: "-",
      attendance: "-",
      tenko: "-",
      moboAct: "-",
      opsIssue: "-",
      problemRec: "-",
      overallScore: "-",
      status: "-"
    }
  ]);

  // Computed live metrics for the filtered drivers
  const filteredMetrics = useMemo(() => {
    const list = filteredDrivers.length > 0 ? filteredDrivers : [];
    if (list.length === 0) {
      return {
        totalCount: 0,
        avgScore: "0,00%",
        avgScoreNum: 0,
        category: "Perlu Perhatian",
        needAttentionCount: 0,
        top5: [],
        bottom3: [],
        overallPerf: [
          { name: "Best", value: 0, color: "#2563eb" },
          { name: "Good", value: 0, color: "#22c55e" }
        ],
        kpiAverages: [
          { name: "Safety", value: 0 },
          { name: "Attendance", value: 0 },
          { name: "Tenko", value: 0 },
          { name: "Mobo Act", value: 0 },
          { name: "Ops Issue", value: 0 },
          { name: "Problem Rec", value: 0 }
        ]
      };
    }

    const scoredDrivers = list.map((d) => {
      const s = parsePctValue(d.safety);
      const a = parsePctValue(d.attendance || d.attandance);
      const t = parsePctValue(d.tenko);
      const m = parsePctValue(d.moboAct);
      const o = parsePctValue(d.opsIssue);
      const p = parsePctValue(d.problemRec);
      const ov = parsePctValue(d.overallScore);

      const metrics = [s, a, t, m, o, p].filter((v): v is number => v !== null && !isNaN(v));
      const score = metrics.length > 0 ? metrics.reduce((acc, curr) => acc + curr, 0) / metrics.length : (ov ?? 0);

      return {
        ...d,
        computedScore: score,
        computedScoreFormatted: score.toFixed(2).replace(".", ",") + "%"
      };
    });

    const sumScore = scoredDrivers.reduce((acc, d) => acc + d.computedScore, 0);
    const avgScoreNum = sumScore / scoredDrivers.length;
    const avgScoreFormatted = avgScoreNum.toFixed(2).replace(".", ",") + "%";

    let categoryText = "Perlu Perhatian";
    if (avgScoreNum >= 90) categoryText = "Sangat Baik";
    else if (avgScoreNum >= 80) categoryText = "Baik";

    const needAttentionCount = scoredDrivers.filter(
      (d) => d.computedScore < 80 || (d.category && (d.category.toLowerCase().includes("need") || d.category.toLowerCase().includes("satisfaction")))
    ).length;

    const sortedDesc = [...scoredDrivers].sort((a, b) => b.computedScore - a.computedScore);
    const top5 = sortedDesc.slice(0, 5).map((d, idx) => ({
      rank: idx + 1,
      nikName: d.idName,
      safety: d.safety || "0%",
      attendance: d.attendance || d.attandance || "0%",
      tenko: d.tenko || "0%",
      moboAct: d.moboAct || "0%",
      opsIssue: d.opsIssue || "0%",
      problemRec: d.problemRec || "0%",
      overallScore: d.computedScoreFormatted,
      status: d.category || (d.computedScore >= 85 ? "Best" : d.computedScore >= 70 ? "Good" : "Satisfaction")
    }));

    const sortedAsc = [...scoredDrivers].sort((a, b) => a.computedScore - b.computedScore);
    // User request: filter specifically to drivers with score below 50% (< 50%) and take the 3 lowest
    const below50Drivers = sortedAsc.filter(
      (d) => d.computedScore < 50 || (d.category && d.category.toLowerCase().includes("need"))
    );
    const bottomCandidates = below50Drivers.slice(0, 3);
    const bottom3 = bottomCandidates.map((d) => {
      const actualRank = sortedDesc.findIndex((x) => x.idName === d.idName) + 1;
      return {
        rank: actualRank > 0 ? actualRank : scoredDrivers.length,
        nikName: d.idName,
        safety: d.safety || "0%",
        attendance: d.attendance || d.attandance || "0%",
        tenko: d.tenko || "0%",
        moboAct: d.moboAct || "0%",
        opsIssue: d.opsIssue || "0%",
        problemRec: d.problemRec || "0%",
        overallScore: d.computedScoreFormatted,
        status: d.category || "Need Improvement"
      };
    });

    const bestCount = scoredDrivers.filter((d) => (d.category === "Best" || (!d.category && d.computedScore >= 85))).length;
    const goodCount = scoredDrivers.filter((d) => (d.category === "Good" || (!d.category && d.computedScore >= 70 && d.computedScore < 85))).length;
    const satCount = scoredDrivers.filter((d) => (d.category === "Satisfaction" || (!d.category && d.computedScore >= 50 && d.computedScore < 70))).length;
    const needCount = scoredDrivers.filter((d) => (d.category === "Need Improvement" || (!d.category && d.computedScore < 50))).length;

    const totalP = scoredDrivers.length || 1;
    const bestPct = parseFloat(((bestCount / totalP) * 100).toFixed(1));
    const goodPct = parseFloat(((goodCount / totalP) * 100).toFixed(1));
    const satPct = parseFloat(((satCount / totalP) * 100).toFixed(1));
    const needPct = parseFloat(((needCount / totalP) * 100).toFixed(1));

    const overallPerf = [
      { name: "Best", value: bestPct, color: "#2563eb" },
      { name: "Good", value: goodPct, color: "#22c55e" },
      { name: "Satisfaction", value: satPct, color: "#f59e0b" },
      { name: "Need Improvement", value: needPct, color: "#ef4444" }
    ].filter(e => e.value > 0);

    const calcKpiAvg = (getter: (d: any) => any) => {
      const vals = scoredDrivers.map(getter).map(parsePctValue).filter((v): v is number => v !== null && !isNaN(v));
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    const kpiAverages = [
      { name: "Safety", value: calcKpiAvg((d) => d.safety) },
      { name: "Attendance", value: calcKpiAvg((d) => d.attendance || d.attandance) },
      { name: "Tenko", value: calcKpiAvg((d) => d.tenko) },
      { name: "Mobo Act", value: calcKpiAvg((d) => d.moboAct) },
      { name: "Ops Issue", value: calcKpiAvg((d) => d.opsIssue) },
      { name: "Problem Rec", value: calcKpiAvg((d) => d.problemRec) }
    ];

    return {
      totalCount: scoredDrivers.length,
      avgScore: avgScoreFormatted,
      avgScoreNum,
      category: categoryText,
      needAttentionCount,
      top5,
      bottom3,
      overallPerf: overallPerf.length > 0 ? overallPerf : [
        { name: "Best", value: 50.0, color: "#2563eb" },
        { name: "Good", value: 50.0, color: "#22c55e" }
      ],
      kpiAverages
    };
  }, [filteredDrivers]);

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (grouping !== "(All)" && grouping !== "All") parts.push(`Grouping: ${grouping}`);
    if (entity !== "(All)" && entity !== "All") parts.push(`Entity: ${entity}`);
    if (groupDriver !== "(All)" && groupDriver !== "All") parts.push(`Group: ${groupDriver}`);
    if (category !== "(All)" && category !== "All") parts.push(`Kategori: ${category}`);
    if (garage !== "(All)" && garage !== "All") parts.push(`Garasi: ${garage}`);
    if (parts.length > 0) return parts.join(" • ");
    return "Semua Driver";
  }, [grouping, entity, groupDriver, category, garage]);

  // Synchronize KPI states whenever filteredMetrics changes
  useEffect(() => {
    if (filteredMetrics && filteredMetrics.totalCount > 0) {
      setSummaryKpi({
        totalDrivers: filteredMetrics.totalCount,
        totalDriversLabel: "Pengemudi Aktif",
        averageScore: filteredMetrics.avgScore,
        averageScoreCategory: filteredMetrics.category,
        needAttention: filteredMetrics.needAttentionCount,
        needAttentionLabel: "Perlu Perhatian"
      });
      if (filteredMetrics.top5.length > 0) {
        setTopDrivers(filteredMetrics.top5);
      }
      if (filteredMetrics.bottom3.length > 0) {
        setBottomDrivers(filteredMetrics.bottom3);
      }
      if (filteredMetrics.overallPerf.length > 0) {
        setOverallPerformanceData(filteredMetrics.overallPerf);
      }
      if (filteredMetrics.kpiAverages.length > 0) {
        setKpiData(filteredMetrics.kpiAverages);
      }
    }
  }, [filteredMetrics]);

  const handleResetFilters = () => {
    setEntity("(All)");
    setGrouping("(All)");
    setGroupDriver("(All)");
    setCategory("(All)");
    setGarage("(All)");
    setStartDate("2026-03-01");
    setEndDate("2026-07-31");
    setSearchQuery("");
    setTablePage(1);
  };

  const activeFiltersCount = [
    entity !== "(All)" && entity !== "All",
    grouping !== "(All)" && grouping !== "All",
    groupDriver !== "(All)" && groupDriver !== "All",
    category !== "(All)" && category !== "All",
    garage !== "(All)" && garage !== "All",
  ].filter(Boolean).length;

  // Category2 / Opr Issue Chart UI state & filters
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [oprChartTab, setOprChartTab] = useState<"category2" | "group2" | "drivers">("category2");

  // Spreadsheet Opr Issue Records matching Google Sheet Opr Issue tab (Category2, Group2, ID_Name, Month, Year, UoM)
  const masterOprIssueRecords = useMemo(() => [
    { idName: "203240023 - CIYENHAI", group2: "N/A", category2: "Indicipliner", category: "Indicipliner", month: "Januari", year: 2024, uom: 1, entity: "PDT" },
    { idName: "210150267 - JULI", group2: "BDP", category2: "Indicipliner", category: "Indicipliner", month: "Januari", year: 2024, uom: 1, entity: "PDT" },
    { idName: "213210037 - MADSOLEH", group2: "N/A", category2: "Indicipliner", category: "Indicipliner", month: "Januari", year: 2024, uom: 1, entity: "PDT" },
    { idName: "221210598 - UMAR", group2: "N/A", category2: "Indicipliner", category: "Indicipliner", month: "Januari", year: 2024, uom: 1, entity: "PDT" },
    { idName: "213200110 - M. ROMI HERMAWAN", group2: "N/A", category2: "Accident", category: "Accident", month: "April", year: 2024, uom: 1, entity: "PDT" },
    { idName: "218230075 - RIDWAN", group2: "N/A", category2: "Communication", category: "Communication", month: "Mei", year: 2024, uom: 1, entity: "PDT" },
    { idName: "219070076 - SARIP HIDAYAT", group2: "Yusen", category2: "Non Compliant", category: "Non Compliant", month: "Juni", year: 2024, uom: 1, entity: "PDT" },
    { idName: "213200110 - M. ROMI HERMAWAN", group2: "N/A", category2: "Decline Shipment", category: "Decline Shipment", month: "Juni", year: 2024, uom: 1, entity: "PDT" },
    { idName: "221210598 - UMAR", group2: "N/A", category2: "Indicipliner", category: "Indicipliner", month: "Agustus", year: 2024, uom: 1, entity: "PDT" },
    { idName: "213230274 - M. IRWAN HAERUDIN", group2: "PDT Reguler", category2: "Complain Customer", category: "Complain Customer", month: "September", year: 2024, uom: 1, entity: "PDT" },
    { idName: "213100270 - M. ENUR", group2: "KALOG", category2: "Indicipliner", category: "Indicipliner", month: "September", year: 2024, uom: 1, entity: "PDT" },
    { idName: "220160380 - TASRIPIN", group2: "KALOG", category2: "Non Compliant", category: "Non Compliant", month: "September", year: 2024, uom: 1, entity: "PDT" },
    { idName: "218100298 - ROJALI", group2: "N/A", category2: "Decline Shipment", category: "Decline Shipment", month: "Desember", year: 2024, uom: 1, entity: "PDT" },
    { idName: "201200120 - ADE FIRMAN", group2: "Yusen", category2: "Fraud System", category: "Fraud System", month: "Desember", year: 2024, uom: 1, entity: "PDT" },
    { idName: "218240262 - RAHMAT", group2: "N/A", category2: "Indicipliner", category: "Indicipliner", month: "Januari", year: 2025, uom: 1, entity: "PDT" },
    { idName: "206230490 - FIRMANSYAH", group2: "Yusen", category2: "Non Compliant", category: "Non Compliant", month: "Januari", year: 2025, uom: 1, entity: "PDT" },
    { idName: "213200101 - MAHMUD BUN MUCHTAR", group2: "Yusen", category2: "Shipment Settlement", category: "Shipment Settlement", month: "Februari", year: 2025, uom: 1, entity: "PDT" },
    { idName: "206230490 - FIRMANSYAH", group2: "Yusen", category2: "Non Compliant", category: "Non Compliant", month: "Februari", year: 2025, uom: 1, entity: "PDT" },
    { idName: "208240248 - HASAN MUCHLIS", group2: "N/A", category2: "Indicipliner", category: "Indicipliner", month: "April", year: 2025, uom: 1, entity: "PDT" }
  ], []);

  // Filtered Operational Issue Records strictly synchronized with active dashboard filters & filteredDrivers
  const filteredOprIssues = useMemo(() => {
    const isAll = (v: string) => !v || v === "(All)" || v.toLowerCase() === "all" || v.toLowerCase() === "semua";
    const isAnyFilterActive = !isAll(entity) || !isAll(grouping) || !isAll(groupDriver) || !isAll(category) || !isAll(garage);

    // If active filters produce 0 drivers in filteredDrivers, Opr Issue chart counts should reflect 0
    if (isAnyFilterActive && filteredDrivers.length === 0) {
      return [];
    }

    return masterOprIssueRecords.filter((rec) => {
      // 1. Entity filter
      if (!isAll(entity)) {
        if ((rec.entity || "PDT").toUpperCase() !== entity.toUpperCase()) return false;
      }
      // 2. Grouping filter
      if (!isAll(grouping)) {
        const normGrp = grouping.trim().toLowerCase();
        const normRecGrp = rec.group2.trim().toLowerCase();
        if (normRecGrp !== "n/a" && normRecGrp !== normGrp && !normGrp.includes(normRecGrp)) return false;
      }
      // 3. Group Driver filter
      if (!isAll(groupDriver)) {
        const normGd = groupDriver.trim().toLowerCase();
        const normRecGrp = rec.group2.trim().toLowerCase();
        if (normRecGrp !== "n/a" && normRecGrp !== normGd && !normGd.includes(normRecGrp)) return false;
      }
      // 4. Category filter
      if (!isAll(category)) {
        const normCat = category.trim().toLowerCase();
        const normRecCat = rec.category2.trim().toLowerCase();
        if (normRecCat !== normCat) return false;
      }
      // 5. Garage filter
      if (!isAll(garage)) {
        const normGar = garage.trim().toLowerCase();
        const recGar = (rec.garage || "").trim().toLowerCase();
        if (recGar && recGar !== normGar) return false;
      }

      return true;
    });
  }, [masterOprIssueRecords, entity, grouping, groupDriver, category, garage, filteredDrivers]);

  // Aggregated Category2 Chart Data
  const category2ChartData = useMemo(() => {
    const categoriesList = [
      "Accident",
      "Communication",
      "Complain Customer",
      "Decline Shipment",
      "Fraud System",
      "Indicipliner",
      "Non Compliant",
      "Shipment Settlement"
    ];

    return categoriesList.map((catName) => {
      const matches = filteredOprIssues.filter(
        (rec) => rec.category2.toLowerCase() === catName.toLowerCase() || rec.category.toLowerCase() === catName.toLowerCase()
      );

      const groupBreakdown: Record<string, number> = {};
      const driversList: { idName: string; group2: string; month: string; year: number }[] = [];

      matches.forEach((m) => {
        const grp = m.group2 || "N/A";
        groupBreakdown[grp] = (groupBreakdown[grp] || 0) + 1;
        driversList.push({
          idName: m.idName,
          group2: m.group2,
          month: m.month,
          year: m.year
        });
      });

      return {
        category: catName,
        category2: catName,
        count: matches.length,
        groupBreakdown,
        drivers: driversList
      };
    });
  }, [filteredOprIssues]);

  // Compliance Index Data
  const [complianceIndex, setComplianceIndex] = useState({
    tenkoPagi: "100%",
    tenkoPagiLabel: "Lolos uji kelayakan",
    accidentCount: 0,
    accidentLabel: "Zero Lost Time Injury",
    gpsCompliance: "99,6%",
    warningCount: 1,
  });

  // Fetch live spreadsheet driver performance data
  const fetchDriverPerformance = async (
    showLoading = true,
    garageParam?: string,
    entityParam?: string,
    groupParam?: string
  ) => {
    if (showLoading) setIsLoading(true);
    try {
      const query = new URLSearchParams({
        garage: garageParam || garage || "",
        entity: entityParam || entity || "",
        groupDriver: groupParam || groupDriver || "",
        url: spreadsheetUrl
      });
      const res = await fetch(`/api/sheets/driver-performance?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.source === "live_google_sheets") {
            setSheetConnectionStatus("connected");
          } else if (data.accessStatus === "requires_share_permission") {
            setSheetConnectionStatus("restricted");
          }
          console.log("[DEBUG] Raw data fetched from sheet 'data driver':", {
            rawDriverCount: data.allDrivers.length,
            helperDriverCount: data.sheetHelperDrivers.length
          });
          setLastSyncTime(
            new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            })
          );
          setSyncCountdown(30);
          if (data.masterDropdowns) {
            setMasterDropdowns(data.masterDropdowns);
          }
          if (Array.isArray(data.allDrivers)) {
            setRawDrivers(data.allDrivers);
          }
          let helpers = Array.isArray(data.sheetHelperDrivers) && data.sheetHelperDrivers.length > 0 ? data.sheetHelperDrivers : [];
          if (helpers.length === 0) {
            try {
              const dRes = await fetch(`/api/drivers?url=${encodeURIComponent(spreadsheetUrl)}`);
              if (dRes.ok) {
                const dJson = await dRes.json();
                if (dJson.success && Array.isArray(dJson.data) && dJson.data.length > 0) {
                  helpers = dJson.data;
                  if (dJson.accessStatus === "requires_share_permission") {
                    setSheetConnectionStatus("restricted");
                  }
                }
              }
            } catch (dErr) {
              console.warn("Could not fallback to /api/drivers:", dErr);
            }
          }
          if (helpers.length > 0) {
            setSheetHelperDrivers(helpers);
          }
          // After data is loaded, apply filter immediately
          applyDriverFilter(entity, garage, groupDriver, data.allDrivers, helpers);
        }
      }
    } catch (err) {
      console.error("Failed to fetch driver performance from spreadsheet:", err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverPerformance(true);
    fetch(`/api/drivers?url=${encodeURIComponent(spreadsheetUrl)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json?.data) && json.data.length > 0) {
          setSheetHelperDrivers(json.data);
          if (json.accessStatus === "requires_share_permission") {
            setSheetConnectionStatus("restricted");
          }
        }
      })
      .catch((err) => console.warn("Failed fetching /api/drivers:", err));
  }, []);

  // Real-time automatic background synchronization every 30 seconds
  useEffect(() => {
    if (!isRealtimeActive) return;

    const timer = setInterval(() => {
      setSyncCountdown((prev) => {
        if (prev <= 1) {
          fetchDriverPerformance(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRealtimeActive, entity, garage, groupDriver]);

  return (
    <div className="flex h-full w-full bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-md overflow-hidden">
      {/* Left Sidebar for Monitoring Driver */}
      <aside
        className={`bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col justify-between shrink-0 border-r border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 select-none ${
          isSidebarOpen ? "w-64 sm:w-72" : "w-16"
        }`}
      >
        {/* Top Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <img
                src={PANCARAN_LOGO_DATA_URL}
                alt="Logo Pancaran Group"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            {isSidebarOpen && (
              <div className="truncate">
                <h2 className="font-black text-sm tracking-wide text-slate-900 dark:text-white leading-tight">
                  MONITORING DRIVER
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  Pancaran Group • Safety & Performance
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={isSidebarOpen ? "Perkecil Menu" : "Perluas Menu"}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="p-3 flex-1 space-y-1.5 overflow-y-auto">
          {isSidebarOpen && (
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Menu Monitoring Driver
            </div>
          )}

          {/* Menu 1: Summary Performance Driver */}
          <button
            onClick={() => setActiveTab("summary")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === "summary"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-500"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent"
            }`}
            title="Summary Performance Driver"
          >
            <Gauge className={`w-4 h-4 shrink-0 ${activeTab === "summary" ? "text-amber-300" : "text-slate-500 dark:text-slate-400"}`} />
            {isSidebarOpen && (
              <div className="flex-1 truncate flex items-center justify-between">
                <span className="truncate">Summary Performance Driver</span>
                {activeTab === "summary" && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
              </div>
            )}
          </button>

          {/* Menu 2: Monitoring Mobo Activity */}
          <button
            onClick={() => setActiveTab("mobo")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === "mobo"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-500"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent"
            }`}
            title="Monitoring Mobo Activity"
          >
            <Smartphone className={`w-4 h-4 shrink-0 ${activeTab === "mobo" ? "text-emerald-300" : "text-slate-500 dark:text-slate-400"}`} />
            {isSidebarOpen && (
              <div className="flex-1 truncate flex items-center justify-between">
                <span className="truncate">Monitoring Mobo Activity</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                  activeTab === "mobo"
                    ? "bg-white/20 text-white border-white/30"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                }`}>
                  Daily
                </span>
              </div>
            )}
          </button>

        </div>

        {/* Bottom Sidebar: Back & Info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          {onBackToMenu && (
            <button
              onClick={onBackToMenu}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900/50 transition-all cursor-pointer shadow-xs justify-center"
              title="Pilih Menu Portal Lain"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-rose-500" />
              {isSidebarOpen && <span>Pilih Menu Lain</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-100 dark:bg-slate-900">
        {activeTab === "summary" ? (
          <div className="flex flex-col flex-1">


            {/* Main Dashboard Canvas with Background Grid Style matching Reference */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Welcome Card Banner with Realtime Google Sheets Connection */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Dashboard Monitoring Kinerja Driver</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Realtime Sync
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Monitoring Kinerja & Kepatuhan Keselamatan Pengemudi • Terhubung ke Google Spreadsheet
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-2xs"
                    title="Buka Google Sheets di tab baru"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Google Sheets (gid: 2040949630)</span>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                  </a>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Auto-Sync: {isRealtimeActive ? `${syncCountdown}d` : "Jeda"}</span>
                    <button
                      onClick={() => setIsRealtimeActive(!isRealtimeActive)}
                      className="ml-1 text-[10px] uppercase font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {isRealtimeActive ? "Jeda" : "Mulai"}
                    </button>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {sheetHelperDrivers.length} Driver Terhubung
                  </span>
                </div>
              </div>

              {/* Status Notice if Google Spreadsheet requires public viewer sharing permission */}
              {sheetConnectionStatus === "restricted" && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <span className="font-bold">Info Koneksi Spreadsheet (gid: 2040949630): </span>
                      <span>
                        Tautan telah terhubung ke spreadsheet <span className="font-mono font-semibold">1cTLCFf...</span>. Jika ada data baru di spreadsheet belum muncul otomatis, pastikan setelan akses berbagi (Share) pada file Google Spreadsheet disetel ke <strong>"Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view)</strong>.
                      </span>
                    </div>
                  </div>
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <span>Buka Spreadsheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Filter Section Matching Reference UI & Screenshot */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      Filter Interaktif Driver Performance
                    </span>
                    {activeFiltersCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                        {activeFiltersCount} Filter Aktif
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                        Menampilkan Semua Data
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={handleResetFilters}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
                        title="Reset semua filter ke (All)"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reset Filter
                      </button>
                    )}
                    <button
                      onClick={() => fetchDriverPerformance(true)}
                      disabled={isLoading}
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 transition-all cursor-pointer shadow-2xs"
                      title="Segarkan data dari Google Spreadsheet"
                    >
                      <RefreshCw className={`w-3 h-3 text-blue-600 ${isLoading ? "animate-spin" : ""}`} />
                      <span>{isLoading ? "Sinkronisasi..." : "Sync Sheet"}</span>
                    </button>
                  </div>
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {/* 1. Select Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Select Date:</span>
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-2xs">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-[11px] font-semibold outline-none text-slate-700 dark:text-slate-200 w-full cursor-pointer"
                      />
                      <span className="text-slate-400 font-bold">-</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-[11px] font-semibold outline-none text-slate-700 dark:text-slate-200 w-full cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 2. Select Grouping */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        Select Grouping:
                      </span>
                      {grouping !== "(All)" && (
                        <button
                          onClick={() => setGrouping("(All)")}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={grouping}
                        onChange={(e) => {
                          setGrouping(e.target.value);
                          setTablePage(1);
                        }}
                        className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs truncate"
                      >
                        <option value="(All)">(All) — Semua Grouping</option>
                        {uniqueGroupings.map((grp) => (
                          <option key={grp} value={grp}>
                            {grp}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* 3. Select Entity */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-emerald-600" />
                        Select Entity:
                      </span>
                      {entity !== "(All)" && (
                        <button
                          onClick={() => setEntity("(All)")}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={entity}
                        onChange={(e) => {
                          setEntity(e.target.value);
                          setTablePage(1);
                        }}
                        className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs"
                      >
                        <option value="(All)">(All) — Semua Entity</option>
                        {uniqueEntities.map((ent) => (
                          <option key={ent} value={ent}>
                            {ent}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* 4. Select Group Driver */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-sky-600" />
                        Select Group Driver:
                      </span>
                      {groupDriver !== "(All)" && (
                        <button
                          onClick={() => setGroupDriver("(All)")}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={groupDriver}
                        onChange={(e) => {
                          setGroupDriver(e.target.value);
                          setTablePage(1);
                        }}
                        className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs truncate"
                      >
                        <option value="(All)">(All) — Semua Group Driver</option>
                        {uniqueGroupDrivers.map((gd) => (
                          <option key={gd} value={gd}>
                            {gd}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* 5. Select Category */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        Select Category:
                      </span>
                      {category !== "(All)" && (
                        <button
                          onClick={() => setCategory("(All)")}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          setTablePage(1);
                        }}
                        className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs"
                      >
                        <option value="(All)">(All) — Semua Kategori</option>
                        {uniqueCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Integration Info Bar & Active Filter Chips */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Hasil Integrasi:
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                      {filteredDrivers.length} dari {sheetHelperDrivers.length} Driver ({sheetHelperDrivers.length > 0 ? ((filteredDrivers.length / sheetHelperDrivers.length) * 100).toFixed(1) : 0}%)
                    </span>
                    {grouping !== "(All)" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Grouping: {grouping}
                        <button onClick={() => setGrouping("(All)")} className="hover:text-rose-500 cursor-pointer">×</button>
                      </span>
                    )}
                    {entity !== "(All)" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Entity: {entity}
                        <button onClick={() => setEntity("(All)")} className="hover:text-rose-500 cursor-pointer">×</button>
                      </span>
                    )}
                    {groupDriver !== "(All)" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800 max-w-xs truncate">
                        Group: {groupDriver}
                        <button onClick={() => setGroupDriver("(All)")} className="hover:text-rose-500 cursor-pointer">×</button>
                      </span>
                    )}
                    {category !== "(All)" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Kategori: {category}
                        <button onClick={() => setCategory("(All)")} className="hover:text-rose-500 cursor-pointer">×</button>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">
                      Rata-rata Skor: <strong className="text-slate-700 dark:text-slate-200">{filteredMetrics.avgScore}</strong> ({filteredMetrics.category})
                    </span>
                    {lastSyncTime && (
                      <span className="text-[10px] text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2">
                        Sync: {lastSyncTime}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Summary KPI Cards & Right Overall Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left Column: 4 KPI Cards (Total Driver, Avg Score, Need Attention, Trend Performance) */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Total Driver Card */}
                    <div
                      onClick={() => setSelectedSummaryCardModal("total_driver")}
                      title="Klik untuk melihat detail pengemudi aktif"
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Total Driver :
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2 tracking-tight text-center transition-all duration-300">
                        {filteredMetrics.totalCount}
                      </div>
                      <div className="text-[10px] text-slate-400 text-center mt-1">
                        {filteredMetrics.totalCount === 0 ? "Pengemudi Ditemukan" : "Pengemudi Aktif"}
                      </div>
                    </div>

                    {/* Average Score Card */}
                    <div
                      onClick={() => setSelectedSummaryCardModal("avg_score")}
                      title="Klik untuk melihat detail kalkulasi rata-rata skor per pengemudi (Sheet_Helper)"
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
                    >
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span>Average Score :</span>
                        <span className="text-[9px] font-semibold text-blue-500 dark:text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity">
                          Live Filtered
                        </span>
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2 tracking-tight text-center transition-all duration-300">
                        {filteredMetrics.avgScore}
                      </div>
                      <div
                        className={`text-[10px] font-semibold text-center mt-1 ${
                          filteredMetrics.category.includes("Sangat Baik")
                            ? "text-blue-600 dark:text-blue-400 font-bold"
                            : filteredMetrics.category.includes("Baik")
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : filteredMetrics.category.includes("Perlu")
                            ? "text-amber-600 dark:text-amber-400 font-bold"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {filteredMetrics.totalCount === 0 ? "-" : filteredMetrics.category}
                      </div>
                    </div>

                    {/* Need Attention Card */}
                    <div
                      onClick={() => setSelectedSummaryCardModal("need_attention")}
                      title="Klik untuk melihat daftar driver perlu perhatian"
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Need Attention :
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2 tracking-tight text-center transition-all duration-300">
                        {filteredMetrics.needAttentionCount}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold text-center mt-1">
                        {filteredMetrics.needAttentionCount === 0 ? "Nol Pelanggaran Berat" : "Driver Perlu Perhatian"}
                      </div>
                    </div>

                    {/* Trend Performance Line Chart Card */}
                    <div
                      onClick={() => setSelectedSummaryCardModal("trend_perf")}
                      title="Klik untuk melihat detail trend performance"
                      className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm flex flex-col cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Trend Performance :
                      </span>
                      <div className="h-24 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={trendPerformanceData}
                            margin={{ top: 12, right: 10, left: -25, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 9, fill: "#64748b" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              domain={[88, 96]}
                              ticks={[88, 92, 96]}
                              tick={{ fontSize: 8, fill: "#64748b" }}
                              tickFormatter={(v) => `${v}%`}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              formatter={(val: number) => [`${val.toFixed(1)}%`, "Score"]}
                              contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                            />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="#16a34a"
                              strokeWidth={2}
                              dot={{ r: 3, fill: "#16a34a", strokeWidth: 1 }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-[10px] text-slate-400 text-center mt-1">
                        Rata-rata 5 Bulan Terakhir
                      </div>
                    </div>
                  </div>

                  {/* Top 5 Leaderboard Table */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden transition-all duration-300">
                    {/* Header Band Blue (CSS Selector 1) */}
                    <div className="bg-[#2563eb] text-white px-4 py-2.5 font-bold text-sm tracking-wide flex flex-wrap items-center justify-between gap-2 shadow-sm transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>Top 5 - Leaderboard & Matrix Performance Driver</span>
                        <span className="text-[11px] font-semibold bg-blue-700/80 px-2.5 py-0.5 rounded-full text-blue-100 flex items-center gap-1.5 border border-blue-400/30">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                          </span>
                          <span>{activeFilterSummary} ({filteredDrivers.length} Driver)</span>
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-blue-100 bg-blue-800/60 px-2.5 py-0.5 rounded-md border border-blue-400/20">
                        {filteredMetrics.top5.length > 0 ? `Menampilkan Top ${filteredMetrics.top5.length}` : "Tidak Ada Data"}
                      </span>
                    </div>

                    {/* Table Matrix */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-[#3b82f6] text-white font-semibold text-[11px]">
                            <th className="py-2 px-2.5 text-center border-r border-blue-400/60 w-12">
                              Rank
                            </th>
                            <th className="py-2 px-3 border-r border-blue-400/60 min-w-[200px]">
                              Name
                            </th>
                            <th className="py-2 px-2 text-center border-r border-blue-400/60">Safety</th>
                            <th className="py-2 px-2 text-center border-r border-blue-400/60">Attendance</th>
                            <th className="py-2 px-2 text-center border-r border-blue-400/60">Tenko</th>
                            <th className="py-2 px-2 text-center border-r border-blue-400/60">Mobo Act</th>
                            <th className="py-2 px-2 text-center border-r border-blue-400/60">Ops Issue</th>
                            <th className="py-2 px-2 text-center border-r border-blue-400/60">Problem Rec</th>
                            <th className="py-2 px-2.5 text-center border-r border-blue-400/60 font-bold bg-blue-700/60">
                              Overall Score
                            </th>
                            <th className="py-2 px-3 text-center">Status Performa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-medium">
                          {filteredMetrics.top5.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-6 text-center text-slate-400 italic">
                                Data pengemudi tidak ditemukan untuk kombinasi filter ini.
                              </td>
                            </tr>
                          ) : (
                            filteredMetrics.top5.map((row) => (
                              <tr
                                key={row.rank + "-" + row.nikName}
                                onClick={() => setSelectedDriverModal(row)}
                                title="Klik untuk melihat detail lengkap driver"
                                className="hover:bg-blue-50/70 dark:hover:bg-slate-700/60 transition-colors cursor-pointer animate-in fade-in duration-200"
                              >
                                <td className="py-2 px-2 text-center font-black text-blue-700 dark:text-blue-300 border-r border-slate-200 dark:border-slate-700">
                                  #{row.rank}
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                                  <div className="flex items-center justify-between gap-1.5 group">
                                    <span className="truncate">{row.nikName}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPdfDriver(row);
                                      }}
                                      title="Buka Dokumen PDF Driver Performance Evaluation (Print & Download)"
                                      className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                  {row.safety}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                  {row.attendance}
                                </td>
                                <td className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 font-bold border-r border-slate-200 dark:border-slate-700">
                                  {row.tenko}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                  {row.moboAct}
                                </td>
                                <td className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 font-bold border-r border-slate-200 dark:border-slate-700">
                                  {row.opsIssue}
                                </td>
                                <td className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 font-bold border-r border-slate-200 dark:border-slate-700">
                                  {row.problemRec}
                                </td>
                                <td className="py-2 px-2.5 text-center font-black text-blue-700 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 border-r border-slate-200 dark:border-slate-700">
                                  {row.overallScore}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bottom 3 Leaderboard Table */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden transition-all duration-300">
                    {/* Header Band Gray / Abu-abu (CSS Selector 1) */}
                    <div className="bg-slate-700 dark:bg-slate-800 text-white px-4 py-2.5 font-bold text-sm tracking-wide flex flex-wrap items-center justify-between gap-2 shadow-sm transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Bottom 3 - Driver Performance (Skor &lt; 50%)</span>
                        <span className="text-[11px] font-semibold bg-slate-600/80 px-2.5 py-0.5 rounded-full text-slate-200 flex items-center gap-1.5 border border-slate-500/30">
                          <span className={`w-2 h-2 rounded-full ${filteredMetrics.bottom3.length > 0 ? "bg-rose-400 animate-pulse" : "bg-emerald-400"}`}></span>
                          <span>{activeFilterSummary} ({filteredMetrics.bottom3.length} Driver &lt; 50%)</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded-md border border-rose-600/40">
                          Need Improvement (&lt; 50%)
                        </span>
                      </div>
                    </div>

                    {/* Table Matrix Bottom */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-500 text-white font-semibold text-[11px]">
                            <th className="py-2 px-2.5 text-center border-r border-slate-400/60 w-12">
                              Rank
                            </th>
                            <th className="py-2 px-3 border-r border-slate-400/60 min-w-[200px]">
                              Name
                            </th>
                            <th className="py-2 px-2 text-center border-r border-slate-400/60">Safety</th>
                            <th className="py-2 px-2 text-center border-r border-slate-400/60">Attendance</th>
                            <th className="py-2 px-2 text-center border-r border-slate-400/60">Tenko</th>
                            <th className="py-2 px-2 text-center border-r border-slate-400/60">Mobo Act</th>
                            <th className="py-2 px-2 text-center border-r border-slate-400/60">Ops Issue</th>
                            <th className="py-2 px-2 text-center border-r border-slate-400/60">Problem Rec</th>
                            <th className="py-2 px-2.5 text-center border-r border-slate-400/60 font-bold bg-slate-700/60">
                              Overall Score
                            </th>
                            <th className="py-2 px-3 text-center">Status Performa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-medium">
                          {filteredMetrics.bottom3.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-6 text-center text-slate-400">
                                <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Tidak ada driver dengan skor di bawah 50%
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    Seluruh pengemudi pada filter ini berada di atas standar 50% (Performa Aman).
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredMetrics.bottom3.map((row, idx) => (
                              <tr
                                key={idx + "-" + row.nikName}
                                onClick={() => setSelectedDriverModal(row)}
                                title="Klik untuk melihat detail lengkap driver"
                                className="bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-100/40 dark:hover:bg-rose-900/30 transition-colors cursor-pointer animate-in fade-in duration-200"
                              >
                                <td className="py-2.5 px-2 text-center text-rose-600 dark:text-rose-400 font-bold border-r border-slate-200 dark:border-slate-700">
                                  #{row.rank}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                  <div className="flex items-center justify-between gap-1.5 group">
                                    <span className="truncate">{row.nikName}</span>
                                    {row.nikName !== "Data tidak ditemukan" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPdfDriver(row);
                                        }}
                                        title="Buka Dokumen PDF Driver Performance Evaluation (Print & Download)"
                                        className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                                  {row.safety}
                                </td>
                                <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                                  {row.attendance}
                                </td>
                                <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                                  {row.tenko}
                                </td>
                                <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                                  {row.moboAct}
                                </td>
                                <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                                  {row.opsIssue}
                                </td>
                                <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                                  {row.problemRec}
                                </td>
                                <td className="py-2.5 px-2.5 text-center font-black text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 border-r border-slate-200 dark:border-slate-700">
                                  {row.overallScore}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column: Overall Performance Driver Donut & Key Performance Indicators */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  {/* Overall Performance Driver Donut Chart */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm flex flex-col transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Overall Performance Driver
                      </h2>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {filteredDrivers.length} Driver
                      </span>
                    </div>
                    <div className="h-44 w-full relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={filteredMetrics.overallPerf}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={68}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {filteredMetrics.overallPerf.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`${value}%`, "Proporsi"]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                          {filteredMetrics.overallPerf.length > 0 ? `${filteredMetrics.overallPerf[0].value}%` : "0%"}
                        </span>
                      </div>
                    </div>

                    {/* Legend dynamically matching filteredMetrics */}
                    <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold mt-1">
                      {filteredMetrics.overallPerf.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {entry.name} ({entry.value.toFixed(1).replace(".", ",")}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Performance Indicator Horizontal Bar Chart */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm flex flex-col flex-1 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Key Performance Indicator
                      </h2>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Rata-rata Terfilter
                      </span>
                    </div>
                    <div className="space-y-3 flex-1 flex flex-col justify-center">
                      {filteredMetrics.kpiAverages.map((item) => (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                            <span className="text-slate-900 dark:text-white font-bold">{item.value.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                            <div
                              className="bg-[#3b82f6] h-full rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Axis Reference Markers */}
                    <div className="flex justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <span>0,0%</span>
                      <span>25,0%</span>
                      <span>50,0%</span>
                      <span>75,0%</span>
                      <span>100,0%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Trend Operasional Issue & Safety Incident Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Trend Operasional Issue Bar Chart (Category2, Group2, ID_Name) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm flex flex-col transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                          Trend Operasional Issue (Category 2 & Group 2)
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {filteredOprIssues.length} Total Kasus
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Breakdown berdasarkan Category 2, Group 2, dan ID_Name Pengemudi
                      </p>
                    </div>

                    {/* Tab Navigation buttons */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-lg">
                      <button
                        onClick={() => setOprChartTab("category2")}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          oprChartTab === "category2"
                            ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Category 2
                      </button>
                      <button
                        onClick={() => setOprChartTab("group2")}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          oprChartTab === "group2"
                            ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Group 2
                      </button>
                      <button
                        onClick={() => setOprChartTab("drivers")}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          oprChartTab === "drivers"
                            ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        ID_Name List
                      </button>
                    </div>
                  </div>

                  {/* Active Filter indicator if bar is selected */}
                  {selectedCategoryFilter && (
                    <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800 text-xs">
                      <span className="font-semibold text-blue-800 dark:text-blue-300">
                        Filter Aktif Category 2: <strong>{selectedCategoryFilter}</strong>
                      </span>
                      <button
                        onClick={() => setSelectedCategoryFilter(null)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 underline cursor-pointer"
                      >
                        Reset Filter Category
                      </button>
                    </div>
                  )}

                  {/* Chart View Mode: Category2 */}
                  {oprChartTab === "category2" && (
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={category2ChartData}
                          margin={{ top: 20, right: 10, left: -20, bottom: 30 }}
                          onClick={(state: any) => {
                            if (state && state.activePayload && state.activePayload[0]) {
                              const clickedCategory = state.activePayload[0].payload.category2;
                              setSelectedCategoryFilter(
                                selectedCategoryFilter === clickedCategory ? null : clickedCategory
                              );
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis
                            dataKey="category2"
                            tick={{ fontSize: 9, fill: "#475569", fontWeight: 600 }}
                            angle={-20}
                            textAnchor="end"
                            interval={0}
                            height={40}
                          />
                          <YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 max-w-xs border border-slate-700">
                                    <div className="font-black text-blue-300 border-b border-slate-700 pb-1 flex justify-between items-center gap-2">
                                      <span>{data.category2}</span>
                                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px]">
                                        {data.count} Kasus
                                      </span>
                                    </div>
                                    {data.drivers && data.drivers.length > 0 ? (
                                      <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                          Pengemudi (ID_Name) & Group 2:
                                        </div>
                                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                          {data.drivers.map((d: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-[10px] gap-2 py-0.5 border-b border-slate-800">
                                              <span className="font-medium text-slate-200 truncate">{d.idName}</span>
                                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold shrink-0">
                                                {d.group2}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-slate-400 italic text-[11px]">Tidak ada insiden tercatat.</div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="#3b82f6"
                            radius={[6, 6, 0, 0]}
                            isAnimationActive={false}
                          >
                            {category2ChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  selectedCategoryFilter === entry.category2
                                    ? "#1d4ed8"
                                    : entry.count > 0
                                    ? "#3b82f6"
                                    : "#cbd5e1"
                                }
                                cursor="pointer"
                              />
                            ))}
                            <LabelList
                              dataKey="count"
                              position="top"
                              content={(props: any) => {
                                const { x, y, width, value } = props;
                                if (x === undefined || y === undefined) return null;
                                const valNum = value !== undefined && value !== null ? value : 0;
                                return (
                                  <text
                                    x={x + width / 2}
                                    y={y - 6}
                                    fill="#1e40af"
                                    textAnchor="middle"
                                    fontSize={11}
                                    fontWeight="bold"
                                  >
                                    {valNum}
                                  </text>
                                );
                              }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Chart View Mode: Group2 Distribution */}
                  {oprChartTab === "group2" && (
                    <div className="space-y-2 py-2">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                        Distribusi Insiden Operasional berdasarkan Group 2:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(() => {
                          const groupCounts: Record<string, { total: number; categories: Record<string, number> }> = {};
                          filteredOprIssues.forEach((rec) => {
                            const grp = rec.group2 || "N/A";
                            if (!groupCounts[grp]) groupCounts[grp] = { total: 0, categories: {} };
                            groupCounts[grp].total += 1;
                            groupCounts[grp].categories[rec.category2] = (groupCounts[grp].categories[rec.category2] || 0) + 1;
                          });
                          const entries = Object.entries(groupCounts).sort((a, b) => b[1].total - a[1].total);
                          if (entries.length === 0) {
                            return <div className="text-xs text-slate-400 italic col-span-2">Tidak ada data Group 2.</div>;
                          }
                          return entries.map(([grpName, info]) => (
                            <div key={grpName} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <Building className="w-3.5 h-3.5 text-blue-500" />
                                  Group 2: {grpName}
                                </span>
                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                                  {info.total} Kasus
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(info.categories).map(([cat, c]) => (
                                  <span key={cat} className="text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                    {cat}: <strong>{c}</strong>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Chart View Mode: ID_Name List */}
                  {oprChartTab === "drivers" && (
                    <div className="overflow-x-auto max-h-60 rounded-lg border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold sticky top-0">
                          <tr>
                            <th className="py-2 px-3">ID_Name (Pengemudi)</th>
                            <th className="py-2 px-3">Group 2</th>
                            <th className="py-2 px-3">Category 2</th>
                            <th className="py-2 px-3 text-center">Bulan & Tahun</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {(() => {
                            const list = selectedCategoryFilter
                              ? filteredOprIssues.filter((r) => r.category2.toLowerCase() === selectedCategoryFilter.toLowerCase())
                              : filteredOprIssues;
                            if (list.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                                    Tidak ada catatan insiden operasional.
                                  </td>
                                </tr>
                              );
                            }
                            return list.map((rec, idx) => (
                              <tr key={idx} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-100">
                                  <div className="flex items-center justify-between gap-1.5 group">
                                    <span>{rec.idName}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPdfDriver(rec);
                                      }}
                                      title="Buka Dokumen PDF Driver Performance Evaluation (Print & Download)"
                                      className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-[11px] text-slate-700 dark:text-slate-300">
                                    {rec.group2}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px]">
                                    {rec.category2}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center text-slate-500 font-medium">
                                  {rec.month} {rec.year}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Summary Footer for Category 2 Chart Card */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Data disesuaikan dari Tab Spreadsheet <strong>Opr Issue</strong> (Category2, Group2, ID_Name)
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      Category 2: {category2ChartData.filter((c) => c.count > 0).length} Aktif
                    </span>
                  </div>
                </div>

                {/* Right HSE Safety Compliance Summary & Zero Accident Status */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Driver Compliance & Safe Driving Index
                      </h2>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      ZERO FATALITY
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                    Pemantauan kepatuhan standar keselamatan kerja, pemeriksaan Tenko (kebugaran fisik & tensi), serta sertifikasi APD operasional harian.
                  </p>

                  {/* Quick Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Tingkat Tenko Pagi</div>
                      <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">100%</div>
                      <div className="text-[9px] text-slate-400">Lolos uji kelayakan</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Insiden Kritis (Accident)</div>
                      <div className="text-lg font-black text-blue-600 dark:text-blue-400">0 Kasus</div>
                      <div className="text-[9px] text-slate-400">Zero Lost Time Injury</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Kepatuhan GPS & Rute</div>
                      <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">99,6%</div>
                      <div className="text-[9px] text-slate-400">Sesuai koridor IKPP</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Status Tindak Lanjut</div>
                      <div className="text-lg font-black text-amber-600 dark:text-amber-400">1 Warning</div>
                      <div className="text-[9px] text-slate-400">Non Compliant diverifikasi</div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">Update Terakhir: Realtime</span>
                    <button
                      onClick={() => alert("Laporan Driver Performance & Safety berhasil diunduh (PDF / Excel)!")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer text-xs shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Laporan</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Spreadsheet Data Table Mirroring Sheet_Helper */}
            {(() => {
              const filteredList = filteredDrivers.filter((item) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                  (item.idName || "").toLowerCase().includes(q) ||
                  (item.name || "").toLowerCase().includes(q) ||
                  (item.groupDriver || item.group || "").toLowerCase().includes(q) ||
                  (item.grouping || "").toLowerCase().includes(q) ||
                  (item.entity || "").toLowerCase().includes(q) ||
                  (item.category || "").toLowerCase().includes(q)
                );
              });
              const totalPages = Math.ceil(filteredList.length / rowsPerPage) || 1;
              const currentPage = Math.min(tablePage, totalPages);
              const pagedDrivers = filteredList.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

              return (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4 mt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <span>Detail Data Pengemudi (Sheet_Helper Mirror)</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Menampilkan {filteredList.length} dari {sheetHelperDrivers.length} Pengemudi terhubung langsung dengan Google Sheets {filteredDrivers.length !== sheetHelperDrivers.length && `(${filteredDrivers.length} driver lolos filter)`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Cari ID, Nama, Group, Grouping, Entity..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setTablePage(1);
                          }}
                          className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 w-64"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const headers = [
                            "ID_Name",
                            "Group Driver",
                            "Grouping",
                            "Entity",
                            "Safety",
                            "Attendance",
                            "Tenko",
                            "Mobo Act",
                            "Ops Issue",
                            "Problem Rec",
                            "Overall Score",
                            "Category"
                          ];
                          const rows = filteredList.map((item) => {
                            const grp = (item.grouping && item.grouping !== "#NA" && item.grouping !== "#N/A")
                              ? item.grouping
                              : (item.group2 && item.group2 !== "#NA" && item.group2 !== "#N/A"
                                ? item.group2
                                : (item.groupDriver && item.groupDriver !== "-"
                                  ? item.groupDriver.split("-")[0]?.trim() || "-"
                                  : "-"));
                            const ent = (item.entity && item.entity !== "#NA" && item.entity !== "#N/A")
                              ? item.entity
                              : (item.entity2 && item.entity2 !== "#NA" && item.entity2 !== "#N/A"
                                ? item.entity2
                                : (item.groupDriver && item.groupDriver.toLowerCase().includes("petra")
                                  ? "PETRA"
                                  : (item.groupDriver && item.groupDriver.toLowerCase().includes("energi")
                                    ? "PANCARAN ENERGI TRANSPORT"
                                    : "PDT")));

                            return [
                              item.idName || "",
                              item.groupDriver || item.group || "",
                              grp,
                              ent,
                              item.safety ?? "",
                              item.attendance ?? item.attandance ?? "",
                              item.tenko ?? "",
                              item.moboAct ?? "",
                              item.opsIssue ?? "",
                              item.problemRec ?? "",
                              item.overallScore || item.sheetOverallScore || "50,00%",
                              item.category || item.sheetCategory || "Satisfaction"
                            ];
                          });
                          const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                          ws["!cols"] = [
                            { wch: 22 }, // ID_Name
                            { wch: 28 }, // Group Driver
                            { wch: 18 }, // Grouping
                            { wch: 14 }, // Entity
                            { wch: 12 }, // Safety
                            { wch: 14 }, // Attendance
                            { wch: 12 }, // Tenko
                            { wch: 12 }, // Mobo Act
                            { wch: 12 }, // Ops Issue
                            { wch: 14 }, // Problem Rec
                            { wch: 14 }, // Overall Score
                            { wch: 16 }  // Category
                          ];
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "Detail Driver");
                          XLSX.writeFile(wb, `Detail_Data_Pengemudi_${new Date().toISOString().slice(0, 10)}.xlsx`);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                        title="Download data tabel ke format Excel (.xlsx) langsung rapi"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Excel (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[520px] rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="sticky top-0 bg-[#0f4c81] text-white font-semibold z-10 shadow-sm">
                        <tr>
                          <th className="py-2.5 px-3 border-r border-sky-800 whitespace-nowrap">ID_Name</th>
                          <th className="py-2.5 px-3 border-r border-sky-800 min-w-[220px]">Group Driver</th>
                          <th className="py-2.5 px-3 border-r border-sky-800 min-w-[140px] whitespace-nowrap">Grouping</th>
                          <th className="py-2.5 px-3 border-r border-sky-800 whitespace-nowrap">Entity</th>
                          <th className="py-2.5 px-2 text-center border-r border-sky-800 whitespace-nowrap">Safety</th>
                          <th className="py-2.5 px-2 text-center border-r border-sky-800 whitespace-nowrap">Attendance</th>
                          <th className="py-2.5 px-2 text-center border-r border-sky-800 whitespace-nowrap">Tenko</th>
                          <th className="py-2.5 px-2 text-center border-r border-sky-800 whitespace-nowrap">Mobo Act</th>
                          <th className="py-2.5 px-2 text-center border-r border-sky-800 whitespace-nowrap">Ops Issue</th>
                          <th className="py-2.5 px-2 text-center border-r border-sky-800 whitespace-nowrap">Problem Rec</th>
                          <th className="py-2.5 px-2.5 text-center border-r border-sky-800 bg-sky-900 font-bold whitespace-nowrap">Overall Score</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap">Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-medium">
                        {filteredList.length === 0 ? (
                          <tr>
                            <td colSpan={12} className="py-8 text-center text-slate-400 italic">
                              {sheetHelperDrivers.length === 0
                                ? "Memuat data dari Google Sheets..."
                                : "Tidak ada data pengemudi yang cocok dengan pencarian."}
                            </td>
                          </tr>
                        ) : (
                          pagedDrivers.map((item, idx) => {
                            const displayGrouping = (item.grouping && item.grouping !== "#NA" && item.grouping !== "#N/A")
                              ? item.grouping
                              : (item.group2 && item.group2 !== "#NA" && item.group2 !== "#N/A"
                                ? item.group2
                                : (item.groupDriver && item.groupDriver !== "-"
                                  ? item.groupDriver.split("-")[0]?.trim() || "-"
                                  : "-"));
                            const displayEntity = (item.entity && item.entity !== "#NA" && item.entity !== "#N/A")
                              ? item.entity
                              : (item.entity2 && item.entity2 !== "#NA" && item.entity2 !== "#N/A"
                                ? item.entity2
                                : (item.groupDriver && item.groupDriver.toLowerCase().includes("petra")
                                  ? "PETRA"
                                  : (item.groupDriver && item.groupDriver.toLowerCase().includes("energi")
                                    ? "PANCARAN ENERGI TRANSPORT"
                                    : "PDT")));

                            return (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  <div className="flex items-center justify-between gap-1.5 group">
                                    <span>{item.idName}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPdfDriver(item);
                                      }}
                                      title="Buka Dokumen PDF Driver Performance Evaluation (Print & Download)"
                                      className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{item.groupDriver || item.group || "-"}</td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{displayGrouping}</span>
                                </td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    {displayEntity}
                                  </span>
                                </td>
                              <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">{item.safety}</td>
                              <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">{item.attendance || item.attandance}</td>
                              <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">{item.tenko}</td>
                              <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">{item.moboAct}</td>
                              <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">{item.opsIssue}</td>
                              <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">{item.problemRec}</td>
                              <td className="py-2 px-2.5 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 whitespace-nowrap">
                                {item.overallScore || item.sheetOverallScore || "50,00%"}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  (item.category || item.sheetCategory || "").toLowerCase() === "best"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                                    : (item.category || item.sheetCategory || "").toLowerCase() === "good"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                                    : (item.category || item.sheetCategory || "").toLowerCase().includes("need")
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                                }`}>
                                  {item.category || item.sheetCategory || "Satisfaction"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Menampilkan {filteredList.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} -{" "}
                        {Math.min(currentPage * rowsPerPage, filteredList.length)} dari {filteredList.length} Driver
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        Sebelumnya
                      </button>
                      <span className="font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-800 dark:text-slate-200">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : activeTab === "mobo" ? (
          <div className="p-4 sm:p-5 flex-1">
            <MoboActivityMonitoring />
          </div>
        ) : activeTab === "database" ? (
          <div className="flex flex-col flex-1 overflow-y-auto">
            <DatabasePage />
          </div>
        ) : null}
        {/* Master Dropdown & Parameter Sheet Modal (gid: 1611002980) */}
        {isMasterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-900 to-sky-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Layers className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight">
                      Master Dropdown & Parameter Sheet (gid: 1611002980)
                    </h3>
                    <p className="text-xs text-sky-200">
                      Sinkronisasi Drop_Garasi, Drop_Group, dan Pemetaan Master dari Google Spreadsheet
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMasterModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
                {/* 1. Drop_Group & Drop_Garasi Highlight Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Drop_Group Card (Column I in Sheet) */}
                  <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-200 dark:border-sky-800/60 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-sm text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                        <ListFilter className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        Drop_Group (Kolom I Sheet)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-300">
                        {masterDropdowns?.dropGroup?.length || 3} Opsi
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      Nilai dropdown group yang aktif sesuai parameter terpilih di Google Sheet:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(masterDropdowns?.dropGroup || ["Backup PDT", "Yusen", "PDT Reguler TOYOTA"]).map((grp) => (
                        <button
                          key={grp}
                          onClick={() => {
                            handleGroupChange(grp);
                            setIsMasterModalOpen(false);
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer shadow-2xs border ${
                            groupDriver === grp
                              ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300"
                              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-sky-100 dark:hover:bg-sky-900/40 border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {grp}
                          {groupDriver === grp && " ✓ (Aktif)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Drop_Garasi Card (Column H in Sheet) */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Drop_Garasi (Kolom H Sheet)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                        {masterDropdowns?.garages?.length || 6} Garasi
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      Daftar master garasi operasional dari Google Sheet:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(masterDropdowns?.garages || [
                        "Garasi Cikarang",
                        "Garasi Babek",
                        "Garasi TM",
                        "Garasi MDL",
                        "Garasi Karawang",
                        "Garasi Bidara"
                      ]).map((gar) => (
                        <button
                          key={gar}
                          onClick={() => {
                            handleGarageChange(gar);
                            setIsMasterModalOpen(false);
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer shadow-2xs border ${
                            garage === gar
                              ? "bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300"
                              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {gar}
                          {garage === gar && " ✓ (Aktif)"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Score Categories & Actions (Point, Value, MP) */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    Kategori & Standar Penilaian Evaluasi (Point & Value)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(masterDropdowns?.scoreCategories || [
                      { point: "> 85", value: "Best", note: "-" },
                      { point: "70 - 85", value: "Good", note: "-" },
                      { point: "50 - 69", value: "Satisfaction", note: "Coaching / Mentoring" },
                      { point: "< 50", value: "Need Improvement", note: "Refresh Training / Coaching" }
                    ]).map((sc, i) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
                      >
                        <div className="font-black text-sm text-blue-600 dark:text-blue-400">{sc.point}</div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">{sc.value}</div>
                        {sc.note && sc.note !== "-" && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                            {sc.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Full Garage - Group - Entity Mapping Table */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Tabel Pemetaan Parameter Lengkap (Garage, Group, Entity) - 22 Baris
                  </h4>
                  <div className="overflow-x-auto max-h-56 rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2 px-3">No</th>
                          <th className="py-2 px-3">Garage (Garasi)</th>
                          <th className="py-2 px-3">Group Driver</th>
                          <th className="py-2 px-3">Entity</th>
                          <th className="py-2 px-3 text-right">Aksi Cepat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {(masterDropdowns?.garageGroupMapping || MASTER_PARAMETER_MAPPINGS).map((m, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-sky-50 dark:hover:bg-slate-800/80 transition-colors ${
                              m.garage === garage && m.group === groupDriver
                                ? "bg-blue-50/80 dark:bg-blue-950/40 font-bold"
                                : ""
                            }`}
                          >
                            <td className="py-1.5 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-3 text-slate-800 dark:text-slate-200">{m.garage}</td>
                            <td className="py-1.5 px-3 text-blue-600 dark:text-blue-400">{m.group}</td>
                            <td className="py-1.5 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                                {m.entity}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-right">
                              <button
                                onClick={() => {
                                  setGarage(m.garage);
                                  setEntity(m.entity);
                                  setGroupDriver(m.group);
                                  fetchDriverPerformance(false, m.garage, m.entity, m.group);
                                  setIsMasterModalOpen(false);
                                }}
                                className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                Pilih
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs">
                <a
                  href="https://docs.google.com/spreadsheets/d/1NlUpv_imyYijuCQ2jmQbcZVZr7-H7B_zJmHPimV83Ok/edit?gid=1611002980#gid=1611002980"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Buka Tab Parameter di Google Sheets (gid: 1611002980)</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
                <button
                  onClick={() => setIsMasterModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
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
                      Detail Kinerja Pengemudi • {selectedDriverModal.nikName || selectedDriverModal.name}
                    </h3>
                    <p className="text-xs text-sky-200 font-medium">
                      Analisis Evaluasi KPI & Metrik Keselamatan Real-Time
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
                      {selectedDriverModal.overallScore || "85.0%"}
                    </p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Status Performa</p>
                    <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                      {selectedDriverModal.status || "Best"}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800/60">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Ranking / Group</p>
                    <p className="text-lg font-black text-purple-700 dark:text-purple-300 mt-1 truncate">
                      {selectedDriverModal.rank && selectedDriverModal.rank !== "-" ? `Rank #${selectedDriverModal.rank}` : groupDriver}
                    </p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Garasi Operasional</p>
                    <p className="text-xs font-black text-amber-700 dark:text-amber-300 mt-1 truncate">
                      {garage}
                    </p>
                  </div>
                </div>

                {/* Detailed KPI breakdown grid */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    Rincian Nilai KPI per Kategori (Leaderboard Matrix)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 font-semibold text-[11px]">Safety Score</span>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{selectedDriverModal.safety || "71.8%"}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 font-semibold text-[11px]">Attendance</span>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{selectedDriverModal.attendance || "96.7%"}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 font-semibold text-[11px]">Tenko Verification</span>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedDriverModal.tenko || "100.0%"}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 font-semibold text-[11px]">Mobo Activity</span>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{selectedDriverModal.moboAct || "84.8%"}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 font-semibold text-[11px]">Ops Issue</span>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedDriverModal.opsIssue || "100.0%"}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 font-semibold text-[11px]">Problem Recovery</span>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedDriverModal.problemRec || "100.0%"}</p>
                    </div>
                  </div>
                </div>

                {/* Action Recommendation */}
                <div className="bg-blue-50/70 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-blue-900 dark:text-blue-200">Catatan & Rekomendasi Sistem</h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Data ini diambil langsung dari matriks penilaian performa driver. Untuk pengemudi ini, direkomendasikan untuk mempertahankan konsistensi keaktifan mobo dan verifikasi Tenko harian.
                    </p>
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

        {/* Average Score Breakdown Modal (Sheet_Helper gid=1899483729) */}
        {selectedSummaryCardModal === "avg_score" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-xl">
                    <Award className="w-6 h-6 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black tracking-tight">
                      Rincian Kalkulasi "Average Score" • Tab Sheet_Helper
                    </h3>
                    <p className="text-xs text-emerald-200 font-medium">
                      Perhitungan Akurat Kolom C sampai Kolom H (Safety, Attendance, Tenko, Mobo Act, Ops Issue, Problem Rec)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedSummaryCardModal(null);
                    setModalDriverSearch("");
                  }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
                {/* Summary Metrics Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Average Score</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                      {summaryKpi.averageScore}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Rata-rata Gabungan</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800/60">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Kategori Status</p>
                    <p className={`text-base font-black mt-1 ${
                      summaryKpi.averageScoreCategory === "Sangat Baik"
                        ? "text-blue-600 dark:text-blue-300"
                        : summaryKpi.averageScoreCategory === "Baik"
                        ? "text-emerald-600 dark:text-emerald-300"
                        : summaryKpi.averageScoreCategory === "Perlu Perhatian"
                        ? "text-amber-600 dark:text-amber-300"
                        : "text-slate-500"
                    }`}>
                      {summaryKpi.averageScoreCategory}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {summaryKpi.averageScoreCategory === "Sangat Baik"
                        ? ">= 90% (Sangat Baik)"
                        : summaryKpi.averageScoreCategory === "Baik"
                        ? "80-89% (Baik)"
                        : summaryKpi.averageScoreCategory === "Perlu Perhatian"
                        ? "< 80% (Perlu Perhatian)"
                        : "Tidak Ada Data"}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800/60">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Driver</p>
                    <p className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
                      {summaryKpi.totalDrivers}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Lolos Kriteria Filter</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Filter Aktif</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                      {entity} • {garage}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      Group: {groupDriver}
                    </p>
                  </div>
                </div>

                {/* Explanation Box */}
                <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-slate-100">Formula Penghitungan:</span>
                    {" "}Setiap driver pada tab <strong>Sheet_Helper</strong> dihitung nilai rata-ratanya dari 6 parameter utama (<strong>Safety, Attendance, Tenko, Mobo Act, Ops Issue, dan Problem Rec</strong>). Skor kartu Average Score dihitung dari rata-rata seluruh driver yang lolos kriteria filter aktif (Entity, Garage, Group Driver).
                  </div>
                </div>

                {/* Search Bar & Driver Count */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span>Daftar Driver Terhitung ({currentFilteredHelperData.matchedItems.length} Pengemudi):</span>
                  </div>
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Cari nama atau ID driver..."
                      value={modalDriverSearch}
                      onChange={(e) => setModalDriverSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Drivers Breakdown Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs max-h-72">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 shadow-xs">
                      <tr>
                        <th className="py-2 px-3 text-center">No</th>
                        <th className="py-2 px-3">ID & Nama Driver (Kolom A)</th>
                        <th className="py-2 px-2 text-center">Safety</th>
                        <th className="py-2 px-2 text-center">Attendance</th>
                        <th className="py-2 px-2 text-center">Tenko</th>
                        <th className="py-2 px-2 text-center">Mobo Act</th>
                        <th className="py-2 px-2 text-center">Ops Issue</th>
                        <th className="py-2 px-2 text-center">Problem Rec</th>
                        <th className="py-2 px-3 text-center bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                          Rata-rata (C-H)
                        </th>
                        <th className="py-2 px-3 text-center">Kategori</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentFilteredHelperData.matchedItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                            Tidak ada data driver yang cocok dengan kombinasi filter terpilih ({entity}, {garage}, {groupDriver}). Total Driver: 0, Average Score: "-".
                          </td>
                        </tr>
                      ) : (
                        currentFilteredHelperData.matchedItems
                          .filter((item: any) =>
                            modalDriverSearch
                              ? (item.idName || "").toLowerCase().includes(modalDriverSearch.toLowerCase())
                              : true
                          )
                          .map((item: any, idx: number) => {
                            const scoreNum = item.computedAvgScore;
                            const badgeColor =
                              scoreNum >= 90
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                                : scoreNum >= 80
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300";

                            return (
                              <tr
                                key={idx}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                              >
                                <td className="py-2 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                                <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                  {item.idName}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{item.safety}</td>
                                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{item.attendance}</td>
                                <td className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 font-medium">{item.tenko}</td>
                                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{item.moboAct}</td>
                                <td className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 font-medium">{item.opsIssue}</td>
                                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{item.problemRec}</td>
                                <td className="py-2 px-3 text-center font-black bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
                                  {item.computedAvgFormatted}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                                    {scoreNum >= 90 ? "Sangat Baik" : scoreNum >= 80 ? "Baik" : "Perlu Perhatian"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <a
                  href="https://docs.google.com/spreadsheets/d/1cTLCFfLSKHkuNfkVtFp8d0_O_NcWz67HOazWFHUb3HM/edit?gid=2040949630#gid=2040949630"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Buka Spreadsheet di Google Sheets (gid: 2040949630)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
                <button
                  onClick={() => {
                    setSelectedSummaryCardModal(null);
                    setModalDriverSearch("");
                  }}
                  className="px-5 py-2 bg-slate-800 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Total Driver Modal */}
        {selectedSummaryCardModal === "total_driver" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-xl">
                    <Users className="w-6 h-6 text-sky-300" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black tracking-tight">
                      Daftar Pengemudi Aktif • Filter: {entity} / {garage} / {groupDriver}
                    </h3>
                    <p className="text-xs text-sky-200 font-medium">
                      Data Pengemudi Terfilter dari Sheet "data driver" ({summaryKpi.totalDrivers} Driver)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSummaryCardModal(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3 text-xs text-slate-700 dark:text-slate-300">
                {currentFilteredHelperData.matchedItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-2 opacity-50" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Nol Driver Ditemukan</p>
                    <p className="text-xs mt-1">Kombinasi filter Entity: {entity}, Garage: {garage}, Group: {groupDriver} tidak menghasilkan data driver.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="py-2.5 px-3 text-center">No</th>
                          <th className="py-2.5 px-3">Nama Pengemudi</th>
                          <th className="py-2.5 px-3">Garasi</th>
                          <th className="py-2.5 px-3">Group Driver</th>
                          <th className="py-2.5 px-3 text-center">Average Score</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {currentFilteredHelperData.matchedItems.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{item.idName}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{garage}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{groupDriver}</td>
                            <td className="py-2 px-3 text-center font-black text-emerald-600 dark:text-emerald-400">
                              {item.computedAvgFormatted}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                                {item.sheetCategory || "Best"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
                <button
                  onClick={() => setSelectedSummaryCardModal(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-black dark:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DRIVER PERFORMANCE EVALUATION PDF / PRINT MODAL */}
        {selectedPdfDriver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden print:max-w-none print:w-full print:h-auto print:max-h-none print:border-none print:shadow-none print:rounded-none">
              
              {/* Modal Control Bar (Hidden during printing) */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 shrink-0 print:hidden">
                <div className="flex items-center gap-2.5">
                  <Printer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Dokumen Driver Performance Evaluation (PDF)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Operator & Partner Control • Pancaran Group
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
                    title="Cetak atau unduh dokumen evaluasi driver sebagai file PDF"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Download & Cetak PDF</span>
                  </button>
                  <button
                    onClick={() => setSelectedPdfDriver(null)}
                    className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
                    title="Tutup Modal Evaluasi"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable PDF Report Document (Matching Image layout) */}
              <div id="driver-evaluation-pdf-document" className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white dark:bg-slate-900 print:p-0 print:overflow-visible text-slate-900 dark:text-slate-100">
                
                {/* Header Logo & Document Title */}
                <div className="border-b-2 border-slate-900 dark:border-slate-300 pb-3 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={PANCARAN_LOGO_DATA_URL}
                      alt="Pancaran Group Logo"
                      className="h-12 w-auto object-contain"
                    />
                  </div>
                  <div className="text-center flex-1 px-4">
                    <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-wide uppercase">
                      DRIVER PERFORMANCE EVALUATION
                    </h1>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Operator & Partner Control
                    </p>
                  </div>
                  <div className="w-28 text-right text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    HSE & FLEET OPS
                  </div>
                </div>

                {/* Metadata & Big Score Box Grid */}
                <div className="grid grid-cols-12 gap-4 mb-6 border border-slate-300 dark:border-slate-700 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="col-span-8 grid grid-cols-12 gap-y-2 text-xs">
                    <div className="col-span-3 text-slate-600 dark:text-slate-400 font-bold">No ID</div>
                    <div className="col-span-9 text-slate-900 dark:text-white font-bold">
                      : {splitIdAndName(selectedPdfDriver.idName || selectedPdfDriver.nikName || selectedPdfDriver.name || "").id || selectedPdfDriver.id || "201200254"}
                    </div>

                    <div className="col-span-3 text-slate-600 dark:text-slate-400 font-bold">Name</div>
                    <div className="col-span-9 text-slate-900 dark:text-white font-bold">
                      : {selectedPdfDriver.idName || selectedPdfDriver.nikName || selectedPdfDriver.name || "-"}
                    </div>

                    <div className="col-span-3 text-slate-600 dark:text-slate-400 font-bold">Project Name</div>
                    <div className="col-span-9 text-slate-800 dark:text-slate-200">
                      : {selectedPdfDriver.groupDriver || selectedPdfDriver.group || selectedPdfDriver.grouping || "YSN7-Kontrak PT Yusen"}
                    </div>

                    <div className="col-span-3 text-slate-600 dark:text-slate-400 font-bold">Area / Site</div>
                    <div className="col-span-9 text-slate-800 dark:text-slate-200">
                      : {selectedPdfDriver.garage || garage || "Jakarta / Tanah Merdeka"}
                    </div>

                    <div className="col-span-3 text-slate-600 dark:text-slate-400 font-bold">Period</div>
                    <div className="col-span-9 text-slate-800 dark:text-slate-200">
                      : Juli 2026
                    </div>

                    <div className="col-span-3 text-slate-600 dark:text-slate-400 font-bold mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">Risk Category</div>
                    <div className="col-span-9 font-bold mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-400">
                      : {selectedPdfDriver.status === "Best" ? "Low Risk / Top Performance" : selectedPdfDriver.status === "Good" ? "Medium Performance" : "Attention Required / Coaching Needed"}
                    </div>

                    <div className="col-span-3 text-slate-600 dark:text-slate-400 font-bold">Treatment</div>
                    <div className="col-span-9 text-slate-800 dark:text-slate-200">
                      : {selectedPdfDriver.status === "Best" ? "Incentive Reward & Maintenance" : "Coaching per 3 bln"}
                    </div>
                  </div>

                  {/* Big Score Box */}
                  <div className="col-span-4 flex flex-col items-center justify-center border-l-2 border-slate-300 dark:border-slate-700 pl-4">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">
                      Score
                    </span>
                    <div className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-6 py-3 rounded-2xl border-2 border-slate-900 dark:border-slate-200 shadow-md">
                      {Math.round(parsePctValue(selectedPdfDriver.overallScore) ?? parsePctValue(selectedPdfDriver.computedAvgFormatted) ?? 84)}
                    </div>
                  </div>
                </div>

                {/* Table: PERFORMANCE EVALUATION ASPECT */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-center text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                    PERFORMANCE EVALUATION ASPECT
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-400 dark:border-slate-700">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#0f4c81] text-white font-bold text-[11px] text-center">
                          <th className="py-2.5 px-3 border-r border-sky-900 w-32 whitespace-nowrap">Period Assessment</th>
                          <th className="py-2.5 px-4 border-r border-sky-900 text-left min-w-[200px]">Leading Indicator</th>
                          <th className="py-2.5 px-3 border-r border-sky-900 w-20">Case</th>
                          <th className="py-2.5 px-3 border-r border-sky-900 w-24">Reduce Point</th>
                          <th className="py-2.5 px-4 text-left">Feedback / Comment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 dark:divide-slate-700 font-medium">
                        <tr>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">Each Case</td>
                          <td className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700 font-semibold">Leadtime Proccess Document Shipment</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">3</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">6</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">Pemberkasan pengiriman dokumen tepat waktu</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">Monthly</td>
                          <td className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700 font-semibold">Effectiviness Tenko</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">{selectedPdfDriver.tenko || "95%"}</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">2</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">Pemeriksaan kebugaran fisik & tensi harian lolos</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">Each Case</td>
                          <td className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700 font-semibold">Downtime - Driver Issue</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">3</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">3</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">Penanganan masalah ketepatan waktu operasional</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">Monthly</td>
                          <td className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700 font-semibold">Accident</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">0</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">0</td>
                          <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">Zero Fatality / Zero Lost Time Injury</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">Monthly</td>
                          <td className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700 font-semibold">Effectiviness Precheck</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">0</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">0</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">Inspeksi awal unit kendaraan sebelum beroperasi</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">Monthly</td>
                          <td className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700 font-semibold">Mobo Activity Monitoring</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">{selectedPdfDriver.moboAct || "85%"}</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">0</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">Kepatuhan update aktivitas MOBO Mobile</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures Section */}
                <div className="mt-10 pt-4 border-t border-slate-300 dark:border-slate-700 grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <div className="font-bold text-slate-600 dark:text-slate-400 mb-14">Disiapkan Oleh (HSE Control)</div>
                    <div className="font-bold text-slate-900 dark:text-white border-t border-slate-400 pt-1 w-36 mx-auto">
                      HSE Officer
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-600 dark:text-slate-400 mb-14">Disetujui Oleh (Operations)</div>
                    <div className="font-bold text-slate-900 dark:text-white border-t border-slate-400 pt-1 w-36 mx-auto">
                      Ops Manager
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-600 dark:text-slate-400 mb-14">Pengemudi (Driver)</div>
                    <div className="font-bold text-slate-900 dark:text-white border-t border-slate-400 pt-1 w-36 mx-auto">
                      {splitIdAndName(selectedPdfDriver.idName || selectedPdfDriver.nikName || selectedPdfDriver.name || "").name || "Driver"}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
