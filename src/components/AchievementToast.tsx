import { useEffect, useRef, useState } from "react";
import "../styles/AchievementToast.css";
import {
  ACHIEVEMENT_TOAST_EVENT,
  AchievementToastPayload,
} from "../utils/achievementToast";

type ToastItem = AchievementToastPayload & {
  id: string;
  tone: "success" | "info";
};

const MAX_TOASTS = 3;
const TOAST_DURATION_MS = 4800;
const SOUND_COOLDOWN_MS = 800;

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;

export default function AchievementToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, number>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSoundAtRef = useRef(0);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timersRef.current[id];
    }
  };

  const playSound = async () => {
    const now = Date.now();
    if (now - lastSoundAtRef.current < SOUND_COOLDOWN_MS) return;
    lastSoundAtRef.current = now;

    const AudioCtx = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }

    const context = audioContextRef.current;
    if (context.state === "suspended") {
      await context.resume();
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.06;

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + 0.5
    );
    oscillator.stop(context.currentTime + 0.55);
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  };

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<AchievementToastPayload>).detail;
      if (!detail || !detail.message) return;

      const nextToast: ToastItem = {
        id: createId(),
        tone: detail.tone ?? "success",
        ...detail,
      };

      setToasts((prev) => [...prev, nextToast].slice(-MAX_TOASTS));
      playSound();

      const timer = window.setTimeout(() => {
        dismissToast(nextToast.id);
      }, TOAST_DURATION_MS);
      timersRef.current[nextToast.id] = timer;
    };

    window.addEventListener(ACHIEVEMENT_TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(ACHIEVEMENT_TOAST_EVENT, handleToast);
      Object.values(timersRef.current).forEach((timer) =>
        window.clearTimeout(timer)
      );
      timersRef.current = {};
    };
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="achievement-toast-stack" dir="rtl" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`achievement-toast ${toast.tone}`}>
          <div className="achievement-toast-icon" aria-hidden="true">
            <i className="fas fa-award"></i>
          </div>
          <div className="achievement-toast-body">
            {toast.title && (
              <div className="achievement-toast-title">{toast.title}</div>
            )}
            <div className="achievement-toast-message">{toast.message}</div>
          </div>
          {typeof toast.points === "number" && (
            <div className="achievement-toast-points">+{toast.points}</div>
          )}
          <button
            type="button"
            className="achievement-toast-close"
            onClick={() => dismissToast(toast.id)}
            aria-label="Close"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
