import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getTikProMirrorData } from "./server/tikpro.ts";
import { getPaIkppServerData } from "./server/paIkpp.ts";
import {
  extractRequestParams,
  getDriverPerformanceData,
  getDriversData,
  getMasterMoboActivityData,
  getMasterPerformanceDriverData,
  getMoboActivityData,
  getMoboSummaryData,
  getSheetHelperData,
  sendJsonResponse
} from "./server/hseSheets.ts";

const SPREADSHEET_ID = "1pavvP7EtzMvHiIhCP5X_aoTVP5nLkV03Vw_IV0iQkxU";
const GID = "1444994189";

// Helper to parse CSV line handling quoted values
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

function parseCSV(csvText: string, customHeaderRowIndex?: number) {
  const records = parseCSVRecords(csvText);
  if (records.length === 0) return { headers: [], rows: [] };

  let dataStartIndex = 1;
  if (typeof customHeaderRowIndex === "number" && customHeaderRowIndex >= 0) {
    dataStartIndex = customHeaderRowIndex + 1;
  } else {
    // Auto-detect header row
    for (let i = 0; i < Math.min(records.length, 10); i++) {
      const row = records[i];
      if (
        row &&
        row.some(
          (cell) =>
            /^sm-d\d+/i.test(cell) ||
            /^ord-\d+/i.test(cell) ||
            (cell.length > 3 && /^\d+$/.test(row[0]) && i > 0)
        )
      ) {
        dataStartIndex = i;
        break;
      }
    }
  }

  const maxCols = Math.max(...records.slice(0, dataStartIndex).map((r) => r.length));
  const combinedHeaders: string[] = [];

  for (let col = 0; col < maxCols; col++) {
    const parts: string[] = [];
    for (let r = 0; r < dataStartIndex; r++) {
      const val = records[r]?.[col];
      if (val && !parts.map((p) => p.toLowerCase()).includes(val.toLowerCase())) {
        parts.push(val.replace(/[\r\n]+/g, " ").trim());
      }
    }
    const headerName = parts.join(" ").trim() || `Kolom ${col + 1}`;
    combinedHeaders.push(headerName);
  }

  const rows: Record<string, string>[] = [];
  for (let i = dataStartIndex; i < records.length; i++) {
    const values = records[i].map((v) => v.replace(/^"|"$/g, "").trim());
    if (values.length === 0 || values.every((v) => !v)) continue;

    const rowObj: Record<string, string> = {};
    combinedHeaders.forEach((h, idx) => {
      const val = values[idx] || "";
      rowObj[h] = val;
    });
    values.forEach((val, idx) => {
      rowObj[`__col_${idx}`] = val;
    });
    rows.push(rowObj);
  }

  return { headers: combinedHeaders, rows };
}

interface FormulaRule {
  id: string;
  targetField: "status" | "type" | "lastUpdateCS" | "customNote";
  conditionType: "contains" | "equals" | "starts_with" | "is_not_empty" | "always";
  conditionValue: string;
  resultValue: string;
}

interface ColumnMapping {
  headerRowIndex?: number;
  idField?: string;
  typeField?: string;
  statusField?: string;
  customerField?: string;
  originField?: string;
  destinationField?: string;
  unitTypeField?: string;
  quantityField?: string;
  etaField?: string;
  lastUpdateCSField?: string;
  driverField?: string;
  vehiclePlateField?: string;
}

// Helper for CS status mapping matching exact lookup table rules
function resolveCSStatus(lastUpdateCS?: string): { status: "open" | "in_progress" | "done" | "cancel" } {
  const cs = (lastUpdateCS || "").trim().toUpperCase();

  if (
    !cs ||
    cs === "CANCEL CS" ||
    cs === "CANCEL OPR" ||
    cs === "CANCEL" ||
    cs.includes("CANCEL") ||
    cs.includes("BATAL") ||
    cs.includes("REJECT")
  ) {
    return { status: "cancel" };
  }

  if (
    cs === "ON JOB" ||
    cs.includes("ON JOB") ||
    cs.includes("JOB") ||
    cs.includes("IN TRANSIT") ||
    cs.includes("TRANSIT") ||
    cs.includes("ON TRIP") ||
    cs.includes("TRIP") ||
    cs.includes("WAITING TILA") ||
    cs.includes("TILA")
  ) {
    return { status: "in_progress" };
  }

  if (
    cs === "OPR PLANNING" ||
    cs === "WAITING BON MUAT" ||
    cs === "WAITING CONFIRM" ||
    cs.includes("PLANNING") ||
    cs.includes("BON MUAT") ||
    cs.includes("WAITING") ||
    cs.includes("CONFIRM") ||
    cs.includes("OPEN") ||
    cs.includes("QUEUE") ||
    cs.includes("UNALLOCATED")
  ) {
    return { status: "open" };
  }

  if (
    cs === "SHIPMENT FINISH" ||
    cs.includes("FINISH") ||
    cs.includes("DONE") ||
    cs.includes("COMPLETED") ||
    cs.includes("COMPLETE")
  ) {
    return { status: "done" };
  }

  return { status: "cancel" };
}

function cleanVehiclePlate(val?: string): string {
  if (!val) return "";
  const cleaned = val.trim();
  const upper = cleaned.toUpperCase();
  if (
    !upper ||
    upper === "#N/A" ||
    upper === "N/A" ||
    upper === "-" ||
    upper === "NONE" ||
    upper === "NULL" ||
    upper === "UNMAPPED" ||
    upper === "NO UNIT" ||
    upper === "EMPTY" ||
    upper === "UNDEFINED" ||
    upper.includes("KOJA") ||
    upper.includes("NPCT") ||
    upper.includes("UTC") ||
    upper.includes("BSA") ||
    upper.includes("PDT") ||
    upper.includes("PORT") ||
    upper.includes("IKK") ||
    upper.includes("FULL TRUCKING") ||
    upper.includes("TRUCKING") ||
    upper.includes("SERVICE") ||
    upper.includes("TRAILER") ||
    upper.includes("EXP") ||
    upper.includes("IMP") ||
    upper.includes("RUTE") ||
    upper.includes("CONTAINER") ||
    upper.includes("KARAWANG") ||
    upper.includes("PLB") ||
    upper.includes("DEPO") ||
    upper.includes("YARD") ||
    upper.includes("CIKARANG") ||
    upper.includes("JAKARTA") ||
    upper.includes("SURABAYA") ||
    upper.includes("PERAWANG") ||
    upper.includes("TANGERANG") ||
    upper.includes("SERANG") ||
    upper.includes("MOJOKERTO") ||
    upper.includes("SIDOARJO") ||
    upper.includes("MARUNDA") ||
    upper.includes("PRIOK") ||
    upper.includes("PERAK") ||
    upper.includes("CIKUPA") ||
    upper.includes("CIBITUNG") ||
    upper.includes("BEKASI")
  ) {
    return "";
  }
  return cleaned;
}

