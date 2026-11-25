import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getTikProMirrorData } from "../../server/tikpro.js";
import { extractRequestParams, sendJsonResponse } from "../../server/hseSheets.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const params = await extractRequestParams(req);
    const email = (params.email || "pdt@ikk.com").toString();
    const password = (params.password || "pdt@ikk.com").toString();
    const vendorFilter = (params.vendorFilter || "Pancaran Darat").toString();
    const forceRefresh = params.forceRefresh === true || params.forceRefresh === "true";

    const data = await getTikProMirrorData(email, password, vendorFilter, forceRefresh);
    return sendJsonResponse(res, 200, {
      success: true,
      data
    });
  } catch (error: any) {
    console.error("Error fetching TikPro mirror data:", error);
    return sendJsonResponse(res, 500, {
      success: false,
      message: error?.message || "Gagal melakukan mirroring data TikPro",
      error: String(error)
    });
  }
}
