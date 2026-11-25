export type UnitStatus = "utilized" | "standby" | "downtime" | "" | "-";

export interface FleetUnit {
  unitId: string;
  unitType: string;
  status: UnitStatus;
  lastLocation: string;
  lastUpdate: string;
  downtimeCategory?: string;
  problemCode?: string;
  keterangan?: string;
  kategori1?: string;
  kategori2?: string;
  kategori3?: string;
}

export interface PaIkppMetrics {
  lastUpdated: string;
  sheetDate: string;
  spreadsheetUrl: string;
  matchedCount: number;
  availableDates?: string[];
  shift1: {
    totalUnits: number;
    avgAvailabilityPct: number;
    avgUtilizationPct: number;
    avgDowntimePct: number;
    avgStandbyPct: number;
  };
  shift2: {
    totalUnits: number;
    avgAvailabilityPct: number;
    avgUtilizationPct: number;
    avgDowntimePct: number;
    avgStandbyPct: number;
  };
}

export const PA_IKPP_SPREADSHEET_ID = "1z_AYm7wJnOtY8flM9WUZ4kgdeTIwjXVQ-rGl-gjqJSQ";
export const PA_IKPP_GID = "1219168853";

export const TARGET_PA_IKPP_PLATES: string[] = [
  "B9814UFY", "B9713UIW", "B9928UWW", "B9790UFY", "B9849UFY", "B9847UFY", "B9739UIW", "B9697UIW",
  "B9851UFY", "B9007UEI", "B9998UIY", "B9961UWW", "B9839UWW", "B9712UIW", "B9813UFY", "B9788UFY",
  "B9174UIV", "B9968UIY", "B9980UIV", "B9131XQ",  "B9708UIW", "B9782UFY", "B9852UFY", "B9848UFY",
  "B9018UGY", "B9710UIW", "B9792UFY", "B9677UIW", "B9786UFY", "B9628UIW", "B9014UGY", "B9784UFY",
  "B9635UIW", "B9012UGY", "B9167UIZ", "B9700UIW", "B9987UIV", "B9169XQ",  "B9239UIZ", "B9472UEM",
  "B9815UFY", "B9781UFY", "B9985UIV", "B9831UWW", "B9816UFY", "B9833UWW", "B9699UIW", "B9013UGY",
  "B9850UFY", "B9952UWW", "B9780UFY", "B9787UFY", "B9021UGY", "B9783UFY", "B9250UIZ", "B9846UFY",
  "B9811UFY", "B9791UFY", "B9160UGY", "B9161UGY", "B9162UGY", "B9168UGY", "B9169UGY", "B9166UGY",
  "B9163UGY", "B9164UGY", "B9165UGY", "B9167UGY", "B9170UGY", "B9187UGY", "B9225UGY", "B9226UGY",
  "B9223UGY", "B9224UGY", "B9484UEM", "B9679UIW", "B9837UWW"
];

