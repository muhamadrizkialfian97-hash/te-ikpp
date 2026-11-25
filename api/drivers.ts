import type { VercelRequest, VercelResponse } from "@vercel/node";
import { extractRequestParams, getDriversData, sendJsonResponse } from "../server/hseSheets.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const params = await extractRequestParams(req);
    const result = await getDriversData(params);
    return sendJsonResponse(res, result.statusCode, result.payload);
  } catch (error: any) {
    console.error("Error in /api/drivers:", error);
    return sendJsonResponse(res, 500, {
      success: false,
      error: error?.message || String(error)
    });
  }
}
