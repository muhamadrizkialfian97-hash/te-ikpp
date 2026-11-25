import { parseCSVRecords } from "./sheetsEngine";
import { FleetUnit, UnitStatus } from "../types";

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
export const PA_IKPP_URL = `https://docs.google.com/spreadsheets/d/${PA_IKPP_SPREADSHEET_ID}/edit?gid=${PA_IKPP_GID}#gid=${PA_IKPP_GID}`;

// List of 77 focused PA IKPP / CS SOTO license plate numbers
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

// Direct CS SOTO Master Lookup definition based on authoritative operations dictionary (Image 1)
export interface CsSotoMasterEntry {
  code: string;
  keterangan: string;
  kategori1: string;
  kategori2: string;
  kategori3: "AVAILABILITY" | "DOWNTIME";
  status: UnitStatus;
  downtimeCategory?: string;
}

export const CS_SOTO_MASTER_DICTIONARY: Record<string, CsSotoMasterEntry> = {
  // 1. UTILISASI (01. OPERATE, 02. DIPINJAM, 02. REPLACED)
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

  // 2. DRIVER ISSUE (06. DRIVER ISSUE, 07. RECRUITMENT DRIVER) - DOWNTIME
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

  // 3. LICENSE ISSUE (11. LICENSE ISSUE) - DOWNTIME
  "LCS1": { code: "LCS1", keterangan: "KEUR HEAD", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },
  "LCS2": { code: "LCS2", keterangan: "KEUR CHASIS", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },
  "LCS3": { code: "LCS3", keterangan: "STNK", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },
  "LCS4": { code: "LCS4", keterangan: "IBM", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },
  "LCS5": { code: "LCS5", keterangan: "TID", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },
  "LCS6": { code: "LCS6", keterangan: "Surat Surat Lainnya", kategori1: "11. LICENSE ISSUE", kategori2: "DT LICENSE", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LICENSE / DOCUMENT" },

  // 4. ACCIDENT & REPAIR - DOWNTIME
  "LKA1": { code: "LKA1", keterangan: "Unit Laka/Violation", kategori1: "09. REPAIR ACCIDENT", kategori2: "DT LAKA", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "LAKA / REPAIR ACCIDENT" },

  // 5. NEW UNIT & COMMERCIAL - DOWNTIME
  "NEW1": { code: "NEW1", keterangan: "Persiapan Unit Baru/Menunggu", kategori1: "14. UNIT BARU", kategori2: "PERSIAPAN UNIT BARU", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "PERSIAPAN UNIT BARU" },
  "NEW2": { code: "NEW2", keterangan: "Persiapan Unit Baru/Kelengkapan", kategori1: "14. UNIT BARU", kategori2: "PERSIAPAN UNIT BARU", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "PERSIAPAN UNIT BARU" },
  "NEW3": { code: "NEW3", keterangan: "Project / Pengaktifan Unit", kategori1: "13. COMMERCIAL REQUEST", kategori2: "PERSIAPAN UNIT BARU", kategori3: "DOWNTIME", status: "downtime", downtimeCategory: "PERSIAPAN UNIT BARU" },

  // 6. STANDBY (03, 04, 05, FAKTOR ALAM/ROAD) - AVAILABILITY
  "STB1": { code: "STB1", keterangan: "Standby No Order", kategori1: "03. STANDBY NO ORDER", kategori2: "STANDBY NO ORDER", kategori3: "AVAILABILITY", status: "standby" },
  "STB2": { code: "STB2", keterangan: "Standby Hari Libur", kategori1: "04. STANDBY HARI LIBUR", kategori2: "STANDBY HARI LIBUR", kategori3: "AVAILABILITY", status: "standby" },
  "STB3": { code: "STB3", keterangan: "Standby Unit Kontrak", kategori1: "05. STANDBY UNIT KONTRAK", kategori2: "STANDBY UNIT KONTRAK", kategori3: "AVAILABILITY", status: "standby" },
  "STB4": { code: "STB4", keterangan: "Standby Karena Cuaca/Kondisi", kategori1: "STANDBY FAKTOR CUACA/ROAD", kategori2: "STANDBY FAKTOR ALAM/ROAD", kategori3: "AVAILABILITY", status: "standby" },

  // 7. WORKSHOP & SPAREPART - DOWNTIME
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

// Official Master Lookup Evaluator for CS SOTO (Shift 1 & Shift 2)
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

  // If problem code is empty, return empty status ("") as requested:
  // "kalo kode kosong buat status nya kosong juga ya"
  if (!problemCode) {
    return { status: "" };
  }

  // 1. Direct authoritative lookup by code (e.g. OPR0, OPR1, STB3, DRV1, WSP3, etc.)
  if (CS_SOTO_MASTER_DICTIONARY[problemCode]) {
    const entry = CS_SOTO_MASTER_DICTIONARY[problemCode];
    return {
      status: entry.status,
      downtimeCategory: entry.downtimeCategory || entry.kategori2,
      keterangan: entry.keterangan,
      kategori1: entry.kategori1,
      kategori2: entry.kategori2,
      kategori3: entry.kategori3
    };
  }

  // 2. Direct lookup if kat1 is code
  if (kat1 && CS_SOTO_MASTER_DICTIONARY[kat1]) {
    const entry = CS_SOTO_MASTER_DICTIONARY[kat1];
    return {
      status: entry.status,
      downtimeCategory: entry.downtimeCategory || entry.kategori2,
      keterangan: entry.keterangan,
      kategori1: entry.kategori1,
      kategori2: entry.kategori2,
      kategori3: entry.kategori3
    };
  }

  // 3. Check code prefixes (OPR, OUT, RPL => UTILISASI, never standby)
  if (problemCode.startsWith("OPR") || problemCode.startsWith("OUT") || problemCode.startsWith("RPL")) {
    return { status: "utilized" };
  }
  if (problemCode.startsWith("STB")) {
    return { status: "standby" };
  }
  if (
    problemCode.startsWith("DRV") || problemCode.startsWith("LCS") ||
    problemCode.startsWith("LKA") || problemCode.startsWith("NEW") ||
    problemCode.startsWith("WSP") || problemCode.startsWith("LCT") ||
    problemCode.startsWith("MNC") || problemCode.startsWith("DT")
  ) {
    let dtCat = "DOWNTIME";
    if (problemCode.startsWith("DRV") || problemCode.startsWith("LCT")) dtCat = "NO DRIVER (DOWNTIME)";
    else if (problemCode.startsWith("WSP")) dtCat = "WORKSHOP / REPAIR";
    else if (problemCode.startsWith("LCS")) dtCat = "LICENSE / DOCUMENT";
    else if (problemCode.startsWith("LKA")) dtCat = "LAKA / REPAIR ACCIDENT";
    return { status: "downtime", downtimeCategory: dtCat };
  }

  // 4. Check Kategori 2 (KAT2) - Column M / Column V
  if (kat2 === "UTILISASI" || kat2.includes("UTILISASI")) {
    return { status: "utilized" };
  }
  if (kat2.includes("STANDBY")) {
    return { status: "standby" };
  }
  if (
    kat2.startsWith("DT") || kat2.includes("PERSIAPAN UNIT BARU") ||
    kat2.includes("WAITING SPAREPART") || kat2.includes("PROSES RECRUITMENT")
  ) {
    let dtCat = kat2 || "DOWNTIME";
    if (kat2.includes("DRIVER") || kat2.includes("RECRUITMENT")) dtCat = "NO DRIVER (DOWNTIME)";
    else if (kat2.includes("WSP") || kat2.includes("SPAREPART")) dtCat = "WORKSHOP / REPAIR";
    else if (kat2.includes("LICENSE")) dtCat = "LICENSE / DOCUMENT";
    else if (kat2.includes("LAKA")) dtCat = "LAKA / REPAIR ACCIDENT";
    return { status: "downtime", downtimeCategory: dtCat };
  }

  // 5. Check Kategori 1 (KAT1) - Column L / Column U
  if (kat1.includes("OPERATE") || kat1.includes("DIPINJAM") || kat1.includes("REPLACED") || kat1.includes("OPERASI")) {
    return { status: "utilized" };
  }
  if (kat1.includes("STANDBY")) {
    return { status: "standby" };
  }
  if (
    kat1.includes("DRIVER ISSUE") || kat1.includes("LICENSE ISSUE") ||
    kat1.includes("REPAIR ACCIDENT") || kat1.includes("UNIT BARU") ||
    kat1.includes("WORKSHOP") || kat1.includes("BEKUAN MIXER") ||
    kat1.includes("WHS & PURCHASING") || kat1.includes("CLAIM ASURANSI") ||
    kat1.includes("RECRUITMENT DRIVER")
  ) {
    let dtCat = kat1 || "DOWNTIME";
    if (kat1.includes("DRIVER") || kat1.includes("RECRUITMENT")) dtCat = "NO DRIVER (DOWNTIME)";
    else if (kat1.includes("WORKSHOP") || kat1.includes("BEKUAN") || kat1.includes("PURCHASING")) dtCat = "WORKSHOP / REPAIR";
    else if (kat1.includes("LICENSE")) dtCat = "LICENSE / DOCUMENT";
    else if (kat1.includes("ACCIDENT")) dtCat = "LAKA / REPAIR ACCIDENT";
    return { status: "downtime", downtimeCategory: dtCat };
  }

  // 6. Check Kategori 3 (KAT3) - Column N / Column W
  if (kat3.includes("DOWNTIME")) {
    return { status: "downtime", downtimeCategory: "DOWNTIME" };
  }

  // 7. Secondary operational status strings (Kategori & Kriteria)
  if (
    kategori.includes("LOADING") || kategori.includes("UNLOADING") ||
    kategori.includes("MENUJU WHS") || kategori.includes("IN WHS") ||
    kategori.includes("TRUCKING") || kategori.includes("WAIT YC") ||
    kategori.includes("KELUAR WHS") || kategori.includes("OTW") ||
    kategori.includes("SHIPMENT FINISH") || kategori.includes("OPERASI") ||
    kriteria.includes("ON SHIPMENT") || kriteria.includes("SHIPMENT")
  ) {
    return { status: "utilized" };
  }

  if (
    kategori.includes("STORING") || kategori.includes("BENGKEL") ||
    kategori.includes("LAKA") || kategori.includes("NO DRIVER") ||
    kategori.includes("RUSAK") || kategori.includes("REPAIR") ||
    kategori.includes("SERVICE") || kriteria.includes("DOWNTIME")
  ) {
    return { status: "downtime", downtimeCategory: "OPERATIONAL DOWNTIME" };
  }

  if (kategori.includes("STANDBY") || kriteria.includes("STANDBY") || kategori.includes("TERSEDIA")) {
    return { status: "standby" };
  }

  // Default: if unrecognized or no code, empty status
  return { status: "" };
}

// All 100 integrated Pancaran Inland fleet license plates from asset.pancaran-inland.site
export const ALL_PANCARAN_INLAND_PLATES: string[] = [
  "B9814UFY", "B9713UIW", "B9928UWW", "B9790UFY", "B9849UFY", "B9847UFY", "B9739UIW", "B9697UIW",
  "B9851UFY", "B9007UEI", "B9998UIY", "B9961UWW", "B9839UWW", "B9712UIW", "B9813UFY", "B9788UFY",
  "B9174UIV", "B9968UIY", "B9980UIV", "B9131XQ",  "B9708UIW", "B9782UFY", "B9852UFY", "B9848UFY",
  "B9018UGY", "B9710UIW", "B9792UFY", "B9677UIW", "B9786UFY", "B9628UIW", "B9014UGY", "B9784UFY",
  "B9635UIW", "B9012UGY", "B9167UIZ", "B9700UIW", "B9987UIV", "B9169XQ",  "B9239UIZ", "B9472UEM",
  "B9815UFY", "B9781UFY", "B9985UIV", "B9831UWW", "B9816UFY", "B9833UWW", "B9699UIW", "B9013UGY",
  "B9850UFY", "B9952UWW", "B9780UFY", "B9787UFY", "B9021UGY", "B9783UFY", "B9250UIZ", "B9846UFY",
  "B9811UFY", "B9791UFY", "B9160UGY", "B9161UGY", "B9162UGY", "B9168UGY", "B9169UGY", "B9166UGY",
  "B9163UGY", "B9164UGY", "B9165UGY", "B9167UGY", "B9170UGY", "B9187UGY", "B9225UGY", "B9226UGY",
  "B9223UGY", "B9224UGY", "B9484UEM", "B9679UIW", "B9837UWW", "B9711UIW", "B9714UIW", "B9715UIW",
  "B9716UIW", "B9717UIW", "B9718UIW", "B9719UIW", "B9720UIW", "B9721UIW", "B9722UIW", "B9723UIW",
  "B9724UIW", "B9725UIW", "B9801UFY", "B9802UFY", "B9803UFY", "B9804UFY", "B9805UFY", "B9806UFY",
  "B9807UFY", "B9808UFY", "B9809UFY", "B9810UFY", "B9812UFY", "B9817UFY", "B9818UFY", "B9819UFY",
  "B9820UFY", "B9821UFY", "B9822UFY", "B9823UFY"
];

const normalizedTargetPlates = new Set(
  TARGET_PA_IKPP_PLATES.map(p => p.toLowerCase().replace(/\s+/g, ""))
);

export function isCsSotoShift1Row(row: string[]): boolean {
  const custShift1 = (row[6] || "").toUpperCase().trim();
  return custShift1.includes("INDAH KIAT");
}

export function isCsSotoShift2Row(row: string[]): boolean {
  const custShift2 = (row[15] || "").toUpperCase().trim();
  return custShift2.includes("INDAH KIAT");
}

export function isCsSotoRow(row: string[]): boolean {
  return isCsSotoShift1Row(row) || isCsSotoShift2Row(row);
}

const INDO_MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
  jul: 6, agu: 7, agt: 7, aug: 7, sep: 8, okt: 9, oct: 9,
  nov: 10, des: 11, dec: 11
};

