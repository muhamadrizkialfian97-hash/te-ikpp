import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPaIkppServerData } from "../../server/paIkpp.js";
import { extractRequestParams, sendJsonResponse } from "../../server/hseSheets.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const params = await extractRequestParams(req);
    const targetDate = (params.date || "").toString().trim();
    const forceRefresh = params.refresh === "true" || params.refresh === true;

    const data = await getPaIkppServerData(targetDate, forceRefresh);
    return sendJsonResponse(res, 200, data);
  } catch (error: any) {
    console.error("Error fetching PA IKPP data:", error);
    return sendJsonResponse(res, 500, {
      success: false,
      message: error?.message || "Gagal memuat data PA IKPP",
      error: String(error)
    });
  }
}