function cleanDriver(val?: string): string {
  if (!val) return "";
  const cleaned = val.trim();
  const upper = cleaned.toUpperCase();
  if (
    !upper ||
    upper === "#N/A" ||
    upper === "N/A" ||
    upper === "-" ||
    upper === "NONE" ||
    upper === "NULL" ||
    upper === "UNMAPPED" ||
    upper === "NO DRIVER" ||
    upper === "EMPTY" ||
    upper === "UNDEFINED" ||
    upper.includes("FULL TRUCKING") ||
    upper.includes("TRUCKING") ||
    upper.includes("SERVICE") ||
    upper.includes("RUTE") ||
    upper.includes("EXP - IMP") ||
    upper.includes("EXP") ||
    upper.includes("IMP") ||
    upper.includes("KOJA") ||
    upper.includes("NPCT") ||
    upper.includes("IKK") ||
    upper.includes("PORT") ||
    upper.includes("CONTAINER")
  ) {
    return "";
  }
  return cleaned;
}

const DEFAULT_ROUTE_MAPPINGS: Record<string, "EXPORT" | "REPO FULL" | "REPO EMPTY" | "IMPORT"> = {
  "KARAWANG - TANJUNG PRIOK (IKK) - 0 - 160": "EXPORT",
  "KARAWANG - TANJUNG PRIOK (IKK)": "EXPORT",
  "KARAWANG - CAKUNG (FULL) - 0 - 160": "REPO FULL",
  "KARAWANG - CAKUNG (FULL)": "REPO FULL",
  "BSA - TANJUNG PRIOK (REPO FULL)": "REPO FULL",
  "DEPO BSA & PRIOK - PELABUHAN TJ PRIOK - 0 - 36": "REPO EMPTY",
  "DEPO BSA & PRIOK - PELABUHAN TJ PRIOK - 0 - 0": "REPO FULL",
  "DEPO BSA & PRIOK - PELABUHAN TJ PRIOK": "REPO FULL",
  "KARAWANG (PLB) - PORT TJ PRIOK (FULL) - 0 - 0": "REPO FULL",
  "KARAWANG (PLB) - PORT TJ PRIOK (FULL) - 0 - 160": "REPO FULL",
  "KARAWANG (PLB) - PORT TJ PRIOK (FULL)": "REPO FULL",
  "DEPO ARROUND PRIOK - PLB KARAWANG (FULL) - 0 - 0": "REPO FULL",
  "DEPO ARROUND PRIOK - PLB KARAWANG (FULL) - 0 - 160": "REPO FULL",
  "DEPO ARROUND PRIOK-PLB KARAWANG (FULL)": "REPO FULL",
  "DEPO ARROUND PRIOK-PLB KARAWANG (EMPTY)": "REPO EMPTY",
  "PLB - DEPO ARROUND PRIOK (EMPTY) - 0 - 160": "REPO EMPTY",
  "DEPO ARROUND PRIOK - PANCARAN DEPO - 0 - 36": "REPO EMPTY",
  "KARAWANG - DEPO PRIOK (OPEN CY) - 0 - 160": "REPO FULL",
  "KARAWANG - DEPO MARUNDA (FULL) - 0 - 160": "REPO FULL",
  "DEPO MARUNDA - PORT TJ PRIOK (FULL) - 0 - 36": "REPO FULL",
  "PLB - FG STUFFING - PLB (LANGSIR) - 0 - 10": "REPO FULL",
  "REPO SERVICE RELOKASI EMPTY": "REPO EMPTY",
  "DEPO AROUND PRIOK - PANCARAN 0 - 36 PDT": "REPO EMPTY",
  "RELOKASI REPO CONTAINER": "REPO EMPTY",
  "REPO PDT": "REPO EMPTY",
  "TESTING": "EXPORT"
};

function normalizeRouteKey(key?: string): string {
  if (!key) return "";
  return key.replace(/\s+/g, " ").trim().toUpperCase();
}

