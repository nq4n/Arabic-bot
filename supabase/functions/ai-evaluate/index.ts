// supabase/functions/ai-evaluate/index.ts
// Server-side proxy for AI evaluation (grading). Same protection as ai-chat:
// the OpenRouter key stays a secret and only logged-in users can call it.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openRouterKey = Deno.env.get("OPENROUTER_API_KEY")!;

const PRIMARY_MODEL = Deno.env.get("AI_EVAL_MODEL") || "qwen/qwen3.8-omni-flash";
const FALLBACK_MODEL = Deno.env.get("AI_FALLBACK_MODEL") || "qwen/qwen3.7-flash";
// Extra fallbacks tried only after the first two fail. Comma-separated, env-overridable.
const EXTRA_FALLBACKS = (
  Deno.env.get("AI_EXTRA_FALLBACKS") || "qwen/qwen3.8-flash,qwen/qwen3-30b-a3b-instruct-2507"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// How long to wait for a single OpenRouter call before giving up and retrying.
const REQUEST_TIMEOUT_MS = 60000;
// Statuses worth retrying on the SAME model (transient congestion / infra).
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Exponential backoff with jitter so a whole class retrying at once doesn't sync up.
const backoff = (attempt: number) =>
  Math.min(2 ** attempt * 1200, 12000) + Math.floor(Math.random() * 400);

const buildModelChain = (): string[] => [
  ...new Set([PRIMARY_MODEL, FALLBACK_MODEL, ...EXTRA_FALLBACKS]),
];

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

async function callOpenRouter(messages: unknown, temperature: number) {
  const models = buildModelChain();
  const maxAttempts = 4;
  let lastError = "failed";
  let lastStatus = 0;

  for (const model of models) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      let res: Response;
      try {
        res = await fetchWithTimeout(
          OPENROUTER_URL,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://arabic-bot-7h16.onrender.com",
              "X-Title": "Arabic Writing Platform",
            },
            body: JSON.stringify({
              model,
              messages,
              temperature,
              provider: { allow_fallbacks: true },
            }),
          },
          REQUEST_TIMEOUT_MS
        );
      } catch (err) {
        // Network error or timeout (AbortController) — treat as transient, retry.
        lastError = `network/${(err as Error)?.name || "error"}`;
        console.error(`[ai-evaluate] ${model} attempt ${attempt}: ${lastError}`);
        await sleep(backoff(attempt));
        continue;
      }

      if (res.ok) {
        const data = await res.json().catch(() => null);
        const content = data?.choices?.[0]?.message?.content;
        if (content != null && String(content).trim() !== "") return { content };
        lastError = "empty response";
        console.error(`[ai-evaluate] ${model} returned an empty/invalid body`);
        break; // try the next model
      }

      // Capture the REAL upstream reason so it shows up in the function logs.
      const bodyText = await res.text().catch(() => "");
      lastStatus = res.status;
      lastError = `upstream ${res.status}`;
      console.error(
        `[ai-evaluate] ${model} attempt ${attempt} -> HTTP ${res.status}: ${bodyText.slice(0, 400)}`
      );

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : backoff(attempt);
        await sleep(delay);
        continue;
      }

      // 404 = "No endpoints found" for this model (transient provider availability).
      // Give it one quick retry, then fall through to the next model in the chain.
      if (res.status === 404) {
        if (attempt === 0) {
          await sleep(800);
          continue;
        }
        break;
      }

      if (RETRYABLE_STATUS.has(res.status)) {
        await sleep(backoff(attempt));
        continue;
      }

      // 400/401/403 and other non-transient errors: retrying the same model
      // won't help, so move on to the next model.
      break;
    }
  }

  return { error: lastError, status: lastStatus };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders, status: 200 });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ success: false, error: "يجب تسجيل الدخول." }, 401);
    }

    const { systemPrompt, userContent, temperature } = await req.json();
    if (!systemPrompt || !userContent) {
      return json({ success: false, error: "systemPrompt و userContent مطلوبة" });
    }

    const result = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      typeof temperature === "number" ? temperature : 0.2
    );

    if ("error" in result) {
      console.error(
        `[ai-evaluate] all models failed: ${result.error} (status ${result.status ?? 0})`
      );
      return json({
        success: false,
        error: "فشل الاتصال بخدمة التقييم.",
        detail: result.error,
      });
    }

    return json({ success: true, content: result.content });
  } catch (err) {
    console.error("ai-evaluate error:", err);
    return json({ success: false, error: "خطأ غير متوقع" });
  }
});
