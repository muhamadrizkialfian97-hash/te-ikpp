import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchSheetData } from "../../src/lib/sheetsEngine.js";
import { sendJsonResponse } from "../../server/hseSheets.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
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
    console.error("Error in /api/sheets/database:", error);
    return sendJsonResponse(res, 500, {
      success: false,
      message: error?.message || "Gagal memuat data dari Database Spreadsheet",
      error: error?.message || String(error)
    });
  }
}
