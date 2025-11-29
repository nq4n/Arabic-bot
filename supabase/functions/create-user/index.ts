// supabase/functions/create-user/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ⚠️ نستخدم service_role هنا، مو anon key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { email, password, username, role } = await req.json();

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: "email, password, role مطلوبة" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1) إنشاء المستخدم في Auth باستخدام admin
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // لو حاب تفرض تأكيد إيميل خله false
      user_metadata: {
        username,
        role,
      },
    });

    if (error || !data?.user) {
      return new Response(
        JSON.stringify({ error: error?.message ?? "فشل إنشاء المستخدم" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const user = data.user;

    // 2) إضافة صف في جدول profiles (لو عندك الجدول)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        email,
        username,
        role,
        must_change_password: true, // أو false حسب نظامك
      });

    if (profileError) {
      console.error("Profile insert error:", profileError);
      // نرجع نجاح رغم خطأ profile، أو تقدر تخليه error حسب رغبتك
    }

    return new Response(
      JSON.stringify({ success: true, userId: user.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error in create-user function:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});