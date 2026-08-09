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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");

    if (!jwt) {
      return jsonResponse({ success: false, error: "Missing authorization token" }, 401);
    }

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (callerError || !caller) {
      return jsonResponse({ success: false, error: "Invalid authorization token" }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .maybeSingle();

    if (callerProfileError || callerProfile?.role !== "admin") {
      return jsonResponse({ success: false, error: "Admin permission is required" }, 403);
    }

    const { userId, temporaryPassword, action } = await req.json();

    if (!userId || typeof userId !== "string") {
      return jsonResponse({ success: false, error: "userId is required" }, 400);
    }

    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (targetProfileError || !targetProfile) {
      return jsonResponse({ success: false, error: "User profile was not found" }, 404);
    }

    if (action === "disable") {
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", userId);

      if (profileUpdateError) {
        return jsonResponse({ success: false, error: profileUpdateError.message }, 400);
      }

      return jsonResponse({ success: true });
    }

    if (typeof temporaryPassword !== "string" || temporaryPassword.length < 8) {
      return jsonResponse(
        { success: false, error: "temporaryPassword must be at least 8 characters" },
        400
      );
    }

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: temporaryPassword }
    );

    if (authUpdateError) {
      return jsonResponse({ success: false, error: authUpdateError.message }, 400);
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", userId);

    if (profileUpdateError) {
      return jsonResponse({ success: false, error: profileUpdateError.message }, 400);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("Unexpected error in reset-user-password function:", message);
    return jsonResponse({ success: false, error: "Unexpected error" }, 500);
  }
});
