import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import type { Session } from "@supabase/supabase-js";
import "../styles/ChatCenter.css";
import { logAdminNotification } from "../utils/adminNotifications";

const CHAT_REFRESH_MS = 8000;
const ADMIN_THREAD_ID = "admin-log";

type UserRole = "student" | "teacher" | "admin" | null;

type Profile = {
  id: string;
  username: string | null;
  email: string | null;
  role: UserRole;
  added_by_teacher_id?: string | null;
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

type AdminNotification = {
  id: number;
  recipient_id: string;
  actor_id: string | null;
  actor_role: string | null;
  message: string;
  category: string | null;
  created_at: string;
};

type SidebarItem = {
  id: string;
  label: string;
  roleLabel: string;
  avatarLetter: string;
  isAdminThread?: boolean;
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
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [input, setInput] = useState("");
  const [chatEnabled, setChatEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdminThread = selectedPeerId === ADMIN_THREAD_ID;

  const teacherId = useMemo(() => {
    if (!session || isAdminThread) return null;
    return currentRole === "student" ? selectedPeerId : session.user.id;
  }, [currentRole, isAdminThread, selectedPeerId, session]);

  const studentId = useMemo(() => {
    if (!session || !selectedPeerId || isAdminThread) return null;
    return currentRole === "student" ? session.user.id : selectedPeerId;
  }, [currentRole, isAdminThread, selectedPeerId, session]);

  const sidebarItems: SidebarItem[] = useMemo(() => {
    const base: SidebarItem[] = [
      {
        id: ADMIN_THREAD_ID,
        label: "إشعارات الإدارة",
        roleLabel: "سجل الأنشطة",
        avatarLetter: "إ",
        isAdminThread: true,
      },
    ];

    const peersList = peers.map((peer) => ({
      id: peer.id,
      label: getDisplayName(peer),
      roleLabel:
        peer.role === "admin" ? "مسؤول" : peer.role === "teacher" ? "معلم" : "طالب",
      avatarLetter: getDisplayName(peer).charAt(0),
    }));

    return base.concat(peersList);
  }, [peers]);

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
        .select("id, username, email, role, added_by_teacher_id")
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
      const assignedTeacherId = currentProfile?.added_by_teacher_id ?? null;
      const { data, error: peersError } = await supabase
        .from("profiles")
        .select("id, username, email, role")
        .in("role", ["teacher", "admin"])
        .order("username", { ascending: true });

      if (peersError) {
        setError("تعذر تحميل قائمة المعلمين.");
      } else {
        let list = (data as Profile[]) ?? [];
        if (assignedTeacherId) {
          list = list.filter(
            (peer) => peer.role === "admin" || peer.id === assignedTeacherId
          );
        }
        setPeers(list);
        setSelectedPeerId((prev) => prev ?? list[0]?.id ?? ADMIN_THREAD_ID);
      }
      setLoading(false);
      return;
    }

    let studentsQuery = supabase
      .from("profiles")
      .select("id, username, email, role")
      .eq("role", "student")
      .order("username", { ascending: true });

    if (currentRole === "teacher" && session?.user.id) {
      studentsQuery = studentsQuery.eq("added_by_teacher_id", session.user.id);
    }

    const { data, error: studentsError } = await studentsQuery;

    if (studentsError) {
      setError("تعذر تحميل قائمة الطلاب.");
    } else {
      const list = (data as Profile[]) ?? [];
      setPeers(list);
      setSelectedPeerId((prev) => prev ?? list[0]?.id ?? ADMIN_THREAD_ID);
    }
    setLoading(false);
  }, [currentProfile?.added_by_teacher_id, currentRole, session?.user.id]);

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

  const loadAdminNotifications = useCallback(async () => {
    if (!session) return;

    const { data, error: adminError } = await supabase
      .from("admin_notifications")
      .select("id, recipient_id, actor_id, actor_role, message, category, created_at")
      .eq("recipient_id", session.user.id)
      .order("created_at", { ascending: true });

    if (adminError) {
      setError("تعذر تحميل إشعارات الإدارة.");
      return;
    }

    setAdminNotifications((data as AdminNotification[]) ?? []);
  }, [session]);

  useEffect(() => {
    if (isAdminThread) {
      loadAdminNotifications();
      const interval = window.setInterval(loadAdminNotifications, CHAT_REFRESH_MS);
      return () => window.clearInterval(interval);
    }

    if (!teacherId || !studentId) return;
    loadChatSetting();
    loadMessages();

    const interval = window.setInterval(loadMessages, CHAT_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [
    isAdminThread,
    loadAdminNotifications,
    loadChatSetting,
    loadMessages,
    studentId,
    teacherId,
  ]);

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

    if (currentRole !== "student" && selectedPeer && studentId) {
      const senderName = getDisplayName(currentProfile);
      const recipientName = getDisplayName(selectedPeer);
      await logAdminNotification({
        recipientId: studentId,
        actorId: session.user.id,
        actorRole: currentRole ?? "teacher",
        message: `تلقيت ردًا من ${senderName}.`,
        category: "teacher_reply",
      });
      await logAdminNotification({
        recipientId: session.user.id,
        actorId: session.user.id,
        actorRole: currentRole ?? "teacher",
        message: `أرسلت ردًا إلى ${recipientName}.`,
        category: "teacher_reply",
      });
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
  const isThreadEmpty = isAdminThread
    ? adminNotifications.length === 0
    : messages.length === 0;
  const activeMessages = isAdminThread ? adminNotifications : messages;
  const isChatMessage = (
    message: ChatMessage | AdminNotification
  ): message is ChatMessage => "sender_id" in message;

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
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`chat-sidebar-item ${
                  selectedPeerId === item.id ? "is-active" : ""
                }`}
                onClick={() => setSelectedPeerId(item.id)}
              >
                <div className="chat-peer-avatar">
                  {item.avatarLetter}
                </div>
                <div className="chat-peer-info">
                  <span className="chat-peer-name">{item.label}</span>
                  <span className="chat-peer-meta">{item.roleLabel}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="chat-main">
          <div className="chat-center-controls">
            <div className="chat-peer-title">
              {isAdminThread ? (
                <>
                  <div className="chat-peer-avatar">إ</div>
                  <div>
                    <div>إشعارات الإدارة</div>
                    <div className="chat-peer-meta">توثيق الأنشطة</div>
                  </div>
                </>
              ) : selectedPeer ? (
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

          {currentRole === "student" && !chatEnabled && !isAdminThread && (
            <div className="chat-disabled-note">
              قام المعلم بتعطيل الدردشة أثناء الحصة.
            </div>
          )}

          {error && <div className="chat-error-banner">{error}</div>}

          <div className="chat-thread">
            {isThreadEmpty && (
              <div className="chat-empty">
                {isAdminThread ? "لا توجد إشعارات حتى الآن." : "ابدأ المحادثة بإرسال رسالة."}
              </div>
            )}
            {activeMessages.map((message) =>
              !isChatMessage(message) ? (
                <div key={message.id} className="chat-bubble is-admin">
                  <span className="chat-sender">إشعار النظام</span>
                  <p>{message.message}</p>
                  <span className="chat-time">
                    {new Date(message.created_at).toLocaleTimeString("ar-SA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ) : (
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
              )
            )}
          </div>

          {!isAdminThread ? (
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
          ) : (
            <div className="chat-admin-note">
              هذه القناة مخصصة للتوثيق والتنبيهات ولا يمكن الرد فيها.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
