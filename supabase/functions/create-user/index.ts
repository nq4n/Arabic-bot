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
    const { email, password, role, addedBy, full_name, grade } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ success: false, error: "email, role مطلوبة" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // الطلاب يدخلون باسم المستخدم فقط (بدون كلمة مرور)، لذلك نولّد لهم
    // كلمة مرور عشوائية قوية لا تُعرض لأحد ولا تُستخدم في الدخول.
    // المعلمون والمسؤولون ما زالوا بحاجة إلى كلمة مرور.
    const isStudent = role === "student";

    if (!password && !isStudent) {
      return new Response(
        JSON.stringify({ success: false, error: "كلمة المرور مطلوبة للمعلمين والمسؤولين" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const randomPassword = () => {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    };

    const authPassword = password || randomPassword();

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
      password: authPassword,
      email_confirm: true, // لو حاب تفرض تأكيد إيميل خله false
      // No user_metadata here? Wait, previous code had it.
      // Checking previous code...
      // Line 83: user_metadata: { username: generatedUsername, role },
      user_metadata: {
        username: generatedUsername,
        role,
        full_name,
        grade, // Add grade here
      },
    });

    if (error || !data?.user) {
      return new Response(
        JSON.stringify({ success: false, error: error?.message ?? "فشل إنشاء المستخدم" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
      full_name?: string | null;
      grade?: string | null; // Add grade here
    } = {
      id: user.id,
      email,
      username: generatedUsername,
      role,
      // الطالب لا يملك كلمة مرور يغيّرها، فلا نطلب منه تغييرها.
      must_change_password: !isStudent,
      full_name,
      grade, // Pass grade here
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
        JSON.stringify({ success: false, error: profileError.message ?? "Profile upsert error" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, userId: user.id, username: generatedUsername }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("Unexpected error in create-user function:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected error" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
