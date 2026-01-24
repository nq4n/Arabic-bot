// IMPORTANT: You need to add `added_by_teacher_id` column to your `profiles` table in Supabase.
// Example SQL: ALTER TABLE profiles ADD COLUMN added_by_teacher_id UUID REFERENCES profiles(id);

// supabase/functions/delete-user/index.ts
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { userIdToDelete, initiatingUserId } = await req.json();

    if (!userIdToDelete || !initiatingUserId) {
      return new Response(
        JSON.stringify({ error: "userIdToDelete and initiatingUserId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get initiating user's role
    const { data: initiatingProfile, error: initiatingProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", initiatingUserId)
      .maybeSingle();

    if (initiatingProfileError || !initiatingProfile) {
      console.error("Error fetching initiating user profile:", initiatingProfileError);
      return new Response(
        JSON.stringify({ error: "Initiating user profile not found or error fetching" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const initiatingUserRole = initiatingProfile.role;

    // Get user to delete's profile
    const { data: userToDeleteProfile, error: userToDeleteProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role, added_by_teacher_id")
      .eq("id", userIdToDelete)
      .maybeSingle();

    if (userToDeleteProfileError || !userToDeleteProfile) {
      console.error("Error fetching user to delete profile:", userToDeleteProfileError);
      return new Response(
        JSON.stringify({ error: "User to delete profile not found or error fetching" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const userToDeleteRole = userToDeleteProfile.role;
    const addedByTeacherId = userToDeleteProfile.added_by_teacher_id;

    let canDelete = false;

    if (initiatingUserRole === "admin") {
      canDelete = true; // Admin can delete any user
    } else if (initiatingUserRole === "teacher") {
      // Teachers can only delete students they added
      if (userToDeleteRole === "student" && addedByTeacherId === initiatingUserId) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to delete this user." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Proceed with deletion
    // 1. Delete from profiles table
    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userIdToDelete);

    if (deleteProfileError) {
      console.error("Error deleting profile:", deleteProfileError);
      return new Response(
        JSON.stringify({ error: deleteProfileError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Delete from auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
      return new Response(
        JSON.stringify({ error: deleteAuthError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error in delete-user function:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});