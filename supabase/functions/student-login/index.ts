// supabase/functions/student-login/index.ts
// Passwordless login for students: given a username, return a one-time token
// the browser exchanges for a session. Only works for role === "student".
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// service_role: نحتاج صلاحية admin لتوليد رابط الدخول
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { username } = await req.json();

    const trimmed = String(username ?? "").trim();
    if (!trimmed) {
      return json({ success: false, error: "اسم المستخدم مطلوب" });
    }

    // 1) ابحث عن الطالب عبر اسم المستخدم (طلاب فقط)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, role")
      .ilike("username", trimmed)
      .maybeSingle();

    if (profileError) {
      console.error("profile lookup error:", profileError);
      return json({ success: false, error: "تعذّر العثور على الحساب" });
    }

    // رسالة عامة حتى لا نكشف أي الأسماء موجودة
    if (!profile?.email || profile.role !== "student") {
      return json({ success: false, error: "اسم المستخدم غير صحيح" });
    }

    // 2) ولّد رمز دخول لمرة واحدة (بدون إرسال بريد)
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });

    if (error || !data?.properties?.hashed_token) {
      console.error("generateLink error:", error);
      return json({ success: false, error: "تعذّر إنشاء جلسة الدخول" });
    }

    return json({
      success: true,
      token_hash: data.properties.hashed_token,
    });
  } catch (err) {
    console.error("Unexpected error in student-login function:", err);
    return json({ success: false, error: "خطأ غير متوقع" });
  }
});
