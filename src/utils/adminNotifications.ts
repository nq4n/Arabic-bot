import { supabase } from "../supabaseClient";

type AdminNotificationInput = {
  recipientId: string;
  actorId: string;
  actorRole: string;
  message: string;
  category?: string;
};

export const logAdminNotification = async ({
  recipientId,
  actorId,
  actorRole,
  message,
  category,
}: AdminNotificationInput) => {
  if (!recipientId || !actorId || !message) return;

  const { error } = await supabase.from("admin_notifications").insert({
    recipient_id: recipientId,
    actor_id: actorId,
    actor_role: actorRole,
    message,
    category: category ?? null,
  });

  if (error) {
    console.error("Failed to log admin notification:", error);
  }
};