const CS_SOTO_MASTER_DICTIONARY: Record<string, {
  code: string;
  keterangan: string;
  kategori1: string;
  kategori2: string;
  kategori3: "AVAILABILITY" | "DOWNTIME";
  status: UnitStatus;
  downtimeCategory?: string;
}> = {
  "OPR0": { code: "OPR0", keterangan: "OPERASI 0 kali", kategori1: "01. OPERATE", kategori2: "UTILISASI", kategori3: "AVAILABILITY", status: "utilized" },
  "OPR1": { code: "OPR1", keterangan: "OPERASI 1 Kali", kategori1: "01. OPERATE", kategori2: "UTILISASI", kategori3: "AVAILABILITY", status: "utilized" },
  "OPR2": { code: "OPR2", keterangan: "OPERASI 2 Kali", kategori1: "01. OPERATE", kategori2: "UTILISASI", kategori3: "AVAILABILITY", status: "utilized" },
  "OPR3": { code: "OPR3", keterangan: "OPERASI 3 Kali", kategori1: "01. OPERATE", kategori2: "UTILISASI", kategori3: "AVAILABILITY", status: "utilized" },
  "OPR4": { code: "OPR4", keterangan: "OPERASI 4 Kali", kategori1: "01. OPERATE", kategori2: "UTILISASI", kategori3: "AVAILABILITY", status: "utilized" },
  "OPR5": { code: "OPR5", keterangan: "OPERASI 5 Kali", kategori1: "01. OPERATE", kategori2: "UTILISASI", kategori3: "AVAILABILITY", status: "utilized" },
  "OPRR1": { code: "OPRR1", keterangan: "OPERASI 1 Kali (Repo)", kategori1: "01. OPERATE", kategori2: "UTILISASI", kategori3: "AVAILABILITY", status: "utilized" },
  "OPRR2": { code: "OPRR2", keterangan: "OPERASI 2 Kali (Repo)", kategori1: "01. OPERATE", kategori2: "UTILISASI", kategori3: "AVAILABILITY", status: "utilized" },
  "OPRR3": { code: "OPRR3", keterangan: "OPERASI 3 Kali (Repo)", kategori1: "01. OPERATE", kategori2: "UTILISASI", kategori3: "AVAILABILITY", status: "utilized" },
  "OUT1": { code: "OUT1", keterangan: "DIPINJAM", kategori1: "02. DIPINJAM KE LUAR PDT", kategori2: "UTILISASI", kategori3: "AVAILABILITY", status: "utilized" },
  "RPL1": { code: "RPL1", keterangan: "Replace Unit Kontrak", kategori1: "02. REPLACED", kategori2: "UTILISASI", kategori3: "AVAILABILITY", status: "utilized" },
  "DRV1": { code: "DRV1", keterangan: "Drv Izin", kategori1: "06. DRIVER ISSUE", kategori2: "DT DRIVER", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "NO DRIVER (DOWNTIME)" },
  "DRV2": { code: "DRV2", keterangan: "Drv Alpha", kategori1: "06. DRIVER ISSUE", kategori2: "DT DRIVER", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "NO DRIVER (DOWNTIME)" },
  "DRV3": { code: "DRV3", keterangan: "Drv Sakit", kategori1: "06. DRIVER ISSUE", kategori2: "DT DRIVER", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "NO DRIVER (DOWNTIME)" },
  "DRV4": { code: "DRV4", keterangan: "Drv Perpanjang SIM", kategori1: "06. DRIVER ISSUE", kategori2: "DT DRIVER", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "NO DRIVER (DOWNTIME)" },
  "DRV5": { code: "DRV5", keterangan: "Drv Tolak Order", kategori1: "06. DRIVER ISSUE", kategori2: "DT DRIVER", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "NO DRIVER (DOWNTIME)" },
  "DRV6": { code: "DRV6", keterangan: "Safety Drv", kategori1: "06. DRIVER ISSUE", kategori2: "DT DRIVER", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "NO DRIVER (DOWNTIME)" },
  "DRV7": { code: "DRV7", keterangan: "Safety Unit", kategori1: "06. DRIVER ISSUE", kategori2: "DT DRIVER", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "NO DRIVER (DOWNTIME)" },
  "DRV8": { code: "DRV8", keterangan: "Proses Rekruitment", kategori1: "07. RECRUITMENT DRIVER", kategori2: "PROSES RECRUITMENT", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "NO DRIVER (DOWNTIME)" },
  "DRV9": { code: "DRV9", keterangan: "Training", kategori1: "06. DRIVER ISSUE", kategori2: "DT DRIVER", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "NO DRIVER (DOWNTIME)" },
  "DRV10": { code: "DRV10", keterangan: "Driver Backup", kategori1: "06. DRIVER ISSUE", kategori2: "DT DRIVER", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "NO DRIVER (DOWNTIME)" },
  "LCT1": { code: "LCT1", keterangan: "Selesai Perbaikan Menunggu", kategori1: "06. DRIVER ISSUE", kategori2: "DT DRIVER", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "NO DRIVER (DOWNTIME)" },
  "LCS1": { code: "LCS1", keterangan: "KEUR HEAD", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },
  "LCS2": { code: "LCS2", keterangan: "KEUR CHASIS", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },
  "LCS3": { code: "LCS3", keterangan: "STNK", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },
  "LCS4": { code: "LCS4", keterangan: "IBM", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },
  "LCS5": { code: "LCS5", keterangan: "TID", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },
  "LCS6": { code: "LCS6", keterangan: "Surat Surat Lainnya", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },
  "LKA1": { code: "LKA1", keterangan: "Unit Laka/Violation", kategori1: "09. REPAIR ACCIDENT", kategori2: "DT LAKA", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LAKA / REPAIR ACCIDENT" },
  "NEW1": { code: "NEW1", keterangan: "Persiapan Unit Baru/Menunggu", kategori1: "14. UNIT BARU", kategori2: "PERSIAPAN UNIT BARU", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "PERSIAPAN UNIT BARU" },
  "NEW2": { code: "NEW2", keterangan: "Persiapan Unit Baru/Kelengkapan", kategori1: "14. UNIT BARU", kategori2: "PERSIAPAN UNIT BARU", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "PERSIAPAN UNIT BARU" },
  "NEW3": { code: "NEW3", keterangan: "Project / Pengaktifan Unit", kategori1: "13. COMMERCIAL REQUEST", kategori2: "PERSIAPAN UNIT BARU", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "PERSIAPAN UNIT BARU" },
  "STB1": { code: "STB1", keterangan: "Standby No Order", kategori1: "03. STANDBY NO ORDER", kategori2: "STANDBY NO ORDER", kategori3: "AVAILABILITY", status: "standby" },
  "STB2": { code: "STB2", keterangan: "Standby Hari Libur", kategori1: "04. STANDBY HARI LIBUR", kategori2: "STANDBY HARI LIBUR", kategori3: "AVAILABILITY", status: "standby" },
  "STB3": { code: "STB3", keterangan: "Standby Unit Kontrak", kategori1: "05. STANDBY UNIT KONTRAK", kategori2: "STANDBY UNIT KONTRAK", kategori3: "AVAILABILITY", status: "standby" },
  "STB4": { code: "STB4", keterangan: "Standby Karena Cuaca/Kondisi", kategori1: "STANDBY FAKTOR CUACA/ROAD", kategori2: "STANDBY FAKTOR ALAM/ROAD", kategori3: "AVAILABILITY", status: "standby" },
  "WSP1": { code: "WSP1", keterangan: "Service", kategori1: "08. WORKSHOP", kategori2: "DT WSP", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "WORKSHOP / REPAIR" },
  "WSP2": { code: "WSP2", keterangan: "Perbaikan Karena Accident", kategori1: "09. REPAIR ACCIDENT", kategori2: "DT WSP", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "WORKSHOP / REPAIR" },
  "WSP3": { code: "WSP3", keterangan: "Storing/Perbaikan di Site", kategori1: "08. WORKSHOP", kategori2: "DT WSP", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "WORKSHOP / REPAIR" },
  "WSP4": { code: "WSP4", keterangan: "Perbaikan di WSP", kategori1: "08. WORKSHOP", kategori2: "DT WSP", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "WORKSHOP / REPAIR" },
  "WSP5": { code: "WSP5", keterangan: "Bekuan Mixer", kategori1: "10. BEKUAN MIXER", kategori2: "DT WSP", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "WORKSHOP / REPAIR" },
  "WSP6": { code: "WSP6", keterangan: "Project / Pengaktifan Unit", kategori1: "08. WORKSHOP", kategori2: "DT WSP", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "WORKSHOP / REPAIR" },
  "WSP7": { code: "WSP7", keterangan: "Antri Perbaikan", kategori1: "08. WORKSHOP", kategori2: "DT WSP", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "WORKSHOP / REPAIR" },
  "WSP8": { code: "WSP8", keterangan: "Menunggu Spare Part", kategori1: "18. WHS & PURCHASING", kategori2: "WAITING SPAREPART", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "WORKSHOP / REPAIR" },
  "WSP9": { code: "WSP9", keterangan: "Perbaikan Claim Asuransi", kategori1: "19. ASSET", kategori2: "DT ASURANSI", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "WORKSHOP / REPAIR" },
  "WSP10": { code: "WSP10", keterangan: "Claim Asuransi TLO", kategori1: "17. CLAIM ASURANSI", kategori2: "DT ASURANSI", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "WORKSHOP / REPAIR" },
  "WSP11": { code: "WSP11", keterangan: "Perbaikan Unit Di Vendor", kategori1: "15. WORKSHOP VENDOR", kategori2: "DT WSP", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "WORKSHOP / REPAIR" }
};

export function evaluateCsSotoMasterLookup(
  kat1Raw?: string,
  kat2Raw?: string,
  kat3Raw?: string,
  kategoriRaw?: string,
  kriteriaRaw?: string,
  problemCodeRaw?: string
): {
  status: UnitStatus;
  downtimeCategory?: string;
  keterangan?: string;
  kategori1?: string;
  kategori2?: string;
  kategori3?: string;
} {
  const problemCode = (problemCodeRaw || "").toUpperCase().trim();
  const kat1 = (kat1Raw || "").toUpperCase().trim();
  const kat2 = (kat2Raw || "").toUpperCase().trim();
  const kat3 = (kat3Raw || "").toUpperCase().trim();
  const kategori = (kategoriRaw || "").toUpperCase().trim();
  const kriteria = (kriteriaRaw || "").toUpperCase().trim();

  if (!problemCode) {
    return { status: "" };
  }

  if (CS_SOTO_MASTER_DICTIONARY[problemCode]) {
    const entry = CS_SOTO_MASTER_DICTIONARY[problemCode];
    return {
      status: entry.status,
      downtimeCategory: entry.downtimeCategory,
      keterangan: entry.keterangan,
      kategori1: entry.kategori1,
      kategori2: entry.kategori2,
      kategori3: entry.kategori3
    };
  }

  if (kat3 === "AVAILABILITY" || kat2 === "UTILISASI" || kat2 === "STANDBY NO ORDER") {
    return {
      status: kat2 === "STANDBY NO ORDER" ? "standby" : "utilized",
      keterangan: kriteria || kategori || problemCode,
      kategori1: kat1,
      kategori2: kat2,
      kategori3: kat3
    };
  }

  if (kat3 === "DOWNTIME" || kat2.startsWith("DT") || kat1.includes("WORKSHOP") || kat1.includes("DRIVER")) {
    return {
      status: "downtime",
      downtimeCategory: kat1.includes("DRIVER") ? "NO DRIVER (DOWNTIME)" : "WORKSHOP / REPAIR",
      keterangan: kriteria || kategori || problemCode,
      kategori1: kat1,
      kategori2: kat2,
      kategori3: kat3
    };
  }

  return { status: "" };
}

type ShiftPerformance = PaIkppMetrics["shift1"];

// Robust CSV parser handling multi-line quoted values
function parseCSVRecords(csvText: string): string[][] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRecord.push(currentCell.trim());
      currentCell = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRecord.push(currentCell.trim());
      if (currentRecord.some((c) => c.length > 0)) {
        records.push(currentRecord);
      }
      currentRecord = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentCell.trim());
    if (currentRecord.some((c) => c.length > 0)) {
      records.push(currentRecord);
    }
  }

  return records;
}

