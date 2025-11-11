import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const need = [
    "LMW_TOKEN_URL","LMW_CLIENT_ID","LMW_CLIENT_SECRET","LMW_USERNAME","LMW_PASSWORD",
    "LMW_ION_URL","LMW_ION_DOCNAME","LMW_ION_ENCODING","LMW_ION_FROM_LID","LMW_GRANT"
  ];
  const envPresent: Record<string, boolean> = {};
  need.forEach(k => envPresent[k] = !!process.env[k]);

  res.setHeader("Cache-Control","no-store");
  res.status(200).json({ ok: true, envPresent });
}