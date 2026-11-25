import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSheetHelperData, sendJsonResponse } from "../../server/hseSheets.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const result = await getSheetHelperData();
    return sendJsonResponse(res, result.statusCode, result.payload);
  } catch (error: any) {
    console.error("Error in /api/sheets/sheet-helper:", error);
    return sendJsonResponse(res, 500, {
      success: false,
      error: String(error)
    });
  }
}
