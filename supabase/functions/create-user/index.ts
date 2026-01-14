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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { email, password, role, addedBy } = await req.json();

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: "email, password, role مطلوبة" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1) إنشاء المستخدم في Auth باستخدام admin
    const randomDigits = (length: number) => {
      const digits = [];
      const bytes = new Uint8Array(length);
      crypto.getRandomValues(bytes);
      for (let i = 0; i < length; i += 1) {
        digits.push((bytes[i] % 10).toString());
      }
      return digits.join("");
    };

    const usernamePrefix =
      role === "student" ? "s" : role === "teacher" ? "t" : "u";

    let generatedUsername = "";
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = `${usernamePrefix}${randomDigits(6)}`;
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", candidate)
        .maybeSingle();

      if (existingError) {
        console.error("Username lookup error:", existingError);
      }

      if (!existing) {
        generatedUsername = candidate;
        break;
      }
    }

    if (!generatedUsername) {
      generatedUsername = `${usernamePrefix}${randomDigits(10)}`;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // لو حاب تفرض تأكيد إيميل خله false
      user_metadata: {
        username: generatedUsername,
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
    const profileInsertData: {
      id: string;
      email: string;
      username: string;
      role: string;
      must_change_password: boolean;
      added_by_teacher_id?: string | null; // Make it optional
    } = {
      id: user.id,
      email,
      username: generatedUsername,
      role,
      must_change_password: true, // أو false حسب نظامك
    };

    // If the new user is a student and addedBy is provided, record the teacher's ID
    if (role === "student" && addedBy) {
      profileInsertData.added_by_teacher_id = addedBy;
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(profileInsertData, { onConflict: "id" });

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message ?? "Profile upsert error" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, userId: user.id, username: generatedUsername }),
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


