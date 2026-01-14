import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import type { Session } from "@supabase/supabase-js";
import "../styles/ChatCenter.css";

const CHAT_REFRESH_MS = 8000;

type UserRole = "student" | "teacher" | "admin" | null;

type Profile = {
  id: string;
  username: string | null;
  email: string | null;
  role: UserRole;
};

type ChatMessage = {
  id: number;
  teacher_id: string;
  student_id: string;
  sender_id: string;
  sender_name: string | null;
  message: string;
  created_at: string;
};

type ChatSetting = {
  teacher_id: string;
  is_enabled: boolean;
};

const getDisplayName = (profile: Profile | null) =>
  profile?.username || profile?.email || "مستخدم";

export default function ChatCenter() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [peers, setPeers] = useState<Profile[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatEnabled, setChatEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teacherId = useMemo(() => {
    if (!session) return null;
    return currentRole === "student" ? selectedPeerId : session.user.id;
  }, [currentRole, selectedPeerId, session]);

  const studentId = useMemo(() => {
    if (!session || !selectedPeerId) return null;
    return currentRole === "student" ? session.user.id : selectedPeerId;
  }, [currentRole, selectedPeerId, session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!session) return;
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, email, role")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        setError("تعذر تحميل بيانات المستخدم.");
        return;
      }

      setCurrentProfile(data as Profile);
      setCurrentRole((data as Profile).role);
    };

    loadProfile();
  }, [session]);

  const loadPeers = useCallback(async () => {
    if (!currentRole) return;
    setLoading(true);
    setError(null);

    if (currentRole === "student") {
      const { data, error: peersError } = await supabase
        .from("profiles")
        .select("id, username, email, role")
        .in("role", ["teacher", "admin"])
        .order("username", { ascending: true });

      if (peersError) {
        setError("تعذر تحميل قائمة المعلمين.");
      } else {
        setPeers((data as Profile[]) ?? []);
        setSelectedPeerId((data as Profile[])?.[0]?.id ?? null);
      }
      setLoading(false);
      return;
    }

    const { data, error: studentsError } = await supabase
      .from("profiles")
      .select("id, username, email, role")
      .eq("role", "student")
      .order("username", { ascending: true });

    if (studentsError) {
      setError("تعذر تحميل قائمة الطلاب.");
    } else {
      setPeers((data as Profile[]) ?? []);
      setSelectedPeerId((data as Profile[])?.[0]?.id ?? null);
    }
    setLoading(false);
  }, [currentRole]);

  useEffect(() => {
    loadPeers();
  }, [loadPeers]);

  const loadChatSetting = useCallback(async () => {
    if (!teacherId) return;

    const { data, error: settingsError } = await supabase
      .from("teacher_chat_global_settings")
      .select("teacher_id, is_enabled")
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (settingsError) {
      setError("تعذر تحميل حالة الدردشة.");
      return;
    }

    const settings = (data as ChatSetting | null) ?? null;
    setChatEnabled(settings ? settings.is_enabled : true);
  }, [teacherId]);

  const loadMessages = useCallback(async () => {
    if (!teacherId || !studentId) return;

    const { data, error: messagesError } = await supabase
      .from("teacher_chat_messages")
      .select(
        "id, teacher_id, student_id, sender_id, sender_name, message, created_at"
      )
      .eq("teacher_id", teacherId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      setError("تعذر تحميل الرسائل.");
      return;
    }

    setMessages((data as ChatMessage[]) ?? []);
  }, [studentId, teacherId]);

  useEffect(() => {
    if (!teacherId || !studentId) return;
    loadChatSetting();
    loadMessages();

    const interval = window.setInterval(loadMessages, CHAT_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [loadChatSetting, loadMessages, studentId, teacherId]);

  const handleSend = async () => {
    if (!input.trim() || !teacherId || !studentId || !session) return;
    if (!chatEnabled) return;

    const { error: sendError } = await supabase
      .from("teacher_chat_messages")
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
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

  const handleToggleChat = async () => {
    if (!teacherId || currentRole === "student") return;
    const nextValue = !chatEnabled;
    setChatEnabled(nextValue);

    const { error: updateError } = await supabase
      .from("teacher_chat_global_settings")
      .upsert(
        {
          teacher_id: teacherId,
          is_enabled: nextValue,
        },
        { onConflict: "teacher_id" }
      );

    if (updateError) {
      setError("تعذر تحديث إعدادات الدردشة.");
      setChatEnabled(!nextValue);
    }
  };

  const selectedPeer = peers.find((peer) => peer.id === selectedPeerId) || null;

  return (
    <div className="chat-center-page" dir="rtl">
      <section className="chat-center-layout">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3>{currentRole === "student" ? "المعلمون" : "الطلاب"}</h3>
          </div>
          <div className="chat-sidebar-list">
            {loading && <div className="chat-empty">جاري التحميل...</div>}
            {!loading && peers.length === 0 && (
              <div className="chat-empty">لا يوجد مستخدمون</div>
            )}
            {peers.map((peer) => (
              <button
                key={peer.id}
                type="button"
                className={`chat-sidebar-item ${
                  selectedPeerId === peer.id ? "is-active" : ""
                }`}
                onClick={() => setSelectedPeerId(peer.id)}
              >
                <div className="chat-peer-avatar">
                  {getDisplayName(peer).charAt(0)}
                </div>
                <div className="chat-peer-info">
                  <span className="chat-peer-name">{getDisplayName(peer)}</span>
                  <span className="chat-peer-meta">
                    {peer.role === "admin"
                      ? "مسؤول"
                      : peer.role === "teacher"
                        ? "معلم"
                        : "طالب"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="chat-main">
          <div className="chat-center-controls">
            <div className="chat-peer-title">
              {selectedPeer ? (
                <>
                  <div className="chat-peer-avatar">
                    {getDisplayName(selectedPeer).charAt(0)}
                  </div>
                  <div>
                    <div>{getDisplayName(selectedPeer)}</div>
                    <div className="chat-peer-meta">
                      {selectedPeer.role === "admin"
                        ? "مسؤول"
                        : selectedPeer.role === "teacher"
                          ? "معلم"
                          : "طالب"}
                    </div>
                  </div>
                </>
              ) : (
                "اختر محادثة"
              )}
            </div>
            {currentRole !== "student" && (
              <div className="chat-global-toggle">
                <div>
                  <div>الدردشة للطلاب</div>
                  <div className="chat-toggle-status">
                    {chatEnabled ? "مفعلة" : "متوقفة"}
                  </div>
                </div>
                <button
                  type="button"
                  className={`chat-switch ${chatEnabled ? "is-on" : "is-off"}`}
                  onClick={handleToggleChat}
                  aria-pressed={!chatEnabled}
                >
                  <span className="chat-switch-knob" />
                </button>
              </div>
            )}
          </div>

          {currentRole === "student" && !chatEnabled && (
            <div className="chat-disabled-note">
              قام المعلم بتعطيل الدردشة أثناء الحصة.
            </div>
          )}

          {error && <div className="chat-error-banner">{error}</div>}

          <div className="chat-thread">
            {messages.length === 0 && (
              <div className="chat-empty">ابدأ المحادثة بإرسال رسالة.</div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-bubble ${
                  message.sender_id === session?.user.id ? "is-sent" : "is-received"
                }`}
              >
                <span className="chat-sender">
                  {message.sender_id === session?.user.id
                    ? "أنت"
                    : message.sender_name ||
                      getDisplayName(selectedPeer) ||
                      "المعلم"}
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
              placeholder={
                chatEnabled
                  ? `اكتب رسالة إلى ${getDisplayName(selectedPeer)}...`
                  : "الدردشة معطلة حاليًا"
              }
              disabled={!chatEnabled || !selectedPeerId}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!chatEnabled || !input.trim() || !selectedPeerId}
            >
              إرسال
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