function deriveFreightTypes(
  commercialRoute?: string,
  pickUpLocation?: string,
  dropOffLocation?: string,
  notes?: string
): { freightType: string; freightType2: "EXPORT" | "REPO FULL" | "REPO EMPTY" | "IMPORT" } {
  const rawCr = (commercialRoute || "").trim().toUpperCase();
  const cr = normalizeRouteKey(commercialRoute);
  const pick = (pickUpLocation || "").trim().toUpperCase();
  const drop = (dropOffLocation || "").trim().toUpperCase();
  const note = (notes || "").trim().toUpperCase();
  const fullText = `${cr} ${pick} ${drop} ${note}`;

  // 1. Check DEFAULT_ROUTE_MAPPINGS
  if (cr) {
    const directVal = DEFAULT_ROUTE_MAPPINGS[cr] || DEFAULT_ROUTE_MAPPINGS[rawCr];
    if (directVal) {
      return {
        freightType: directVal,
        freightType2: directVal
      };
    }

    const entries = Object.entries(DEFAULT_ROUTE_MAPPINGS).sort((a, b) => b[0].length - a[0].length);
    for (const [key, val] of entries) {
      const normKey = normalizeRouteKey(key);
      if (normKey && (cr === normKey || cr.includes(normKey))) {
        return {
          freightType: val,
          freightType2: val
        };
      }
    }
  }

  // 2. Check IMPORT
  if (cr.includes("IMPORT") || cr.includes("IMPOR") || fullText.includes("IMPORT") || fullText.includes("IMPOR")) {
    return { freightType: "IMPORT", freightType2: "IMPORT" };
  }

  // 3. Check REPO EMPTY
  const isExplicitFull = cr.includes("(FULL)") || cr.includes(" FULL") || fullText.includes("(FULL)");
  if (
    !isExplicitFull && (
      cr.includes("REPO EMPTY") ||
      cr.includes("RELOKASI EMPTY") ||
      cr.includes("(EMPTY)") ||
      cr.includes("EMPTY") ||
      cr.includes("PANCARAN DEPO") ||
      cr.includes("0 - 36") ||
      cr.includes("0-36") ||
      cr.includes("DEPO PDT") ||
      cr.includes("PDT") ||
      note.includes("REPO PDT") ||
      note.includes("0 - 36") ||
      note.includes("0-36") ||
      pick.includes("BPL") ||
      drop.includes("DEPO PDT")
    )
  ) {
    return { freightType: "REPO EMPTY", freightType2: "REPO EMPTY" };
  }

  // 4. Check REPO FULL
  if (
    isExplicitFull ||
    cr.includes("REPO FULL") ||
    cr.includes("BSA - TANJUNG PRIOK (REPO FULL)") ||
    cr.includes("BSA") ||
    cr.includes("CAKUNG (FULL)") ||
    cr.includes("CAKUNG") ||
    cr.includes("PLB KARAWANG (FULL)") ||
    cr.includes("OPEN CY") ||
    cr.includes("PORT TJ PRIOK (FULL)") ||
    cr.includes("REPO") ||
    cr.includes("RELOKASI") ||
    fullText.includes("REPO FULL") ||
    fullText.includes("CAKUNG") ||
    fullText.includes("BSA")
  ) {
    const isSpecialRepoExport = cr.includes("BSA") && (drop.includes("KOJA") || note.includes("KOJA"));
    return { freightType: isSpecialRepoExport ? "REPO EXPORT" : "REPO FULL", freightType2: "REPO FULL" };
  }

  // 5. Check EXPORT (IKK)
  if (
    cr.includes("KARAWANG - TANJUNG PRIOK (IKK)") ||
    cr.includes("(IKK)") ||
    cr.includes("EKSPOR") ||
    cr.includes("EXPORT") ||
    pick.includes("INDAH KIAT") ||
    pick.includes("KARAWANG")
  ) {
    return { freightType: "EXPORT", freightType2: "EXPORT" };
  }

  return { freightType: "EXPORT", freightType2: "EXPORT" };
}

