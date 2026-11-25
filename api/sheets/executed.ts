import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  SPREADSHEET_ID,
  GID_EXECUTED,
  fetchSheetData,
  parseCSVRecords,
  resolveCSStatus,
  cleanVehiclePlate,
  cleanDriver
} from "../../src/lib/sheetsEngine.js";

let cachedExecutedResult: { timestamp: number; payload: any } | null = null;
const EXECUTED_CACHE_TTL = 30000; // 30 seconds

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    if (cachedExecutedResult && Date.now() - cachedExecutedResult.timestamp < EXECUTED_CACHE_TTL) {
      return res.status(200).json(cachedExecutedResult.payload);
    }

    const executedSheet = await fetchSheetData({
      name: "EXECUTED SINARMAS",
      url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${GID_EXECUTED}`
    });

    // VLOOKUP dictionary from Sinarmas spreadsheet
    const sinarmasMap = new Map<string, { unit: string; driver: string; location: string; eta: string }>();
    try {
      const lookupUrl = "https://docs.google.com/spreadsheets/d/1UFHKYi9YaRsUbz5f87IH3TySGYC2vVdkJgZDXAR666I/export?format=csv&gid=449456534";
      const lookupRes = await fetch(lookupUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      if (lookupRes.ok) {
        const csvText = await lookupRes.text();
        const records = parseCSVRecords(csvText);

        const headers = records[0] ? records[0].map((h) => (h || "").trim().toUpperCase()) : [];
        let nopolIdx = headers.findIndex((h) => h === "NOPOL" || h === "NOPOL DEDICATED" || h === "MIRROR NOPOL");
        if (nopolIdx === -1) nopolIdx = 30;

        let driverIdx = headers.findIndex((h) => h === "ID - DRIVER NAME" || h === "DRIVER ERP");
        if (driverIdx === -1) driverIdx = 31;

        let statusRealtimeIdx = headers.findIndex((h) => h === "STATUS REALTIME" || h === "STATUS REALTIME BACKUP");
        if (statusRealtimeIdx === -1) statusRealtimeIdx = 32;

        let etaIdx = headers.findIndex((h) =>
          h === "ESTIMATE REQ DLV DATE" ||
          h === "ESTIMATE REQ" ||
          h === "DLV DATE" ||
          h === "SHIPMENT FINISH" ||
          h === "CLOSING TIME PORT (TILA / GATEPASS)" ||
          h.includes("ESTIMATE REQ") ||
          h.includes("DLV DATE")
        );
        if (etaIdx === -1) etaIdx = headers.findIndex((h) => h.includes("ETA") || h.includes("ESTIMASI") || h.includes("TANGGAL"));
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

    const validExecutedOrders = (executedSheet.orders || []).map((ord: any) => {
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
        vehiclePlate: cleanVehiclePlate(lookup && lookup.unit ? lookup.unit : (ord.vehiclePlate || "")),
        driver: cleanDriver(lookup && lookup.driver ? lookup.driver : (ord.driver || "")),
        origin: ord.origin || "IKK Karawang",
        statusRealtime: lookup && lookup.location ? lookup.location : (ord.statusRealtime || ""),
        eta: lookup && lookup.eta ? lookup.eta : (ord.eta || "")
      };
    });

    const payload = {
      success: true,
      totalExecuted: validExecutedOrders.length,
      totalRows: validExecutedOrders.length,
      orders: validExecutedOrders,
      fetchedAt: new Date().toISOString()
    };

    if (validExecutedOrders.length > 0) {
      cachedExecutedResult = { timestamp: Date.now(), payload };
    }

    return res.status(200).json(payload);
  } catch (error: any) {
    if (cachedExecutedResult?.payload) {
      return res.status(200).json(cachedExecutedResult.payload);
    }
    return res.status(500).json({
      success: false,
      message: error?.message || "Gagal memuat data dari EXECUTED SINARMAS sheet",
      error: error?.message || String(error)
    });
  }
}
