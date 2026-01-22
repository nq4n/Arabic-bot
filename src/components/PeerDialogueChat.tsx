import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { logAdminNotification } from "../utils/adminNotifications";
import { emitAchievementToast } from "../utils/achievementToast";
import { trackCollaborativeCompletion } from "../utils/studentTracking";
import "../styles/CollaborativeChat.css";

type DialogueMessage = {
  role: string;
  userId: string;
  text: string;
  timestamp: string;
};

type DialogueSession = {
  id: number;
  topic_id: string;
  scenario_text: string;
  conversation_log: DialogueMessage[] | null;
};

interface PeerDialogueChatProps {
  topicId: string;
  sessionId: number;
  session: Session;
  role: string;
  scenarioText: string | null;
}

const CHAT_REFRESH_MS = 8000;

export default function PeerDialogueChat({
  topicId,
  sessionId,
  session,
  role,
  scenarioText,
}: PeerDialogueChatProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DialogueMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [scenario, setScenario] = useState(scenarioText ?? "");

  const loadMessages = useCallback(async () => {
    const { data, error: messagesError } = await supabase
      .from("dialogue_peer_sessions")
      .select("id, topic_id, scenario_text, conversation_log")
      .eq("id", sessionId)
      .eq("topic_id", topicId)
      .maybeSingle();

    if (messagesError) {
      setError("تعذر تحميل الحوار.");
      return;
    }

    const sessionData = (data as DialogueSession | null) ?? null;
    setScenario(sessionData?.scenario_text ?? scenarioText ?? "");
    setMessages((sessionData?.conversation_log ?? []) as DialogueMessage[]);
  }, [scenarioText, sessionId, topicId]);

  useEffect(() => {
    loadMessages();

    const interval = window.setInterval(loadMessages, CHAT_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [loadMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: DialogueMessage = {
      role,
      userId: session.user.id,
      text: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const { error: sendError } = await supabase.rpc(
      "append_dialogue_peer_message",
      {
        _session_id: sessionId,
        _message: newMessage,
      }
    );

    if (sendError) {
      setError("تعذر إرسال الرسالة.");
      return;
    }

    setInput("");
    loadMessages();
  };

  const handleFinishDialogue = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    setError(null);

    const { data: existing, error: existingError } = await supabase
      .from("collaborative_activity_completions")
      .select("id")
      .eq("student_id", session.user.id)
      .eq("topic_id", topicId)
      .eq("activity_kind", "dialogue")
      .maybeSingle();

    if (existingError) {
      setError("تعذر إنهاء الحوار.");
      setIsFinishing(false);
      return;
    }

    if (!existing) {
      const { error: finishError } = await supabase
        .from("collaborative_activity_completions")
        .upsert(
          {
            student_id: session.user.id,
            topic_id: topicId,
            activity_kind: "dialogue",
          },
          { onConflict: "student_id,topic_id,activity_kind" }
        );

      if (finishError) {
        setError("تعذر إنهاء الحوار.");
        setIsFinishing(false);
        return;
      }

      await logAdminNotification({
        recipientId: session.user.id,
        actorId: session.user.id,
        actorRole: "student",
        message: "تم منحك 5 نقاط لإكمال الحوار.",
        category: "points",
      });
      await trackCollaborativeCompletion(session.user.id, topicId, "dialogue");
      emitAchievementToast({
        title: "تم احتساب النقاط",
        message: "رائع! حصلت على 5 نقاط لإكمال الحوار.",
        points: 5,
        tone: "success",
      });
    }

    navigate(`/topic/${topicId}`);
  };

  return (
    <section className="collaborative-chat" dir="rtl">
      <header className="collaborative-chat-header">
        <div>
          <h3>حوار زميل</h3>
          <p>{scenario || "سيظهر سيناريو الحوار هنا."}</p>
          <p>دورك هو: {role}</p>
        </div>
        <button
          type="button"
          className="button button-compact"
          onClick={handleFinishDialogue}
          disabled={isFinishing}
        >
          {isFinishing ? "جاري الإنهاء..." : "إنهاء الحوار"}
        </button>
      </header>

      {error && <div className="chat-error-banner">{error}</div>}

      <>
        <div className="chat-thread">
          {messages.length === 0 && (
            <div className="chat-empty">لا توجد رسائل بعد.</div>
          )}
          {messages.map((message, index) => (
            <div
              key={`${message.userId}-${message.timestamp}-${index}`}
              className={`chat-bubble ${
                message.userId === session.user.id ? "is-sent" : "is-received"
              }`}
            >
              <span className="chat-sender">
                {message.userId === session.user.id ? "أنت" : message.role}
              </span>
              <p>{message.text}</p>
              <span className="chat-time">
                {new Date(message.timestamp).toLocaleTimeString("ar-SA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>

        <div className="chat-input-area">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="اكتب رسالتك هنا..."
          />
          <button type="button" onClick={handleSend} disabled={!input.trim()}>
            إرسال
          </button>
        </div>
      </>
    </section>
  );
}
