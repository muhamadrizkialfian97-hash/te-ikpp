import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  SPREADSHEET_ID,
  GID_POOLING,
  fetchSheetData,
  getExecutedLookupMap,
  enrichAndDeduplicateOrders
} from "../../src/lib/sheetsEngine.js";

let cachedOrdersResult: { timestamp: number; payload: any } | null = null;
const ORDERS_CACHE_TTL = 30000; // 30 seconds

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    if (req.method === "POST") {
      const { sheets } = req.body || {};

      if (!Array.isArray(sheets) || sheets.length === 0) {
        if (cachedOrdersResult && Date.now() - cachedOrdersResult.timestamp < ORDERS_CACHE_TTL) {
          return res.status(200).json(cachedOrdersResult.payload);
        }

        const defaultSheet = await fetchSheetData({
          name: "POOLING SINARMAS",
          url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${GID_POOLING}`
        });
        const executedMap = await getExecutedLookupMap();
        const enrichedOrders = enrichAndDeduplicateOrders(defaultSheet.orders, executedMap);

        const payload = {
          success: true,
          totalOrders: enrichedOrders.length,
          orders: enrichedOrders,
          sheetResults: [{
            name: "POOLING SINARMAS",
            status: "success",
            rowCount: enrichedOrders.length
          }],
          fetchedAt: new Date().toISOString()
        };
        cachedOrdersResult = { timestamp: Date.now(), payload };
        return res.status(200).json(payload);
      }

      const enabledSheets = sheets.filter((s: any) => s.enabled !== false && s.url && s.url.trim().length > 0);

      if (enabledSheets.length === 0) {
        return res.status(200).json({
          success: true,
          totalOrders: 0,
          orders: [],
          sheetResults: [],
          message: "Tidak ada sheet aktif yang dikirim.",
          fetchedAt: new Date().toISOString()
        });
      }

      const results = await Promise.allSettled(
        enabledSheets.map((s: any) =>
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

      results.forEach((r, index) => {
        const sheetMeta = enabledSheets[index];
        if (r.status === "fulfilled") {
          allOrders.push(...r.value.orders);
          sheetResults.push({
            id: sheetMeta.id,
            name: r.value.sheetName,
            status: "success",
            rowCount: r.value.rowCount,
            spreadsheetId: r.value.spreadsheetId,
            gid: r.value.gid
          });
        } else {
          sheetResults.push({
            id: sheetMeta.id,
            name: sheetMeta.name,
            status: "error",
            rowCount: 0,
            errorMessage: r.reason?.message || "Gagal mengunduh sheet"
          });
        }
      });

      const executedMap = await getExecutedLookupMap();
      const finalOrders = enrichAndDeduplicateOrders(allOrders, executedMap);

      return res.status(200).json({
        success: true,
        totalOrders: finalOrders.length,
        orders: finalOrders,
        sheetResults,
        fetchedAt: new Date().toISOString()
      });
    }

    const customUrl = (req.query.url as string) || "";
    const customName = (req.query.name as string) || "POOLING SINARMAS";

    if (!customUrl && cachedOrdersResult && Date.now() - cachedOrdersResult.timestamp < ORDERS_CACHE_TTL) {
      return res.status(200).json(cachedOrdersResult.payload);
    }

    const sourceUrl = customUrl || `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${GID_POOLING}`;
    const sheetResult = await fetchSheetData({ url: sourceUrl, name: customName });

    const executedMap = await getExecutedLookupMap();
    const enrichedOrders = enrichAndDeduplicateOrders(sheetResult.orders, executedMap);

    const payload = {
      success: true,
      spreadsheetId: sheetResult.spreadsheetId,
      gid: sheetResult.gid,
      totalRows: enrichedOrders.length,
      orders: enrichedOrders,
      fetchedAt: new Date().toISOString()
    };

    if (!customUrl && enrichedOrders.length > 0) {
      cachedOrdersResult = { timestamp: Date.now(), payload };
    }

    return res.status(200).json(payload);
  } catch (error: any) {
    if (cachedOrdersResult?.payload) {
      return res.status(200).json(cachedOrdersResult.payload);
    }
    return res.status(500).json({
      success: false,
      message: error?.message || "Gagal memuat data dari Google Spreadsheet",
      error: error?.message || String(error)
    });
  }
}