export function parseSheetDate(str?: string): Date | null {
  if (!str) return null;
  const clean = str.trim();
  const dMonY = clean.match(/^(\d{1,2})[\/-]([a-zA-Z]{3,4})[\/-](\d{4})$/);
  if (dMonY) {
    const day = parseInt(dMonY[1], 10);
    const monStr = dMonY[2].toLowerCase().substring(0, 3);
    const year = parseInt(dMonY[3], 10);
    const month = INDO_MONTH_MAP[monStr];
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }
  const yMd = clean.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (yMd) {
    return new Date(parseInt(yMd[1], 10), parseInt(yMd[2], 10) - 1, parseInt(yMd[3], 10));
  }
  const dMy = clean.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dMy) {
    return new Date(parseInt(dMy[3], 10), parseInt(dMy[2], 10) - 1, parseInt(dMy[1], 10));
  }
  const p = new Date(clean);
  return isNaN(p.getTime()) ? null : p;
}

export async function fetchPerformancePaIkppData(
  filter?: string | { startDate?: string; endDate?: string; preset?: string }
): Promise<PaIkppMetrics | null> {
  try {
    const targetDateStr = typeof filter === "string" ? filter : filter?.startDate;
    // 1. Primary: Try server endpoint for instant response with all dates
    try {
      const apiUrl = `/api/pa-ikpp/data?date=${encodeURIComponent(targetDateStr || "")}`;
      const apiRes = await fetch(apiUrl, { cache: "no-store" });
      if (apiRes.ok) {
        const apiJson = await apiRes.json();
        if (apiJson && apiJson.success && apiJson.metrics) {
          return apiJson.metrics;
        }
      }
    } catch (apiErr) {
      console.warn("Falling back from /api/pa-ikpp/data:", apiErr);
    }

    // 2. Fallback: Direct export CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${PA_IKPP_SPREADSHEET_ID}/export?format=csv&gid=${PA_IKPP_GID}`;
    const res = await fetch(csvUrl, {
      cache: "no-store",
      headers: {
        "Pragma": "no-cache",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
    if (!res.ok) return null;

    const csvText = await res.text();
    const records = parseCSVRecords(csvText);
    if (!records || records.length <= 1) return null;

    let dateRows: string[][] = [];
    let selectedDate = "";

    // Parse filter inputs
    let startStr = typeof filter === "string" ? filter : filter?.startDate;
    let endStr = typeof filter === "string" ? filter : filter?.endDate;
    const preset = typeof filter === "object" ? filter?.preset : undefined;

    if ((startStr || endStr) && preset !== "auto") {
      const startDt = startStr ? parseSheetDate(startStr) : null;
      const endDt = endStr ? parseSheetDate(endStr) : startDt;

      if (startDt || endDt) {
        const startTime = startDt ? new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate()).getTime() : 0;
        const endTime = endDt ? new Date(endDt.getFullYear(), endDt.getMonth(), endDt.getDate(), 23, 59, 59, 999).getTime() : Infinity;

        dateRows = records.filter(r => {
          if (!r[1] || r[1] === "Tanggal") return false;
          const d = parseSheetDate(r[1]);
          if (!d) return false;
          const t = d.getTime();
          return t >= startTime && t <= endTime;
        });

        if (dateRows.length > 0) {
          const uniqueDates = Array.from(new Set(dateRows.map(r => r[1]).filter(Boolean)));
          if (uniqueDates.length === 1) {
            selectedDate = uniqueDates[0];
          } else if (uniqueDates.length > 1) {
            selectedDate = `${uniqueDates[0]} s/d ${uniqueDates[uniqueDates.length - 1]}`;
          }
        }
      }
    }

    // Fallback if no filter or no rows matched date filter: use latest date with data
    if (dateRows.length === 0) {
      for (let i = records.length - 1; i >= 1; i--) {
        const dateVal = (records[i][1] || "").trim();
        if (dateVal && dateVal !== "Tanggal") {
          const testRows = records.filter(r => (r[1] || "").trim() === dateVal);
          const hasS1Data = testRows.some(r => r[9] || r[10] || r[11] || r[12] || r[13]);
          const hasS2Data = testRows.some(r => r[18] || r[19] || r[20] || r[21] || r[22]);
          
          if (hasS1Data || hasS2Data) {
            dateRows = testRows;
            selectedDate = dateVal;
            break;
          }
        }
      }
    }

    if (dateRows.length === 0) {
      dateRows = records.slice(-150);
      selectedDate = dateRows[0]?.[1] || "Latest Sheet Data";
    }

    const targetRows = dateRows.filter(isCsSotoRow);

    const rowsToProcess = targetRows.length > 0 ? targetRows : dateRows;

    let s1Total = 0, s1Avail = 0, s1Util = 0, s1Standby = 0, s1Downtime = 0;
    let s2Total = 0, s2Avail = 0, s2Util = 0, s2Standby = 0, s2Downtime = 0;

    dateRows.forEach(row => {
      const plat = (row[2] || "").trim().toUpperCase();
      if (!plat || plat === "#N/A" || plat.length < 3) return;

      // Shift 1: Focus on Customer Shift 1 = INDAH KIAT (Columns H to N: H=7, I=8, J=9, K=10, L=11, M=12, N=13)
      if (isCsSotoShift1Row(row)) {
        const s1Kriteria = (row[7] || "").toUpperCase();
        const s1Remarks = (row[8] || "").toUpperCase();
        const s1Kategori = (row[9] || "").toUpperCase();
        const s1Problem = (row[10] || "").trim().toUpperCase();  // Column K: Problem Shift 1
        const s1Kat1 = (row[11] || "").toUpperCase();
        const s1Kat2 = (row[12] || "").toUpperCase();
        const s1Kat3 = (row[13] || "").toUpperCase();

        const s1Eval = evaluateCsSotoMasterLookup(s1Kat1, s1Kat2, s1Kat3, s1Kategori, s1Kriteria, s1Problem);
        if (s1Eval.status === "downtime") {
          s1Total++;
          s1Downtime++;
        } else if (s1Eval.status === "utilized") {
          s1Total++;
          s1Util++;
          s1Avail++;
        } else if (s1Eval.status === "standby") {
          s1Total++;
          s1Standby++;
          s1Avail++;
        }
      }

      // Shift 2: Focus on Customer Shift 2 = INDAH KIAT (Columns Q to W: Q=16, R=17, S=18, T=19, U=20, V=21, W=22)
      if (isCsSotoShift2Row(row)) {
        const s2Kriteria = (row[16] || "").toUpperCase();
        const s2Remarks = (row[17] || "").toUpperCase();
        const s2Kategori = (row[18] || "").toUpperCase();
        const s2Problem = (row[19] || "").trim().toUpperCase();  // Column T: Problem Shift 2
        const s2Kat1 = (row[20] || "").toUpperCase();
        const s2Kat2 = (row[21] || "").toUpperCase();
        const s2Kat3 = (row[22] || "").toUpperCase();

        const s2Eval = evaluateCsSotoMasterLookup(s2Kat1, s2Kat2, s2Kat3, s2Kategori, s2Kriteria, s2Problem);
        if (s2Eval.status === "downtime") {
          s2Total++;
          s2Downtime++;
        } else if (s2Eval.status === "utilized") {
          s2Total++;
          s2Util++;
          s2Avail++;
        } else if (s2Eval.status === "standby") {
          s2Total++;
          s2Standby++;
          s2Avail++;
        }
      }
    });

    const uniqueDatesSet = new Set<string>();
    for (let i = 1; i < records.length; i++) {
      const dVal = (records[i][1] || "").trim();
      if (dVal && dVal !== "Tanggal" && dVal.length >= 3) {
        uniqueDatesSet.add(dVal);
      }
    }
    const availableDates = Array.from(uniqueDatesSet).reverse();

    const calcPct = (val: number, tot: number) => {
      if (!tot) return 0;
      return Math.min(100, Math.max(0, parseFloat(((val / tot) * 100).toFixed(2))));
    };

    const s1Units = s1Total;
    const s2Units = s2Total;

    return {
      lastUpdated: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      sheetDate: selectedDate,
      spreadsheetUrl: PA_IKPP_URL,
      matchedCount: rowsToProcess.length,
      availableDates,
      shift1: {
        totalUnits: s1Units,
        avgAvailabilityPct: calcPct(s1Avail, s1Units),
        avgUtilizationPct: calcPct(s1Util, s1Units),
        avgDowntimePct: calcPct(s1Downtime, s1Units),
        avgStandbyPct: calcPct(s1Standby, s1Units)
      },
      shift2: {
        totalUnits: s2Units,
        avgAvailabilityPct: calcPct(s2Avail, s2Units),
        avgUtilizationPct: calcPct(s2Util, s2Units),
        avgDowntimePct: calcPct(s2Downtime, s2Units),
        avgStandbyPct: calcPct(s2Standby, s2Units)
      }
    };
  } catch (e) {
    console.error("Error fetching PA IKPP spreadsheet data:", e);
    return null;
  }
}

export function isSameSheetDate(d1Str: string, d2Str: string): boolean {
  if (!d1Str || !d2Str) return false;
  const clean1 = d1Str.trim().toLowerCase();
  const clean2 = d2Str.trim().toLowerCase();
  if (clean1 === clean2) return true;

  const dt1 = parseSheetDate(d1Str);
  const dt2 = parseSheetDate(d2Str);
  if (dt1 && dt2) {
    return dt1.getFullYear() === dt2.getFullYear() &&
           dt1.getMonth() === dt2.getMonth() &&
           dt1.getDate() === dt2.getDate();
  }
  return clean1.includes(clean2) || clean2.includes(clean1);
}

// Fetch individual Fleet Units mapped directly from Google Sheet
export async function fetchAvailabilitySheetUnits(
  targetDate?: string,
  forceRefresh?: boolean
): Promise<{
  allUnits: FleetUnit[];
  csSotoUnits: FleetUnit[];
  shift1?: { allUnits: FleetUnit[]; csSotoUnits: FleetUnit[] };
  shift2?: { allUnits: FleetUnit[]; csSotoUnits: FleetUnit[] };
  sheetDate: string;
  availableDates: string[];
} | null> {
  try {
    // 1. Primary: Try server endpoint for instant response with all dates
    try {
      const apiUrl = `/api/pa-ikpp/data?date=${encodeURIComponent(targetDate || "")}&refresh=${forceRefresh ? "true" : "false"}`;
      const apiRes = await fetch(apiUrl, { cache: "no-store" });
      if (apiRes.ok) {
        const apiJson = await apiRes.json();
        if (apiJson && apiJson.success && apiJson.availableDates) {
          return {
            allUnits: apiJson.shift1?.allUnits || [],
            csSotoUnits: apiJson.shift1?.csSotoUnits || [],
            shift1: apiJson.shift1,
            shift2: apiJson.shift2,
            sheetDate: apiJson.sheetDate,
            availableDates: apiJson.availableDates
          };
        }
      }
    } catch (apiErr) {
      console.warn("Falling back from /api/pa-ikpp/data:", apiErr);
    }

    // 2. Fallback: Direct export CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${PA_IKPP_SPREADSHEET_ID}/export?format=csv&gid=${PA_IKPP_GID}`;
    const res = await fetch(csvUrl, {
      cache: "no-store",
      headers: {
        "Pragma": "no-cache",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
    if (!res.ok) return null;

    const csvText = await res.text();
    const records = parseCSVRecords(csvText);
    if (!records || records.length <= 1) return null;

    // Collect all available dates from sheet
    const uniqueDatesSet = new Set<string>();
    for (let i = 1; i < records.length; i++) {
      const dVal = (records[i][1] || "").trim();
      if (dVal && dVal !== "Tanggal" && dVal.length >= 3) {
        uniqueDatesSet.add(dVal);
      }
    }
    const availableDates = Array.from(uniqueDatesSet).reverse(); // Latest dates first

    // Determine target date & rows
    let dateRows: string[][] = [];
    let selectedDate = "";

    if (targetDate && targetDate.trim() !== "") {
      dateRows = records.filter(r => {
        const rowD = (r[1] || "").trim();
        return isSameSheetDate(rowD, targetDate);
      });
      if (dateRows.length > 0) {
        selectedDate = (dateRows[0][1] || "").trim() || targetDate;
      }
    }

    if (dateRows.length === 0) {
      for (let i = records.length - 1; i >= 1; i--) {
        const dateVal = (records[i][1] || "").trim();
        if (dateVal && dateVal !== "Tanggal") {
          const testRows = records.filter(r => (r[1] || "").trim() === dateVal);
          if (testRows.length > 0) {
            dateRows = testRows;
            selectedDate = dateVal;
            break;
          }
        }
      }
    }

    if (dateRows.length === 0) {
      dateRows = records.slice(-150);
      selectedDate = dateRows[0]?.[1] || "Latest Sheet Data";
    }

    const mapRowToFleetUnitForShift = (r: string[], shiftNum: 1 | 2): FleetUnit | null => {
      const plat = (r[2] || "").trim().toUpperCase();
      if (!plat || plat === "#N/A" || plat.length < 3) return null;

      const dbType = r[4] || r[3] || "Trailer 4x2 40ft";

      if (shiftNum === 1) {
        // Shift 1 (Locked strictly on Columns H to N: H=7, I=8, J=9, K=10, L=11, M=12, N=13)
        const kriteria = (r[7] || "").trim(); // Column H: Kriteria Shift 1 (Jam 10)
        const remarks = (r[8] || "").trim();  // Column I: Remarks Shift 1
        const kategori = (r[9] || "").trim(); // Column J: Kategori Shift 1
        const problem = (r[10] || "").trim(); // Column K: Problem Shift 1
        const kat1 = (r[11] || "").toUpperCase().trim(); // Column L: S1 KAT1
        const kat2 = (r[12] || "").toUpperCase().trim(); // Column M: S1 KAT2
        const kat3 = (r[13] || "").toUpperCase().trim(); // Column N: S1 KAT3

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
        // Shift 2 (Locked strictly on Columns Q to W: Q=16, R=17, S=18, T=19, U=20, V=21, W=22)
        const kriteria = (r[16] || "").trim(); // Column Q: Kriteria Shift 2 (Jam 17:00)
        const remarks = (r[17] || "").trim();  // Column R: Remarks Shift 2
        const kategori = (r[18] || "").trim(); // Column S: Kategori Shift 2
        const problem = (r[19] || "").trim();  // Column T: Problem Shift 2
        const kat1 = (r[20] || "").toUpperCase().trim(); // Column U: S2 KAT1
        const kat2 = (r[21] || "").toUpperCase().trim(); // Column V: S2 KAT2
        const kat3 = (r[22] || "").toUpperCase().trim(); // Column W: S2 KAT3

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

    const s1All = dateRows.map(r => mapRowToFleetUnitForShift(r, 1)).filter((u): u is FleetUnit => u !== null);
    const s1CsSoto = dateRows.filter(isCsSotoShift1Row).map(r => mapRowToFleetUnitForShift(r, 1)).filter((u): u is FleetUnit => u !== null);

    const s2All = dateRows.map(r => mapRowToFleetUnitForShift(r, 2)).filter((u): u is FleetUnit => u !== null);
    const s2CsSoto = dateRows.filter(isCsSotoShift2Row).map(r => mapRowToFleetUnitForShift(r, 2)).filter((u): u is FleetUnit => u !== null);

    return {
      allUnits: s1All,
      csSotoUnits: s1CsSoto.length > 0 ? s1CsSoto : s1All,
      shift1: {
        allUnits: s1All,
        csSotoUnits: s1CsSoto
      },
      shift2: {
        allUnits: s2All,
        csSotoUnits: s2CsSoto
      },
      sheetDate: selectedDate,
      availableDates
    };
  } catch (e) {
    console.warn("Notice fetching Availability Sheet units (will retry):", e);
    return null;
  }
}
