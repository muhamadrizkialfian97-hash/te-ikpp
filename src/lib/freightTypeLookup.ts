export interface FreightTypeResult {
  freightType: string;
  freightType2: "EXPORT" | "REPO FULL" | "REPO EMPTY" | "IMPORT";
}

export const ROUTE_MAPPINGS_STORAGE_KEY = "pancaran_route_freight_mappings";

// Default Master Lookup Route -> Freight Type 2 parameters
export const DEFAULT_ROUTE_MAPPINGS: Record<string, "EXPORT" | "REPO FULL" | "REPO EMPTY" | "IMPORT"> = {
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

export function normalizeRouteKey(key?: string): string {
  if (!key) return "";
  return key.replace(/\s+/g, " ").trim().toUpperCase();
}

export function getStoredRouteMappings(): Record<string, string> {
  const defaults = { ...DEFAULT_ROUTE_MAPPINGS };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(ROUTE_MAPPINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ROUTE_MAPPINGS_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const saved = JSON.parse(raw);
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

export function saveRouteMapping(route: string, newFreightType: string): Record<string, string> {
  const current = getStoredRouteMappings();
  const rawKey = (route || "").trim().toUpperCase();
  const cleanKey = normalizeRouteKey(route);
  const updated = { ...current, [cleanKey]: newFreightType };
  if (rawKey && rawKey !== cleanKey) {
    updated[rawKey] = newFreightType;
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ROUTE_MAPPINGS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("pancaran_route_mappings_updated", { detail: updated }));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Failed to save route mapping:", e);
    }
  }
  return updated;
}

export function deriveFreightTypes(
  commercialRoute?: string,
  pickUpLocation?: string,
  dropOffLocation?: string,
  notes?: string,
  customMappings?: Record<string, string>
): FreightTypeResult {
  const rawCr = (commercialRoute || "").trim().toUpperCase();
  const cr = normalizeRouteKey(commercialRoute);
  const pick = (pickUpLocation || "").trim().toUpperCase();
  const drop = (dropOffLocation || "").trim().toUpperCase();
  const note = (notes || "").trim().toUpperCase();
  const fullText = `${cr} ${pick} ${drop} ${note}`;

  // 1. Check Master Lookup custom / saved mappings first
  const mappings = customMappings || getStoredRouteMappings();

  // Try direct normalized match
  if (cr) {
    const directVal = mappings[cr] || mappings[rawCr];
    if (directVal) {
      const customFt2 = directVal.toUpperCase() as "EXPORT" | "REPO FULL" | "REPO EMPTY" | "IMPORT";
      if (["EXPORT", "REPO FULL", "REPO EMPTY", "IMPORT"].includes(customFt2)) {
        return {
          freightType: customFt2,
          freightType2: customFt2
        };
      }
    }

    // Try finding match among normalized mapping keys, longest key first
    const entries = Object.entries(mappings).sort((a, b) => b[0].length - a[0].length);
    for (const [key, val] of entries) {
      const normKey = normalizeRouteKey(key);
      if (normKey && (cr === normKey || cr.includes(normKey))) {
        const customFt2 = val.toUpperCase() as "EXPORT" | "REPO FULL" | "REPO EMPTY" | "IMPORT";
        if (["EXPORT", "REPO FULL", "REPO EMPTY", "IMPORT"].includes(customFt2)) {
          return {
            freightType: customFt2,
            freightType2: customFt2
          };
        }
      }
    }
  }

  // 2. Built-in rule heuristics
  // Check IMPORT
  if (cr.includes("IMPORT") || cr.includes("IMPOR") || fullText.includes("IMPORT") || fullText.includes("IMPOR")) {
    return {
      freightType: "IMPORT",
      freightType2: "IMPORT"
    };
  }

  // Check REPO EMPTY
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
    return {
      freightType: "REPO EMPTY",
      freightType2: "REPO EMPTY"
    };
  }

  // Check REPO FULL
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
    return {
      freightType: isSpecialRepoExport ? "REPO EXPORT" : "REPO FULL",
      freightType2: "REPO FULL"
    };
  }

  // Check EXPORT (IKK)
  if (
    cr.includes("KARAWANG - TANJUNG PRIOK (IKK)") ||
    cr.includes("(IKK)") ||
    cr.includes("EKSPOR") ||
    cr.includes("EXPORT") ||
    pick.includes("INDAH KIAT") ||
    pick.includes("KARAWANG")
  ) {
    return {
      freightType: "EXPORT",
      freightType2: "EXPORT"
    };
  }

  // Default Fallback
  return {
    freightType: "EXPORT",
    freightType2: "EXPORT"
  };
}

export function resolveOrderType(ft2?: string): "repo_empty" | "repo_full" | "impor" | "ekspor" {
  const upper = (ft2 || "").toUpperCase();
  if (upper.includes("REPO EMPTY")) return "repo_empty";
  if (upper.includes("REPO FULL")) return "repo_full";
  if (upper.includes("IMPORT") || upper.includes("IMPOR")) return "impor";
  return "ekspor";
}
