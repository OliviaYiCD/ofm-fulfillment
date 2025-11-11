import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

function env(name: string, optional = false) {
  const v = process.env[name];
  if (!optional && !v) throw new Error(`Missing env: ${name}`);
  return v as string;
}

function cors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
}

async function getAccessToken(): Promise<string> {
  if (process.env.LMW_ACCESS_TOKEN) return process.env.LMW_ACCESS_TOKEN as string;

  const tokenUrl = env("LMW_TOKEN_URL");
  const clientId = env("LMW_CLIENT_ID");
  const clientSecret = env("LMW_CLIENT_SECRET");
  const grant = (process.env.LMW_GRANT || "password").toLowerCase();
  const scope = process.env.LMW_SCOPE;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const cfg = {
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    timeout: 20000,
    validateStatus: () => true,
  } as const;
  const okToken = (r: any) => r?.status >= 200 && r?.status < 300 && r?.data?.access_token;

  if (grant === "client_credentials") {
    const f1 = new URLSearchParams();
    f1.set("grant_type", "client_credentials");
    if (scope) f1.set("scope", scope);
    const r1 = await axios.post(tokenUrl, f1, cfg);
    if (okToken(r1)) return String(r1.data.access_token);

    const f2 = new URLSearchParams(f1);
    f2.set("client_id", clientId);
    f2.set("client_secret", clientSecret);
    const r2 = await axios.post(tokenUrl, f2, cfg);
    if (okToken(r2)) return String(r2.data.access_token);

    throw new Error(`token(client_credentials) ${r1.status} ${r1.statusText} ${JSON.stringify(r1.data)}; retry=${r2.status} ${r2.statusText} ${JSON.stringify(r2.data)}`);
  }

  const username = env("LMW_USERNAME");
  const password = env("LMW_PASSWORD");

  const f1 = new URLSearchParams();
  f1.set("grant_type", "password");
  f1.set("username", username);
  f1.set("password", password);
  if (scope) f1.set("scope", scope);
  const r1 = await axios.post(tokenUrl, f1, cfg);
  if (okToken(r1)) return String(r1.data.access_token);

  const f2 = new URLSearchParams(f1);
  f2.set("client_id", clientId);
  f2.set("client_secret", clientSecret);
  const r2 = await axios.post(tokenUrl, f2, cfg);
  if (okToken(r2)) return String(r2.data.access_token);

  throw new Error(`token(password) ${r1.status} ${r1.statusText} ${JSON.stringify(r1.data)}; retry=${r2.status} ${r2.statusText} ${JSON.stringify(r2.data)}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS" || req.method === "HEAD") return res.status(204).end();
  if (req.method === "GET") return res.status(200).json({ ok: true, message: "LMW endpoint ready" });
  if (req.method !== "POST") { res.setHeader("Allow", "POST, OPTIONS, GET, HEAD"); return res.status(405).json({ ok: false, error: "Method Not Allowed" }); }

  const debug: Record<string, any> = {};
  try {
    const body = (req.body ?? {}) as Record<string, any>;
    debug.incomingKeys = Object.keys(body);

    const documentId =
      (typeof body.orderId === "string" && body.orderId.trim()) ||
      (typeof body.documentId === "string" && body.documentId.trim()) ||
      `ofm-${Date.now()}`;

    const payload = {
      documentId,
      test: body.test ?? "test",
      desc: body.desc ?? `OFM submission${body.authority ? ` to ${body.authority}` : ""}`,
      status: body.status ?? "test",
      modified: body.modified ?? new Date().toISOString(),
      ...body,
      documentIdCanonical: documentId,
    };

    debug.stage = "token";
    const token = await getAccessToken();
    debug.gotToken = Boolean(token);

    debug.stage = "ion";
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
      debug,
    });
  } catch (err: any) {
    const ax = err?.response;
    debug.errorStage = debug.stage || "unknown";
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
      axios: ax ? { status: ax.status, statusText: ax.statusText, data: ax.data } : null,
      debug,
    });
  }
}