// Map raw spreadsheet row object to standard Order interface
function mapSpreadsheetRowToOrder(
  row: Record<string, string>,
  index: number,
  mapping?: ColumnMapping,
  formulaRules?: FormulaRule[]
) {
  const keys = Object.keys(row);

  // Clean value getter
  const getVal = (exactOrMappedField?: string, colIndexFallback?: number[], ...possibleKeys: string[]) => {
    if (exactOrMappedField && exactOrMappedField.trim()) {
      const fieldTarget = exactOrMappedField.trim().toLowerCase();
      const directMatch = keys.find((k) => !k.startsWith("__col_") && k.toLowerCase().trim() === fieldTarget);
      if (directMatch && row[directMatch] !== undefined && row[directMatch].trim() !== "") {
        return row[directMatch].trim();
      }
      const partialMatch = keys.find((k) => !k.startsWith("__col_") && k.toLowerCase().includes(fieldTarget));
      if (partialMatch && row[partialMatch] !== undefined && row[partialMatch].trim() !== "") {
        return row[partialMatch].trim();
      }
    }

    for (const pk of possibleKeys) {
      const target = pk.toLowerCase().trim();
      const exactMatch = keys.find((k) => !k.startsWith("__col_") && k.toLowerCase().trim() === target);
      if (exactMatch && row[exactMatch] !== undefined && row[exactMatch].trim() !== "") {
        return row[exactMatch].trim();
      }
    }

    for (const pk of possibleKeys) {
      const target = pk.toLowerCase().trim();
      if (target.length < 3) continue; // Avoid single letter/digit accidental substring match
      const subMatch = keys.find((k) => !k.startsWith("__col_") && k.toLowerCase().includes(target));
      if (subMatch && row[subMatch] !== undefined && row[subMatch].trim() !== "") {
        return row[subMatch].trim();
      }
    }

    if (colIndexFallback && colIndexFallback.length > 0) {
      for (const idx of colIndexFallback) {
        const rawColVal = row[`__col_${idx}`];
        if (rawColVal !== undefined && rawColVal.trim() !== "") {
          return rawColVal.trim();
        }
      }
    }

    return "";
  };

  const idExecute = getVal("id order execute", [1], "id_order_execute", "id execute");
  const idPooling = getVal("id pooling order", [2], "id_pooling_order", "id pooling");
  const id =
    idExecute ||
    idPooling ||
    getVal(
      mapping?.idField,
      [0],
      "id order",
      "order_id",
      "id"
    ) || `ORD-GS-${String(index + 1).padStart(3, "0")}`;
  const poolingId = idPooling || (id.includes(".") ? id.split(".")[0] : id);

  const rawNoJobOrder = getVal(
    "no job order",
    [5, 4, 6],
    "no job order",
    "no. job order",
    "no_job_order",
    "job order no",
    "job order number",
    "no. job",
    "no spk",
    "no order"
  );
  const isJobTypeStr =
    !rawNoJobOrder ||
    /trip basis|reguler|emkl|trucking|rtb|type|jenis/i.test(rawNoJobOrder);
  const noJobOrder = !isJobTypeStr ? rawNoJobOrder : (idPooling || idExecute || id);

  const rawType = getVal(
    mapping?.typeField,
    [16, 17, 15],
    "freight type",
    "freight_type",
    "order type",
    "tipe order",
    "tipe freight",
    "tipe",
    "type",
    "jenis"
  ).toLowerCase();

  let type: "ekspor" | "impor" | "repo" = "ekspor";
  if (rawType.includes("impor") || rawType.includes("import")) {
    type = "impor";
  } else if (rawType.includes("repo") || rawType.includes("relokasi")) {
    type = "repo";
  } else if (rawType.includes("ekspor") || rawType.includes("export")) {
    type = "ekspor";
  } else {
    type = "ekspor";
  }

  const customer =
    getVal(
      mapping?.customerField,
      [7, 6, 8],
      "customer",
      "pelanggan",
      "client",
      "pt",
      "nama pelanggan"
    ) || "PT Indah Kiat Pulp & Paper";

  const rawPickUp = getVal(
    "pick up location",
    [18],
    "address loading point",
    "lokasi asal"
  );
  const rawDrop = getVal(
    "drop of location",
    [21],
    "address unloading point",
    "lokasi tujuan"
  );
  const rawCsvOrigin = getVal("origin", [18, 19], "asal");
  const rawCsvDest = getVal("destination", [21, 23], "tujuan");

  // Determine Origin
  let origin = "";
  if (rawCsvOrigin && rawCsvOrigin.trim() && rawCsvOrigin.trim().toUpperCase() !== "ORIGIN") {
    const oUpper = rawCsvOrigin.trim().toUpperCase();
    if (oUpper.includes("KARAWANG") || oUpper.includes("IKK")) origin = "IKK Karawang";
    else if (oUpper.includes("CAKUNG")) origin = "CAKUNG";
    else if (oUpper.includes("PRIOK") || oUpper.includes("TANJUNG")) origin = "TANJUNG PRIOK";
    else origin = rawCsvOrigin.trim();
  }

  if (!origin && rawPickUp) {
    const pUpper = rawPickUp.trim().toUpperCase();
    if (pUpper.includes("INDAH KIAT") || pUpper.includes("KARAWANG") || pUpper.includes("IKK")) {
      origin = "IKK Karawang";
    } else if (pUpper.includes("BSA") || pUpper.includes("GFC") || pUpper.includes("BPL") || pUpper.includes("GL")) {
      origin = "CAKUNG";
    } else if (
      pUpper.includes("NPCT") ||
      pUpper.includes("UTC") ||
      pUpper.includes("KOJA") ||
      pUpper.includes("PRIOK") ||
      pUpper.includes("PELINDO") ||
      pUpper.includes("T300") ||
      pUpper.includes("PDT")
    ) {
      origin = "TANJUNG PRIOK";
    } else {
      origin = rawPickUp.trim();
    }
  }

  if (!origin) {
    origin = "IKK Karawang";
  }

  // Determine Destination
  let destination = "";
  if (rawCsvDest && rawCsvDest.trim() && rawCsvDest.trim().toUpperCase() !== "DESTINATION") {
    destination = rawCsvDest.trim();
  }

  if (!destination && rawDrop) {
    const dUpper = rawDrop.trim().toUpperCase();
    if (dUpper.includes("UTC")) destination = "UTC";
    else if (dUpper.includes("BSA")) destination = "BSA";
    else if (dUpper.includes("NPCT 1") || dUpper.includes("NPCT1")) destination = "NPCT 1";
    else if (dUpper.includes("KOJA")) destination = "KOJA";
    else if (dUpper.includes("PELINDO") || dUpper.includes("TERMINAL 3")) destination = "PELINDO/ TERMINAL 3";
    else if (dUpper.includes("GFC")) destination = "GFC";
    else if (dUpper.includes("GL")) destination = "GL Terminal";
    else if (dUpper.includes("T300") || dUpper.includes("TMAL") || dUpper.includes("MAL")) destination = "T300/TMAL";
    else if (dUpper.includes("PDT")) destination = "DEPO PDT";
    else if (dUpper.includes("BPL")) destination = "BPL";
    else if (dUpper.includes("KARAWANG") || dUpper.includes("INDAH KIAT")) destination = "IKK Karawang";
    else destination = rawDrop.trim();
  }

  if (!destination) {
    destination = "Tj. Priok Port";
  }

  const unitType =
    getVal(
      mapping?.unitTypeField,
      [14, 15],
      "unit type",
      "tipe unit",
      "unit",
      "trailer",
      "armada"
    ) || "Trailer 4x2 40ft";

  let containerTier: "20ft" | "40ft" | "45ft" = "40ft";
  if (unitType.includes("20") || getVal("tier", [], "container").includes("20"))
    containerTier = "20ft";
  else if (unitType.includes("45") || getVal("tier", [], "container").includes("45"))
    containerTier = "45ft";

  const lastUpdateCS =
    getVal(
      mapping?.lastUpdateCSField,
      [58, 57, 59, 30, 29, 31, 28],
      "bg last update cs",
      "last update cs",
      "last_update_cs",
      "update cs",
      "cs update",
      "status cdo",
      "status_cdo",
      "last update"
    ) || "WAITING CONFIRM";

  let { status } = resolveCSStatus(lastUpdateCS);

  const eta =
    getVal(
      mapping?.etaField,
      [11, 50, 51, 7],
      "estimate req dlv date",
      "estimate req",
      "dlv date",
      "eta",
      "estimasi",
      "tanggal",
      "date",
      "jadwal"
    ) || "";
  const bookingDate =
    getVal("booking date", [], "tgl booking", "tgl order", "date") || "22 Jul 2026";

  const requestStuffing = getVal(
    "request stuffing / stripping / ondock",
    [17, 18, 19, 16],
    "request stuffing / stripping / ondock",
    "stuffing / stripping / ondock",
    "tuffing / stripping / ondock",
    "stuffing/stripping/ondock",
    "request stuffing",
    "stuffing",
    "stripping",
    "ondock"
  );

  const rawQty = getVal(
    mapping?.quantityField,
    [15, 14, 16],
    "quantity",
    "qty",
    "jumlah",
    "total quantity"
  );
  const parsedQty = parseInt(rawQty, 10);
  const quantity = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;

  const rawDriver = getVal(
    mapping?.driverField,
    [30, 59, 51],
    "id - driver name",
    "driver name",
    "driver_name",
    "driver",
    "supir",
    "pengemudi"
  );
  const driver = cleanDriver(rawDriver);

  const rawVehiclePlate = getVal(
    mapping?.vehiclePlateField,
    [29, 28, 40, 60, 52],
    "nopol",
    "plat",
    "nopol dedicated",
    "mirror nopol",
    "vehicle",
    "unit id"
  );
  const vehiclePlate = cleanVehiclePlate(rawVehiclePlate);

  let notes = getVal("notes", [32, 31], "catatan", "keterangan");

  const commercialRoute = getVal(
    "commercial route",
    [24, 25, 23],
    "commercial route",
    "commercial_route",
    "route commercial",
    "rute komersial"
  );

  const rawStatusPooling = getVal(
    "status pooling",
    [30, 31, 32],
    "status pooling",
    "status_pooling",
    "status pooling order",
    "status_pooling_order",
    "status pool",
    "pooling status"
  );

  let statusPooling = "NEED ACTION";
  if (rawStatusPooling && rawStatusPooling.trim()) {
    const upper = rawStatusPooling.trim().toUpperCase();
    if (upper.includes("CANCEL") || upper.includes("BATAL") || upper.includes("MISSED")) {
      statusPooling = "CANCEL";
    } else if (
      upper.includes("NEED") ||
      upper.includes("ACTION") ||
      upper.includes("DRAFT") ||
      upper.includes("PENDING") ||
      upper.includes("WAIT")
    ) {
      statusPooling = "NEED ACTION";
    } else if (upper.includes("CONFIRM") || upper.includes("DONE") || upper.includes("OK")) {
      statusPooling = "CONFIRM";
    } else {
      statusPooling = "NEED ACTION";
    }
  } else {
    statusPooling = "NEED ACTION";
  }

  // Execute Looker Studio Formula Rules
  if (Array.isArray(formulaRules) && formulaRules.length > 0) {
    for (const rule of formulaRules) {
      if (!rule.targetField || !rule.resultValue) continue;

      let isMatch = false;
      const checkVal = (
        rule.targetField === "lastUpdateCS"
          ? lastUpdateCS
          : rule.targetField === "status"
          ? status
          : rule.targetField === "type"
          ? type
          : notes
      ).toLowerCase();

      const condVal = (rule.conditionValue || "").toLowerCase();

      if (rule.conditionType === "always") {
        isMatch = true;
      } else if (rule.conditionType === "contains") {
        isMatch = checkVal.includes(condVal);
      } else if (rule.conditionType === "equals") {
        isMatch = checkVal === condVal;
      } else if (rule.conditionType === "starts_with") {
        isMatch = checkVal.startsWith(condVal);
      } else if (rule.conditionType === "is_not_empty") {
        isMatch = checkVal.trim().length > 0;
      }

      if (isMatch) {
        if (rule.targetField === "status") {
          const res = rule.resultValue.toLowerCase();
          if (res.includes("done") || res === "done") status = "done";
          else if (res.includes("open") || res === "open") status = "open";
          else if (res.includes("progress") || res === "in_progress") status = "in_progress";
        } else if (rule.targetField === "type") {
          const res = rule.resultValue.toLowerCase();
          if (res.includes("impor") || res === "impor") type = "impor";
          else if (res.includes("repo") || res === "repo") type = "repo";
          else type = "ekspor";
        } else if (rule.targetField === "lastUpdateCS") {
          // Last update CS override
        } else if (rule.targetField === "customNote") {
          notes = rule.resultValue;
        }
      }
    }
  }

  const { freightType, freightType2 } = deriveFreightTypes(
    commercialRoute,
    rawPickUp || origin,
    rawDrop || destination,
    notes
  );

  if (freightType2 === "REPO EMPTY") {
    type = "repo_empty" as any;
  } else if (freightType2 === "REPO FULL") {
    type = "repo_full" as any;
  } else if (freightType2 === "IMPORT") {
    type = "impor";
  } else {
    type = "ekspor";
  }

  return {
    id,
    poolingId,
    noJobOrder,
    commercialRoute,
    statusPooling,
    type,
    freightType,
    freightType2,
    customer,
    origin,
    destination,
    containerTier,
    unitType,
    status,
    eta,
    bookingDate,
    requestStuffing,
    quantity,
    driver,
    vehiclePlate,
    notes,
    lastUpdateCS,
    source: "Google Sheet"
  };
}

