// supabase/functions/ai-chat/index.ts
// Server-side proxy for the student chat assistant.
// Holds the OpenRouter key as a secret (never shipped to the browser) and only
// answers logged-in users, so the paid key can't be extracted or abused at scale.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openRouterKey = Deno.env.get("OPENROUTER_API_KEY")!;

const PRIMARY_MODEL = Deno.env.get("AI_MODEL") || "google/gemini-2.5-flash";
const FALLBACK_MODEL = Deno.env.get("AI_FALLBACK_MODEL") || "google/gemini-2.0-flash-001";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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

// Call OpenRouter, retrying 429s with exponential backoff, then fall back to a
// cheaper model if the primary keeps failing.
async function callOpenRouter(messages: unknown, temperature?: number) {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError = "";

  for (const model of models) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://arabic-bot-7h16.onrender.com",
          "X-Title": "Midad",
        },
        body: JSON.stringify({ model, messages, ...(temperature != null ? { temperature } : {}) }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) return { content };
        lastError = "empty response";
        break; // try next model
      }

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(2 ** attempt * 1500, 15000);
        await new Promise((r) => setTimeout(r, delay));
        lastError = "rate limited";
        continue; // retry same model
      }

      // Non-retryable (e.g. invalid model id, auth, no credits): capture the
      // upstream body so the real reason shows up in logs.
      const body = await res.text().catch(() => "");
      lastError = `${model}: upstream ${res.status} ${body.slice(0, 300)}`.trim();
      break; // non-retryable: try next model
    }
  }

  return { error: lastError || "failed" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders, status: 200 });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    // Only authenticated users may spend the paid key.
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ success: false, error: "يجب تسجيل الدخول." }, 401);
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ success: false, error: "messages مطلوبة" });
    }

    const result = await callOpenRouter(messages);
    if ("error" in result) {
      console.error("ai-chat upstream failure:", result.error);
      return json({ success: false, error: "تعذّر الاتصال بالمساعد. حاول مرة أخرى.", detail: result.error });
    }

    return json({ success: true, content: result.content });
  } catch (err) {
    console.error("ai-chat error:", err);
    return json({ success: false, error: "خطأ غير متوقع" });
  }
});