interface CacheEntry {
  timestamp: number;
  records: string[][];
  dateMap: Map<string, string[][]>;
  availableDates: string[];
}

let paIkppCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60000; // 60 seconds cache

const normalizedTargetPlates = new Set(
  TARGET_PA_IKPP_PLATES.map((p) => p.toLowerCase().replace(/\s+/g, ""))
);

export async function getPaIkppServerData(
  targetDate?: string,
  forceRefresh?: boolean
): Promise<{
  success: boolean;
  sheetDate: string;
  availableDates: string[];
  shift1: { allUnits: FleetUnit[]; csSotoUnits: FleetUnit[] };
  shift2: { allUnits: FleetUnit[]; csSotoUnits: FleetUnit[] };
  metrics: PaIkppMetrics;
}> {
  const now = Date.now();

  // Refresh cache if missing, expired, or forceRefresh requested
  if (!paIkppCache || forceRefresh || now - paIkppCache.timestamp > CACHE_TTL_MS) {
    const exportUrl = `https://docs.google.com/spreadsheets/d/${PA_IKPP_SPREADSHEET_ID}/export?format=csv&gid=${PA_IKPP_GID}`;
    const res = await fetch(exportUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch spreadsheet export (HTTP ${res.status})`);
    }

    const csvText = await res.text();
    const records = parseCSVRecords(csvText);

    // Build date map index
    const dateMap = new Map<string, string[][]>();
    for (let i = 1; i < records.length; i++) {
      const d = (records[i][1] || "").trim();
      if (d && d !== "Tanggal" && d.length >= 3) {
        if (!dateMap.has(d)) {
          dateMap.set(d, []);
        }
        dateMap.get(d)!.push(records[i]);
      }
    }

    // Available dates: newest first
    const availableDates = Array.from(dateMap.keys()).reverse();

    paIkppCache = {
      timestamp: now,
      records,
      dateMap,
      availableDates
    };
  }

  const { dateMap, availableDates } = paIkppCache;

  // Resolve target date
  let selectedDate = availableDates[0] || "11-Sep-2026";
  let matchedRows: string[][] = [];

  if (targetDate && targetDate.trim() !== "") {
    const cleanTarget = targetDate.trim().toLowerCase();
    // Direct match
    for (const [d, rows] of dateMap.entries()) {
      if (d.toLowerCase() === cleanTarget) {
        selectedDate = d;
        matchedRows = rows;
        break;
      }
    }
    // Partial or normalized fallback match
    if (matchedRows.length === 0) {
      for (const [d, rows] of dateMap.entries()) {
        const normD = d.toLowerCase().replace(/[\s\-_/]/g, "");
        const normT = cleanTarget.replace(/[\s\-_/]/g, "");
        if (normD === normT || normD.includes(normT) || normT.includes(normD)) {
          selectedDate = d;
          matchedRows = rows;
          break;
        }
      }
    }
  }

  if (matchedRows.length === 0) {
    selectedDate = availableDates[0] || "11-Sep-2026";
    matchedRows = dateMap.get(selectedDate) || [];
  }

  // Map rows to FleetUnit
  const mapRowToFleetUnit = (r: string[], shiftNum: 1 | 2): FleetUnit | null => {
    const plat = (r[2] || "").trim().toUpperCase();
    if (!plat || plat === "#N/A" || plat.length < 3) return null;

    const dbType = (r[4] || r[3] || "").toUpperCase();

    if (shiftNum === 1) {
      const kriteria = (r[7] || "").trim();
      const remarks = (r[8] || "").trim();
      const kategori = (r[9] || "").trim();
      const problem = (r[10] || "").trim();
      const kat1 = (r[11] || "").toUpperCase().trim();
      const kat2 = (r[12] || "").toUpperCase().trim();
      const kat3 = (r[13] || "").toUpperCase().trim();

      const s1Eval = evaluateCsSotoMasterLookup(kat1, kat2, kat3, kategori, kriteria, problem);
      const unitType = dbType.includes("20") ? "Trailer 4x2 20ft" : "Trailer 4x2 40ft";

      return {
        unitId: plat,
        unitType,
        status: s1Eval.status || "",
        downtimeCategory: s1Eval.downtimeCategory || undefined,
        problemCode: problem || undefined,
        keterangan: s1Eval.keterangan || undefined,
        kategori1: s1Eval.kategori1 || kat1 || undefined,
        kategori2: s1Eval.kategori2 || kat2 || undefined,
        kategori3: s1Eval.kategori3 || kat3 || undefined,
        lastLocation: kategori || (remarks ? remarks : "-"),
        lastUpdate: `${selectedDate} (Shift 1)`
      };
    } else {
      const kriteria = (r[16] || "").trim();
      const remarks = (r[17] || "").trim();
      const kategori = (r[18] || "").trim();
      const problem = (r[19] || "").trim();
      const kat1 = (r[20] || "").toUpperCase().trim();
      const kat2 = (r[21] || "").toUpperCase().trim();
      const kat3 = (r[22] || "").toUpperCase().trim();

      const s2Eval = evaluateCsSotoMasterLookup(kat1, kat2, kat3, kategori, kriteria, problem);
      const unitType = dbType.includes("20") ? "Trailer 4x2 20ft" : "Trailer 4x2 40ft";

      return {
        unitId: plat,
        unitType,
        status: s2Eval.status || "",
        downtimeCategory: s2Eval.downtimeCategory || undefined,
        problemCode: problem || undefined,
        keterangan: s2Eval.keterangan || undefined,
        kategori1: s2Eval.kategori1 || kat1 || undefined,
        kategori2: s2Eval.kategori2 || kat2 || undefined,
        kategori3: s2Eval.kategori3 || kat3 || undefined,
        lastLocation: kategori || (remarks ? remarks : "-"),
        lastUpdate: `${selectedDate} (Shift 2)`
      };
    }
  };

  // CS SOTO: Shift 1 filters Column G (Customer Shift 1) = INDAH KIAT
  // CS SOTO: Shift 2 filters Column P (Customer Shift 2) = INDAH KIAT
  const isCsSotoShift1Row = (r: string[]) => {
    const custShift1 = (r[6] || "").toUpperCase().trim();
    return custShift1.includes("INDAH KIAT");
  };

  const isCsSotoShift2Row = (r: string[]) => {
    const custShift2 = (r[15] || "").toUpperCase().trim();
    return custShift2.includes("INDAH KIAT");
  };

  const s1All = matchedRows
    .map((r) => mapRowToFleetUnit(r, 1))
    .filter((u): u is FleetUnit => u !== null);
  const s1CsSoto = matchedRows
    .filter(isCsSotoShift1Row)
    .map((r) => mapRowToFleetUnit(r, 1))
    .filter((u): u is FleetUnit => u !== null);

  const s2All = matchedRows
    .map((r) => mapRowToFleetUnit(r, 2))
    .filter((u): u is FleetUnit => u !== null);
  const s2CsSoto = matchedRows
    .filter(isCsSotoShift2Row)
    .map((r) => mapRowToFleetUnit(r, 2))
    .filter((u): u is FleetUnit => u !== null);

  // Calculate shift metrics for CS SOTO units
  const calculateShiftStats = (units: FleetUnit[]): ShiftPerformance => {
    // Only units with an evaluated status count towards total
    const evaluatedUnits = units.filter((u) => u.status === "utilized" || u.status === "standby" || u.status === "downtime");
    const total = evaluatedUnits.length;
    if (total === 0) {
      return {
        totalUnits: 0,
        avgAvailabilityPct: 0,
        avgUtilizationPct: 0,
        avgDowntimePct: 0,
        avgStandbyPct: 0
      };
    }

    const util = evaluatedUnits.filter((u) => u.status === "utilized").length;
    const standby = evaluatedUnits.filter((u) => u.status === "standby").length;
    const dt = evaluatedUnits.filter((u) => u.status === "downtime").length;
    const avail = util + standby;

    const calcPct = (val: number) =>
      Math.min(100, Math.max(0, parseFloat(((val / total) * 100).toFixed(2))));

    return {
      totalUnits: total,
      avgAvailabilityPct: calcPct(avail),
      avgUtilizationPct: calcPct(util),
      avgDowntimePct: calcPct(dt),
      avgStandbyPct: calcPct(standby)
    };
  };

  const s1Metrics = calculateShiftStats(s1CsSoto);
  const s2Metrics = calculateShiftStats(s2CsSoto);

  const nowTime = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return {
    success: true,
    sheetDate: selectedDate,
    availableDates,
    shift1: {
      allUnits: s1All,
      csSotoUnits: s1CsSoto
    },
    shift2: {
      allUnits: s2All,
      csSotoUnits: s2CsSoto
    },
    metrics: {
      shift1: s1Metrics,
      shift2: s2Metrics,
      lastUpdated: nowTime,
      matchedCount: s1CsSoto.length,
      sheetDate: selectedDate,
      availableDates,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${PA_IKPP_SPREADSHEET_ID}/edit?gid=${PA_IKPP_GID}#gid=${PA_IKPP_GID}`
    }
  };
}
