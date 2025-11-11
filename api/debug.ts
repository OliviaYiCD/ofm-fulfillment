import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const need = [
    "LMW_TOKEN_URL",
    "LMW_CLIENT_ID",
    "LMW_CLIENT_SECRET",
    "LMW_USERNAME",
    "LMW_PASSWORD",
    "LMW_ION_URL",
    "LMW_ION_DOCNAME",
    "LMW_ION_ENCODING",
    "LMW_ION_FROM_LID",
    "LMW_GRANT",
    "LMW_SCOPE",
    "LMW_ACCESS_TOKEN",
  ];
  const present: Record<string, boolean> = {};
  for (const k of need) present[k] = !!process.env[k];

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    envPresent: present,
    tip: "Values shown are true/false only. If any required value is false, set it in Vercel → Project → Settings → Environment Variables and redeploy.",
  });
}