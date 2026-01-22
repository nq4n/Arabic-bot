export type AchievementToastPayload = {
  title?: string;
  message: string;
  points?: number;
  tone?: "success" | "info";
};

export const ACHIEVEMENT_TOAST_EVENT = "achievement-toast";

export const emitAchievementToast = (payload: AchievementToastPayload) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AchievementToastPayload>(ACHIEVEMENT_TOAST_EVENT, {
      detail: payload,
    })
  );
};