// Helper to parse Google Spreadsheet URL or ID and extract spreadsheetId and GID
function parseSpreadsheetInfo(inputUrlOrId: string, defaultGid = "0"): { spreadsheetId: string; gid: string } {
  let spreadsheetId = SPREADSHEET_ID;
  let gid = defaultGid;

  if (!inputUrlOrId) return { spreadsheetId, gid };

  // Match spreadsheet ID from URL
  const docMatch = inputUrlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (docMatch && docMatch[1]) {
    spreadsheetId = docMatch[1];
  } else if (!inputUrlOrId.includes("/") && inputUrlOrId.length > 20) {
    spreadsheetId = inputUrlOrId.trim();
  }

  // Match GID parameter
  const gidParamMatch = inputUrlOrId.match(/[?&]gid=([0-9]+)/) || inputUrlOrId.match(/#gid=([0-9]+)/);
  if (gidParamMatch && gidParamMatch[1]) {
    gid = gidParamMatch[1];
  }

  return { spreadsheetId, gid };
}

// Fetch single sheet data and return orders
async function fetchSheetData(source: {
  url: string;
  name: string;
  id?: string;
  gid?: string;
  headerRowIndex?: number;
  columnMapping?: ColumnMapping;
  formulaRules?: FormulaRule[];
}) {
  const { spreadsheetId, gid } = parseSpreadsheetInfo(
    source.url || source.id || "",
    source.gid || "714297382"
  );

  const csvUrls = [
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
  ];

  let csvContent = "";
  let lastErr = null;

  for (const csvUrl of csvUrls) {
    try {
      const response = await fetch(csvUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });
      if (response.ok) {
        const text = await response.text();
        if (text && text.length > 10 && !text.includes("<!DOCTYPE html>")) {
          csvContent = text;
          break;
        }
      } else {
        console.warn(`Failed to fetch ${csvUrl}: HTTP ${response.status}`);
      }
    } catch (err) {
      lastErr = err;
      console.error(`Error fetching ${csvUrl}:`, err);
    }
  }

  if (!csvContent) {
    throw new Error(
      `Gagal mengunduh CSV dari sheet "${
        source.name || "Spreadsheet"
      }". Pastikan spreadsheet bersifat Publik ("Siapa saja yang memiliki link").`
    );
  }

  const { headers, rows } = parseCSV(
    csvContent,
    source.headerRowIndex ?? source.columnMapping?.headerRowIndex
  );
  const orders = rows.map((row, idx) => {
    const order = mapSpreadsheetRowToOrder(
      row,
      idx,
      source.columnMapping,
      source.formulaRules
    );
    return {
      ...order,
      sourceSheetName: source.name || "Google Sheet",
      sourceUrl:
        source.url ||
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`
    };
  });

  return {
    sheetId: source.id || spreadsheetId,
    sheetName: source.name || "Google Sheet",
    spreadsheetId,
    gid,
    headers,
    rowCount: orders.length,
    orders
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Looker Studio Inspector Endpoint: Returns detected headers and sample rows for field mapping
  app.post("/api/sheets/inspect", async (req, res) => {
    try {
      const { url, headerRowIndex } = req.body || {};
      if (!url) {
        return res.status(400).json({ success: false, message: "URL spreadsheet wajib diisi" });
      }

      const { spreadsheetId, gid } = parseSpreadsheetInfo(url);
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

      const response = await fetch(csvUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });

      if (!response.ok) {
        return res.status(400).json({
          success: false,
          message: "Gagal mengakses spreadsheet. Pastikan link dapat diakses Publik."
        });
      }

      const csvText = await response.text();
      const { headers, rows } = parseCSV(csvText, headerRowIndex);

      return res.json({
        success: true,
        headers,
        sampleCount: rows.length,
        sampleRows: rows.slice(0, 5)
      });
    } catch (error: any) {
      console.error("Error inspecting sheet:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Gagal menginspeksi spreadsheet"
      });
    }
  });

// Helper to fetch Executed Sinarmas as a lookup dictionary by Order ID
async function getExecutedLookupMap(): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  try {
    const executedSheet = await fetchSheetData({
      name: "EXECUTED SINARMAS",
      url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=714297382`
    });

    for (const ord of executedSheet.orders) {
      const keysToStore = new Set<string>();

      if (ord.id) {
        const k1 = ord.id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        if (k1) keysToStore.add(k1);

        if (ord.id.includes(".")) {
          const base = ord.id.split(".")[0];
          if (base) {
            const kBase = base.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            if (kBase) keysToStore.add(kBase);
          }
        }
      }

      if (ord.poolingId) {
        const k2 = ord.poolingId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        if (k2) keysToStore.add(k2);
      }

      for (const key of keysToStore) {
        const existing = map.get(key);
        if (!existing) {
          map.set(key, ord);
        } else {
          const curCS = (ord.lastUpdateCS || "").trim();
          const exCS = (existing.lastUpdateCS || "").trim();

          let preferredCS = existing.lastUpdateCS;
          if ((!exCS || exCS === "WAITING CONFIRM") && curCS && curCS !== "WAITING CONFIRM") {
            preferredCS = curCS;
          } else if (curCS && curCS !== "WAITING CONFIRM") {
            const { status: curStatus } = resolveCSStatus(curCS);
            if (curStatus === "in_progress" || curStatus === "done") {
              preferredCS = curCS;
            }
          }

          map.set(key, {
            ...existing,
            lastUpdateCS: preferredCS,
            driver: ord.driver || existing.driver,
            vehiclePlate: ord.vehiclePlate || existing.vehiclePlate,
            notes: ord.notes || existing.notes
          });
        }
      }
    }
  } catch (err) {
    console.warn("Executed Sinarmas lookup fetch warning:", err);
  }
  return map;
}

