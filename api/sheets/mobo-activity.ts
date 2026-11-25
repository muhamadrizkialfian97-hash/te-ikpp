import type { VercelRequest, VercelResponse } from "@vercel/node";
import { extractRequestParams, getMoboActivityData, sendJsonResponse } from "../../server/hseSheets.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const params = await extractRequestParams(req);
    const result = await getMoboActivityData(params);
    return sendJsonResponse(res, result.statusCode, result.payload);
  } catch (error: any) {
    console.error("Error in /api/sheets/mobo-activity:", error);
    return sendJsonResponse(res, 500, {
      success: false,
      message: error?.message || "Gagal memproses spreadsheet mobo activity",
      error: String(error)
    });
  }
}
