import type { VercelRequest, VercelResponse } from "@vercel/node";
import { extractRequestParams, getMoboSummaryData, sendJsonResponse } from "../../server/hseSheets.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const params = await extractRequestParams(req);
    const result = await getMoboSummaryData(params);
    return sendJsonResponse(res, result.statusCode, result.payload);
  } catch (error: any) {
    console.error("Error in /api/sheets/mobo-summary:", error);
    return sendJsonResponse(res, 500, {
      success: false,
      message: error?.message || String(error)
    });
  }
}