// Function to enrich orders with EXECUTED lookup CS status and deduplicate by Order ID
function enrichAndDeduplicateOrders(rawOrders: any[], executedMap: Map<string, any>): any[] {
  const cleanOrders = rawOrders.filter((ord) => {
    const customer = (ord.customer || "").toUpperCase();
    const notes = (ord.notes || "").toUpperCase();
    const id = (ord.id || "").toUpperCase();
    if (customer.includes("JANGAN DI HAPUS") || notes.includes("JANGAN DI HAPUS") || id.includes("JANGAN DI HAPUS")) {
      return false;
    }
    return true;
  });

  const poolingOrders = cleanOrders.filter((ord) => {
    const sheetName = (ord.sourceSheetName || "").toUpperCase();
    return !sheetName.includes("EXECUTE");
  });

  if (poolingOrders.length > 0) {
    const mergedMap = new Map<string, any>();

    for (const ord of poolingOrders) {
      const normKey = (ord.id || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (!normKey) continue;

      const execInfo = executedMap.get(normKey);
      const updated = { ...ord };

      if (execInfo) {
        const execCS = (execInfo.lastUpdateCS || "").trim();
        if (execCS && execCS !== "WAITING CONFIRM") {
          updated.lastUpdateCS = execCS;
        } else if (execCS && updated.lastUpdateCS === "WAITING CONFIRM") {
          updated.lastUpdateCS = execCS;
        }
        if (execInfo.driver) updated.driver = execInfo.driver;
        if (execInfo.vehiclePlate) updated.vehiclePlate = execInfo.vehiclePlate;
      }

      updated.status = resolveCSStatus(updated.lastUpdateCS).status;
      mergedMap.set(normKey, updated);
    }

    return Array.from(mergedMap.values());
  }

  return cleanOrders.map((ord) => ({
    ...ord,
    status: resolveCSStatus(ord.lastUpdateCS).status
  }));
}

  // API endpoint to fetch connected Google Spreadsheet orders (Supports single or multi-sheet sync)
  app.get("/api/sheets/orders", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const customUrl = (req.query.url as string) || "";
      const customName = (req.query.name as string) || "POOLING SINARMAS";

      const sourceUrl = customUrl || `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${GID}`;
      const sheetResult = await fetchSheetData({ url: sourceUrl, name: customName });

      const executedMap = await getExecutedLookupMap();
      const enrichedOrders = enrichAndDeduplicateOrders(sheetResult.orders, executedMap);

      return res.json({
        success: true,
        spreadsheetId: sheetResult.spreadsheetId,
        gid: sheetResult.gid,
        totalRows: enrichedOrders.length,
        orders: enrichedOrders,
        fetchedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error fetching Google Sheet:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Gagal memuat data dari Google Spreadsheet",
        error: error?.message || String(error)
      });
    }
  });

  // API endpoint to fetch Database sheet items
  app.get("/api/sheets/database", async (_req, res) => {
    try {
      const sheetResult = await fetchSheetData({
        name: "DATABASE",
        url: "https://docs.google.com/spreadsheets/d/1NlUpv_imyYijuCQ2jmQbcZVZr7-H7B_zJmHPimV83Ok/edit?gid=1112335783"
      });

      return sendJsonResponse(res, 200, {
        success: true,
        orders: sheetResult.orders,
        fetchedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error fetching Database Sheet:", error);
      return sendJsonResponse(res, 500, {
        success: false,
        message: error?.message || "Gagal memuat data dari Database Spreadsheet",
        error: error?.message || String(error)
      });
    }
  });

  // API endpoint to fetch EXECUTED SINARMAS sheet items with VLOOKUP fields from Sinarmas sheet
  app.get("/api/sheets/executed", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const executedSheet = await fetchSheetData({
        name: "EXECUTED SINARMAS",
        url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=714297382`
      });

      // VLOOKUP dictionary from Sinarmas spreadsheet (https://docs.google.com/spreadsheets/d/1UFHKYi9YaRsUbz5f87IH3TySGYC2vVdkJgZDXAR666I/edit?gid=449456534)
      const sinarmasMap = new Map<string, { unit: string; driver: string; location: string; eta: string }>();
      try {
        const lookupUrl = "https://docs.google.com/spreadsheets/d/1UFHKYi9YaRsUbz5f87IH3TySGYC2vVdkJgZDXAR666I/export?format=csv&gid=449456534";
        const lookupRes = await fetch(lookupUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        if (lookupRes.ok) {
          const csvText = await lookupRes.text();
          const records = parseCSVRecords(csvText);

          const headers = records[0] ? records[0].map(h => (h || "").trim().toUpperCase()) : [];
          let nopolIdx = headers.findIndex(h => h === "NOPOL" || h === "NOPOL DEDICATED" || h === "MIRROR NOPOL");
          if (nopolIdx === -1) nopolIdx = 30;

          let driverIdx = headers.findIndex(h => h === "ID - DRIVER NAME" || h === "DRIVER ERP");
          if (driverIdx === -1) driverIdx = 31;

          let statusRealtimeIdx = headers.findIndex(h => h === "STATUS REALTIME" || h === "STATUS REALTIME BACKUP");
          if (statusRealtimeIdx === -1) statusRealtimeIdx = 32;

          let etaIdx = headers.findIndex(h => h === "ESTIMATE REQ DLV DATE" || h === "ESTIMATE REQ" || h === "DLV DATE" || h === "SHIPMENT FINISH" || h === "CLOSING TIME PORT (TILA / GATEPASS)" || h.includes("ESTIMATE REQ") || h.includes("DLV DATE"));
          if (etaIdx === -1) etaIdx = headers.findIndex(h => h.includes("ETA") || h.includes("ESTIMASI") || h.includes("TANGGAL"));
          if (etaIdx === -1) etaIdx = 50;

          for (let i = 1; i < records.length; i++) {
            const r = records[i];
            const idKey = (r[0] || "").trim().toUpperCase();
            if (!idKey || idKey.includes("ID ORDER EXECUTE") || idKey.includes("JANGAN DI HAPUS")) continue;

            const sanitize = (val: string) => {
              const trimmed = (val || "").trim();
              if (!trimmed || trimmed.toUpperCase() === "#N/A" || trimmed.toUpperCase() === "N/A") return "";
              return trimmed;
            };

            const unitVal = cleanVehiclePlate(r[nopolIdx] || r[30] || r[29] || r[41] || r[61] || "");
            const driverVal = cleanDriver(r[driverIdx] || r[31] || r[60] || "");
            const locVal = sanitize(r[statusRealtimeIdx] || r[32] || r[56] || r[13] || r[10] || "");
            const etaVal = sanitize(r[etaIdx] || r[50] || r[51] || r[7] || "");

            sinarmasMap.set(idKey, {
              unit: unitVal,
              driver: driverVal,
              location: locVal,
              eta: etaVal
            });
          }
        }
      } catch (err) {
        console.warn("Error fetching Sinarmas VLOOKUP sheet:", err);
      }

      const validExecutedOrders = (executedSheet.orders || [])
        .map((ord: any) => {
          let cleanId = (ord.id || "").trim();
          if (!cleanId || cleanId.toUpperCase().includes("JANGAN DI HAPUS")) {
            cleanId = "SM-D000001.01";
          }
          let cleanCustomer = ord.customer || "";
          if (cleanCustomer.toUpperCase().includes("JANGAN DI HAPUS") || !cleanCustomer) {
            cleanCustomer = "INDAH KIAT PULP & PAPER TBK.";
          }

          const lookup = sinarmasMap.get(cleanId.toUpperCase());

          return {
            ...ord,
            id: cleanId,
            customer: cleanCustomer,
            quantity: 1,
            status: resolveCSStatus(ord.lastUpdateCS).status,
            // VLOOKUP result fields (UNIT / PLAT NO, DRIVER, LOKASI TERKINI, ETA):
            vehiclePlate: cleanVehiclePlate(lookup && lookup.unit ? lookup.unit : (ord.vehiclePlate || "")),
            driver: cleanDriver(lookup && lookup.driver ? lookup.driver : (ord.driver || "")),
            origin: ord.origin || "IKK Karawang",
            statusRealtime: lookup && lookup.location ? lookup.location : (ord.statusRealtime || ""),
            eta: lookup && lookup.eta ? lookup.eta : (ord.eta || "")
          };
        });

      return res.json({
        success: true,
        totalExecuted: validExecutedOrders.length,
        orders: validExecutedOrders,
        fetchedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error fetching EXECUTED SINARMAS sheet:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Gagal memuat data EXECUTED SINARMAS",
        error: String(error)
      });
    }
  });

  // API endpoint to fetch multiple sheets concurrently
  app.post("/api/sheets/orders", async (req, res) => {
    try {
      const { sheets } = req.body || {};

      if (!Array.isArray(sheets) || sheets.length === 0) {
        // Fallback to default single sheet if empty array provided
        const defaultSheet = await fetchSheetData({
          name: "POOLING SINARMAS",
          url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${GID}`
        });
        const executedMap = await getExecutedLookupMap();
        const enrichedOrders = enrichAndDeduplicateOrders(defaultSheet.orders, executedMap);

        return res.json({
          success: true,
          totalOrders: enrichedOrders.length,
          orders: enrichedOrders,
          sheetResults: [{
            name: "POOLING SINARMAS",
            status: "success",
            rowCount: enrichedOrders.length
          }],
          fetchedAt: new Date().toISOString()
        });
      }

      // Filter enabled sheets only
      const enabledSheets = sheets.filter((s) => s.enabled !== false && s.url && s.url.trim().length > 0);

      if (enabledSheets.length === 0) {
        return res.json({
          success: true,
          totalOrders: 0,
          orders: [],
          sheetResults: [],
          message: "Tidak ada sheet aktif yang dikirim.",
          fetchedAt: new Date().toISOString()
        });
      }

      const results = await Promise.allSettled(
        enabledSheets.map((s) =>
          fetchSheetData({
            id: s.id,
            url: s.url,
            name: s.name || "Google Sheet",
            headerRowIndex: s.headerRowIndex ?? s.columnMapping?.headerRowIndex,
            columnMapping: s.columnMapping,
            formulaRules: s.formulaRules
          })
        )
      );

      const allOrders: any[] = [];
      const sheetResults: any[] = [];

      results.forEach((res, index) => {
        const sheetMeta = enabledSheets[index];
        if (res.status === "fulfilled") {
          allOrders.push(...res.value.orders);
          sheetResults.push({
            id: sheetMeta.id,
            name: res.value.sheetName,
            status: "success",
            rowCount: res.value.rowCount,
            spreadsheetId: res.value.spreadsheetId,
            gid: res.value.gid
          });
        } else {
          sheetResults.push({
            id: sheetMeta.id,
            name: sheetMeta.name,
            status: "error",
            rowCount: 0,
            errorMessage: res.reason?.message || "Gagal mengunduh sheet"
          });
        }
      });

      const executedMap = await getExecutedLookupMap();
      const finalOrders = enrichAndDeduplicateOrders(allOrders, executedMap);

      return res.json({
        success: true,
        totalOrders: finalOrders.length,
        orders: finalOrders,
        sheetResults,
        fetchedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error multi-sheet sync:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Internal server error fetching multi-sheets",
        error: String(error)
      });
    }
  });

  // API endpoint for TikPro (monitoring-kontrak-export.web.app) Live Data Mirroring
  app.all("/api/tikpro/data", async (req, res) => {
    try {
      const email = (req.body?.email || req.query?.email || "pdt@ikk.com").toString();
      const password = (req.body?.password || req.query?.password || "pdt@ikk.com").toString();
      const vendorFilter = (req.body?.vendorFilter || req.query?.vendorFilter || "Pancaran Darat").toString();
      const forceRefresh = req.body?.forceRefresh === true || req.query?.forceRefresh === "true";

      const data = await getTikProMirrorData(email, password, vendorFilter, forceRefresh);
      return res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error("Error fetching TikPro mirror data:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Gagal melakukan mirroring data TikPro",
        error: String(error)
      });
    }
  });

  // API endpoint for PA IKPP Performance and Availability Data (Supports all spreadsheet dates & instant caching)
  app.all("/api/pa-ikpp/data", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const targetDate = (req.query?.date || req.body?.date || "").toString().trim();
      const forceRefresh = req.query?.refresh === "true" || req.body?.refresh === true;

      const data = await getPaIkppServerData(targetDate, forceRefresh);
      return res.json(data);
    } catch (error: any) {
      console.error("Error fetching PA IKPP data:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Gagal memuat data PA IKPP",
        error: String(error)
      });
    }
  });

  // Dedicated endpoint for Sheet_Helper live drivers
  app.get("/api/drivers", async (req, res) => {
    const params = await extractRequestParams(req);
    const result = await getDriversData(params);
    return sendJsonResponse(res, result.statusCode, result.payload);
  });

  // API endpoint for Monitoring Driver Performance linked directly to user's Google Spreadsheet
  app.all("/api/sheets/driver-performance", async (req, res) => {
    const params = await extractRequestParams(req);
    const result = await getDriverPerformanceData(params);
    return sendJsonResponse(res, result.statusCode, result.payload);
  });

  // Dedicated API endpoint for Sheet_Helper tab (gid: 1899483729)
  app.get("/api/sheets/sheet-helper", async (_req, res) => {
    const result = await getSheetHelperData();
    return sendJsonResponse(res, result.statusCode, result.payload);
  });

  // API endpoint for Monitoring Mobo Activity linked directly to user's Google Spreadsheet (gid: 0)
  app.all("/api/sheets/mobo-activity", async (req, res) => {
    const params = await extractRequestParams(req);
    const result = await getMoboActivityData(params);
    return sendJsonResponse(res, result.statusCode, result.payload);
  });

  // 1. Data Performance Driver Mirroring endpoint
  app.all("/api/sheets/master-data/performance-driver", async (req, res) => {
    const params = await extractRequestParams(req);
    const result = await getMasterPerformanceDriverData(params);
    return sendJsonResponse(res, result.statusCode, result.payload);
  });

  // 2. Monitoring Mobo Activity Mirroring endpoint (from Summ Activity tab gid=48124589)
  app.all("/api/sheets/master-data/mobo-activity", async (req, res) => {
    const params = await extractRequestParams(req);
    const result = await getMasterMoboActivityData(params);
    return sendJsonResponse(res, result.statusCode, result.payload);
  });

  // 3. Dedicated API endpoint for Mobo Activity Summary & Dashboard (GID 262473085)
  app.all("/api/sheets/mobo-summary", async (req, res) => {
    const params = await extractRequestParams(req);
    const result = await getMoboSummaryData(params);
    return sendJsonResponse(res, result.statusCode, result.payload);
  });



  // Google Search Console Site Verification route
  app.get(["/googleaf84f6e2d0d1ea6b.html", "/googleaf84f6e2d0d1ea6b"], (req, res) => {
    res.type("text/html").send("google-site-verification: googleaf84f6e2d0d1ea6b.html");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
