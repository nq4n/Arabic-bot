// supabase/functions/student-login/index.ts
//
// تسجيل دخول الطلاب باسم المستخدم فقط (بدون كلمة مرور).
//
// الفكرة: العميل يرسل اسم المستخدم فقط. هذه الوظيفة تستخدم service_role
// للتحقق من وجود الحساب ومن أن صلاحيته "student"، ثم تنشئ رمز دخول
// لمرة واحدة (magic link token) وتعيد الـ hashed_token للعميل.
// العميل يستدعي supabase.auth.verifyOtp({ token_hash, type: "magiclink" })
// فيحصل على جلسة Supabase حقيقية، فتبقى كل سياسات RLS والصلاحيات كما هي.
//
// المعلمون والمسؤولون لا يمرون من هذا المسار: الوظيفة تعيد
// requiresPassword: true ليُظهر العميل حقل كلمة المرور.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const identifier = String(payload?.identifier ?? payload?.username ?? "")
      .trim();

    if (!identifier) {
      return jsonResponse({
        success: false,
        error: "الرجاء إدخال اسم المستخدم.",
      });
    }

    // البحث عن الحساب باسم المستخدم أو بالبريد الإلكتروني.
    const column = identifier.includes("@") ? "email" : "username";
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role")
      .ilike(column, identifier)
      .maybeSingle();

    if (profileError) {
      console.error("student-login profile lookup error:", profileError);
      return jsonResponse({
        success: false,
        error: "تعذر العثور على الحساب، حاول مرة أخرى.",
      });
    }

    if (!profile?.email) {
      return jsonResponse({
        success: false,
        error: "اسم المستخدم غير صحيح.",
      });
    }

    // المعلم/المسؤول يكمل بكلمة المرور.
    if (profile.role !== "student") {
      return jsonResponse({ success: true, requiresPassword: true });
    }

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: profile.email,
      });

    const tokenHash = linkData?.properties?.hashed_token;

    if (linkError || !tokenHash) {
      console.error("student-login generateLink error:", linkError);
      return jsonResponse({
        success: false,
        error: "تعذر إتمام تسجيل الدخول، حاول مرة أخرى.",
      });
    }

    return jsonResponse({
      success: true,
      requiresPassword: false,
      email: profile.email,
      tokenHash,
    });
  } catch (err) {
    console.error("Unexpected error in student-login function:", err);
    return jsonResponse({ success: false, error: "حدث خطأ غير متوقع." });
  }
});
