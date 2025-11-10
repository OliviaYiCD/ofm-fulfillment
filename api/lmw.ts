import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

function env(name: string, optional = false) {
  const v = process.env[name];
  if (!optional && !v) throw new Error(`Missing env: ${name}`);
  return v as string;
}

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function getAccessToken(): Promise<string> {
  const preset = process.env.LMW_ACCESS_TOKEN;
  if (preset) return preset;

  const tokenUrl = env("LMW_TOKEN_URL");
  const clientId = env("LMW_CLIENT_ID");
  const clientSecret = env("LMW_CLIENT_SECRET");
  const grant = (process.env.LMW_GRANT || "password").toLowerCase();
  const scope = process.env.LMW_SCOPE;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const common = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    timeout: 20000,
    validateStatus: () => true,
  } as const;

  if (grant === "client_credentials") {
    const form = new URLSearchParams();
    form.set("grant_type", "client_credentials");
    if (scope) form.set("scope", scope);
    const r = await axios.post(tokenUrl, form, common);
    if (r.status >= 200 && r.status < 300 && r.data?.access_token) {
      return String(r.data.access_token);
    }
    throw new Error(
      `Token failed (client_credentials): ${r.status} ${r.statusText} ${JSON.stringify(r.data)}`
    );
  }

  const username = env("LMW_USERNAME");
  const password = env("LMW_PASSWORD");
  const form = new URLSearchParams();
  form.set("grant_type", "password");
  form.set("username", username);
  form.set("password", password);
  if (scope) form.set("scope", scope);

  const r = await axios.post(tokenUrl, form, common);
  if (r.status >= 200 && r.status < 300 && r.data?.access_token) {
    return String(r.data.access_token);
  }
  throw new Error(
    `Token failed (password): ${r.status} ${r.statusText} ${JSON.stringify(r.data)}`
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET")    return res.status(200).json({ ok: true, message: "LMW endpoint ready" });
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS, GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const bodyIn = (req.body ?? {}) as Record<string, any>;
    const documentId =
      (typeof bodyIn.orderId === "string" && bodyIn.orderId.trim()) ||
      (typeof bodyIn.documentId === "string" && bodyIn.documentId.trim()) ||
      `ofm-${Date.now()}`;

    const payload = {
      documentId,
      test: bodyIn.test ?? "test",
      desc: bodyIn.desc ?? `OFM submission${bodyIn.authority ? ` to ${bodyIn.authority}` : ""}`,
      status: bodyIn.status ?? "test",
      modified: bodyIn.modified ?? new Date().toISOString(),
      ...bodyIn,
      documentIdCanonical: documentId,
    };

    const token = await getAccessToken();

    const ionUrl = env("LMW_ION_URL");
    const ionDocName = env("LMW_ION_DOCNAME", true) || "AnyDocument";
    const ionEncoding = env("LMW_ION_ENCODING", true) || "NONE";
    const ionFromLid = env("LMW_ION_FROM_LID", true) || "lid://infor.ims.dyeanddurham";

    const ionResp = await axios.post(ionUrl, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        accept: "application/json",
        "X-Infor-ION-documentName": ionDocName,
        "X-Infor-ION-encoding": ionEncoding,
        "X-Infor-ION-fromLogicalId": ionFromLid,
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    const ok = ionResp.status >= 200 && ionResp.status < 300;
    return res.status(ok ? 200 : 502).json({
      ok,
      status: ionResp.status,
      statusText: ionResp.statusText,
      response: ionResp.data ?? ionResp.statusText,
      sent: payload,
      usedHeaders: {
        "X-Infor-ION-documentName": ionDocName,
        "X-Infor-ION-encoding": ionEncoding,
        "X-Infor-ION-fromLogicalId": ionFromLid,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}