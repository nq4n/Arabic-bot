import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { logAdminNotification } from "../utils/adminNotifications";
import { emitAchievementToast } from "../utils/achievementToast";
import { trackCollaborativeCompletion } from "../utils/studentTracking";
import "../styles/CollaborativeChat.css";

type Profile = {
  id: string;
  username: string | null;
  email: string | null;
  role: "student" | "teacher" | "admin" | null;
};

type ConversationMessage = {
  role: "student" | "teacher" | "admin" | "unknown";
  userId: string;
  text: string;
  timestamp: string;
};

type CollaborativeChatSession = {
  id: number;
  topic_id: string;
  case_title: string;
  conversation_log: ConversationMessage[] | null;
};

interface CollaborativeChatProps {
  topicId: string;
  chatId: number;
  session: Session;
}

const CHAT_REFRESH_MS = 8000;

const getDisplayName = (profile: Profile | null) =>
  profile?.username || profile?.email || "المشارك";

const getRoleLabel = (role: ConversationMessage["role"]) => {
  if (role === "teacher") return "المعلم";
  if (role === "admin") return "المشرف";
  return "الطالب";
};

export default function CollaborativeChat({
  topicId,
  chatId,
  session,
}: CollaborativeChatProps) {
  const navigate = useNavigate();
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [chatSession, setChatSession] = useState<CollaborativeChatSession | null>(
    null
  );
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, email, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        setError("تعذر تحميل الملف الشخصي.");
        return;
      }

      setCurrentProfile(data as Profile);
    };

    loadProfile();
  }, [session.user.id]);

  const loadMessages = useCallback(async () => {
    const { data, error: messagesError } = await supabase
      .from("collaborative_chat")
      .select("id, topic_id, case_title, conversation_log")
      .eq("id", chatId)
      .eq("topic_id", topicId)
      .maybeSingle();

    if (messagesError) {
      setError("تعذر تحميل المحادثة.");
      return;
    }

    const sessionData = (data as CollaborativeChatSession | null) ?? null;
    setChatSession(sessionData);
    setMessages((sessionData?.conversation_log ?? []) as ConversationMessage[]);
  }, [chatId, topicId]);

  useEffect(() => {
    loadMessages();

    const interval = window.setInterval(loadMessages, CHAT_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [loadMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: ConversationMessage = {
      role: currentProfile?.role ?? "unknown",
      userId: session.user.id,
      text: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const { error: sendError } = await supabase.rpc(
      "append_collaborative_chat_message",
      {
        _chat_id: chatId,
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

  const handleFinishDiscussion = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    setError(null);

    const { data: existing, error: existingError } = await supabase
      .from("collaborative_activity_completions")
      .select("id")
      .eq("student_id", session.user.id)
      .eq("topic_id", topicId)
      .eq("activity_kind", "discussion")
      .maybeSingle();

    if (existingError) {
      setError("تعذر إنهاء المناقشة.");
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
            activity_kind: "discussion",
          },
          { onConflict: "student_id,topic_id,activity_kind" }
        );

      if (finishError) {
        setError("تعذر إنهاء المناقشة.");
        setIsFinishing(false);
        return;
      }

      await logAdminNotification({
        recipientId: session.user.id,
        actorId: session.user.id,
        actorRole: "student",
        message: "تم منحك 10 نقاط لإكمال نشاط المناقشة الجماعية.",
        category: "points",
      });
      await trackCollaborativeCompletion(session.user.id, topicId, "discussion");
      emitAchievementToast({
        title: "تم احتساب النقاط",
        message: "رائع! حصلت على 10 نقاط لإكمال المناقشة الجماعية.",
        points: 10,
        tone: "success",
      });
    }

    navigate(`/topic/${topicId}`);
  };

  return (
    <section className="collaborative-chat" dir="rtl">
      <header className="collaborative-chat-header">
        <div>
          <h3>مناقشة القضية</h3>
          <p>
            {chatSession?.case_title
              ? `القضية المختارة: ${chatSession.case_title}`
              : "ابدأ الحوار مع زملائك بعد اختيار القضية."}
          </p>
        </div>
        <button
          type="button"
          className="button button-compact"
          onClick={handleFinishDiscussion}
          disabled={isFinishing}
        >
          {isFinishing ? "جاري الإنهاء..." : "إنهاء النقاش"}
        </button>
      </header>

      {error && <div className="chat-error-banner">{error}</div>}

      <>
        <div className="chat-thread">
          {messages.length === 0 && (
            <div className="chat-empty">لا توجد رسائل بعد، ابدأ النقاش.</div>
          )}
          {messages.map((message, index) => (
            <div
              key={`${message.userId}-${message.timestamp}-${index}`}
              className={`chat-bubble ${
                message.userId === session.user.id ? "is-sent" : "is-received"
              }`}
            >
              <span className="chat-sender">
                {message.userId === session.user.id
                  ? "أنا"
                  : `${getRoleLabel(message.role)} ${message.userId.slice(0, 6)}`}
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
            placeholder={`اكتب رسالتك إلى ${getDisplayName(currentProfile)}...`}
          />
          <button type="button" onClick={handleSend} disabled={!input.trim()}>
            إرسال
          </button>
        </div>
      </>
    </section>
  );
}
