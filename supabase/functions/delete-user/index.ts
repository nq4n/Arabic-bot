// supabase/functions/delete-user/index.ts
// Deletes a user: related rows (FK cascade handles most), the profiles row,
// and the Supabase Auth user. Must run as an admin.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(500, {
      error:
        "Missing env vars. Need SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  // Client bound to caller JWT (for checking who is calling)
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service client (bypass RLS + delete auth user)
  const serviceClient = createClient(supabaseUrl, serviceKey);

  // 1) Ensure caller is authenticated
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: "Unauthorized: missing/invalid JWT" });
  }

  const callerId = userData.user.id;

  // 2) Parse request body (target user id)
  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const targetUserId = body.user_id?.trim();
  if (!targetUserId || !isUuid(targetUserId)) {
    return json(400, { error: "user_id is required and must be a UUID" });
  }

  // 3) Authorization: only admins can delete users
  const { data: callerProfile, error: profileErr } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .maybeSingle();

  if (profileErr) {
    return json(403, { error: "Cannot read caller profile", details: profileErr.message });
  }

  if (callerProfile?.role !== "admin") {
    return json(403, { error: "Forbidden: admin only" });
  }

  // 4) Delete related DB rows first.
  // Most FK constraints reference profiles with ON DELETE CASCADE / SET NULL,
  // but two do NOT:
  //   - submissions.student_id  (NO ACTION)  -> delete explicitly
  //   - profiles.added_by_teacher_id (NO ACTION self-ref) -> clear it first
  const results: Record<string, unknown> = {};

  const delActivity = await serviceClient
    .from("activity_submissions")
    .delete()
    .eq("student_id", targetUserId)
    .select("id");

  if (delActivity.error) {
    return json(500, { error: "Failed deleting activity_submissions", details: delActivity.error.message });
  }
  results.activity_submissions_deleted = delActivity.data?.length ?? 0;

  const delSubmissions = await serviceClient
    .from("submissions")
    .delete()
    .eq("student_id", targetUserId)
    .select("id");

  if (delSubmissions.error) {
    return json(500, { error: "Failed deleting submissions", details: delSubmissions.error.message });
  }
  results.submissions_deleted = delSubmissions.data?.length ?? 0;

  // Clear self-referencing added_by_teacher_id so deleting a teacher who
  // created accounts does not violate profiles_added_by_teacher_id_fkey.
  const clearAddedBy = await serviceClient
    .from("profiles")
    .update({ added_by_teacher_id: null })
    .eq("added_by_teacher_id", targetUserId)
    .select("id");

  if (clearAddedBy.error) {
    return json(500, { error: "Failed clearing added_by_teacher_id", details: clearAddedBy.error.message });
  }
  results.added_by_teacher_cleared = clearAddedBy.data?.length ?? 0;

  const delProfile = await serviceClient
    .from("profiles")
    .delete()
    .eq("id", targetUserId)
    .select("id");

  if (delProfile.error) {
    return json(500, { error: "Failed deleting profiles row", details: delProfile.error.message });
  }
  results.profiles_deleted = delProfile.data?.length ?? 0;

  // 5) Delete user from Supabase Auth
  const { error: authDeleteErr } = await serviceClient.auth.admin.deleteUser(
    targetUserId,
  );

  if (authDeleteErr) {
    return json(500, {
      error: "Failed deleting auth user",
      details: authDeleteErr.message,
      results,
    });
  }

  return json(200, {
    ok: true,
    deleted_user_id: targetUserId,
    results,
  });
});
