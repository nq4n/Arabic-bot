import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import "../styles/CollaborativeChat.css";

type Profile = {
  id: string;
  username: string | null;
  email: string | null;
  role: "student" | "teacher" | "admin" | null;
};

type ChatMessage = {
  id: number;
  room_key: string;
  room_type: "group" | "pair";
  sender_id: string;
  sender_name: string | null;
  message: string;
  created_at: string;
};

interface CollaborativeChatProps {
  topicId: string;
  mode: "group" | "pair";
  session: Session;
}

const CHAT_REFRESH_MS = 8000;

const getDisplayName = (profile: Profile | null) =>
  profile?.username || profile?.email || "طالب";

const buildPairRoomKey = (userId: string, partnerId: string, topicId: string) => {
  const sorted = [userId, partnerId].sort();
  return `pair:${topicId}:${sorted.join("-")}`;
};

export default function CollaborativeChat({ topicId, mode, session }: CollaborativeChatProps) {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [partners, setPartners] = useState<Profile[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const roomKey = useMemo(() => {
    if (mode === "group") return `group:${topicId}`;
    if (!selectedPartnerId) return null;
    return buildPairRoomKey(session.user.id, selectedPartnerId, topicId);
  }, [mode, selectedPartnerId, session.user.id, topicId]);

  useEffect(() => {
    const loadProfile = async () => {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, email, role")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        setError("تعذر تحميل بيانات الطالب.");
        return;
      }

      setCurrentProfile(data as Profile);
    };

    loadProfile();
  }, [session.user.id]);

  useEffect(() => {
    if (mode !== "pair") return;
    const loadPartners = async () => {
      const { data, error: partnersError } = await supabase
        .from("profiles")
        .select("id, username, email, role")
        .eq("role", "student")
        .order("username", { ascending: true });

      if (partnersError) {
        setError("تعذر تحميل قائمة الزملاء.");
        return;
      }

      const list = (data as Profile[]).filter(
        (profile) => profile.id !== session.user.id
      );
      setPartners(list);
      setSelectedPartnerId(list[0]?.id ?? null);
    };

    loadPartners();
  }, [mode, session.user.id]);

  const loadMessages = useCallback(async () => {
    if (!roomKey) return;

    const { data, error: messagesError } = await supabase
      .from("collaborative_chat_messages")
      .select(
        "id, room_key, room_type, sender_id, sender_name, message, created_at"
      )
      .eq("room_key", roomKey)
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      setError("تعذر تحميل رسائل الدردشة.");
      return;
    }

    setMessages((data as ChatMessage[]) ?? []);
  }, [roomKey, topicId]);

  useEffect(() => {
    if (!roomKey) return;
    loadMessages();

    const interval = window.setInterval(loadMessages, CHAT_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [loadMessages, roomKey]);

  const handleSend = async () => {
    if (!input.trim() || !roomKey) return;

    const { error: sendError } = await supabase
      .from("collaborative_chat_messages")
      .insert({
        topic_id: topicId,
        room_key: roomKey,
        room_type: mode,
        sender_id: session.user.id,
        sender_name: getDisplayName(currentProfile),
        message: input.trim(),
      });

    if (sendError) {
      setError("تعذر إرسال الرسالة.");
      return;
    }

    setInput("");
    loadMessages();
  };

  return (
    <section className="collaborative-chat" dir="rtl">
      <header className="collaborative-chat-header">
        <div>
          <h3>{mode === "group" ? "دردشة جماعية" : "دردشة ثنائية"}</h3>
          <p>
            {mode === "group"
              ? "ناقش القضية مع زملائك في نفس المجموعة."
              : "اختر زميلًا للتدرب على كتابة النص الحواري."}
          </p>
        </div>
        {mode === "pair" && (
          <div className="partner-picker">
            <label htmlFor="partner-select">الزميل</label>
            <select
              id="partner-select"
              value={selectedPartnerId ?? ""}
              onChange={(event) => setSelectedPartnerId(event.target.value || null)}
            >
              {partners.length === 0 && <option value="">لا يوجد طلاب</option>}
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {getDisplayName(partner)}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {error && <div className="chat-error-banner">{error}</div>}

      {!roomKey && mode === "pair" ? (
        <div className="chat-empty">اختر زميلًا لبدء الحوار.</div>
      ) : (
        <>
          <div className="chat-thread">
            {messages.length === 0 && (
              <div className="chat-empty">ابدأ المحادثة برسالة جديدة.</div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-bubble ${
                  message.sender_id === session.user.id
                    ? "is-sent"
                    : "is-received"
                }`}
              >
                <span className="chat-sender">
                  {message.sender_id === session.user.id
                    ? "أنت"
                    : message.sender_name || "طالب"}
                </span>
                <p>{message.message}</p>
                <span className="chat-time">
                  {new Date(message.created_at).toLocaleTimeString("ar-SA", {
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
      )}
    </section>
  );
}
