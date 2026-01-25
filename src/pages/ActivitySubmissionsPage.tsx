import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { User } from "@supabase/supabase-js";
import { calculatePointsFromData } from "../utils/pointCalculation";
import ActivitySubmissionPanel from "./ActivitySubmissionPanel"; // Import the renamed component
import SkeletonPage from "../components/SkeletonPage";


type UserRole = "student" | "teacher" | "admin" | null;

// Define a clear type for user profiles from Supabase
type Profile = {
  id: string;
  username: string | null;
  full_name?: string | null;
  email: string | null;
  role: UserRole;
  must_change_password: boolean;
  added_by_teacher_id?: string | null;
};

type UserWithStats = Profile & {
  submissionsCount: number;
};

type Submission = {
  id: number;
  student_id: string;
  topic_title?: string;
};

type ActivitySubmission = {
  id: number;
  student_id: string;
  topic_id: string;
  activity_id: number;
  response_text: string | null;
  created_at: string;
};

type CollaborativeCompletion = {
  id: number;
  student_id: string;
  topic_id: string;
  activity_kind: string;
  completed_at: string;
};

type StudentTrackingEntry = {
  id: number;
  student_id: string;
  student_name: string;
  tracking_data: Record<string, any>; // Using Record<string, any> for jsonb
  created_at: string;
  updated_at: string;
};

type LeaderboardEntry = {
  rank: number;
  studentId: string;
  name: string;
  totalPoints: number;
  level: string;
};

const getDisplayName = (
  profile: { full_name?: string | null; username?: string | null; email?: string | null } | null | undefined,
  fallback = "—"
) => profile?.full_name || profile?.username || profile?.email || fallback;

export default function ActivitySubmissionsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(null);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [activitySubmissions, setActivitySubmissions] = useState<ActivitySubmission[]>([]);
  const [collaborativeCompletions, setCollaborativeCompletions] = useState<CollaborativeCompletion[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [studentTrackingData, setStudentTrackingData] = useState<StudentTrackingEntry[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFormError(null);

    try {
      // Fetch Rewards using read-only logic
      const { data: rewardsData } = await supabase
        .from("point_rewards")
        .select("title, min_points")
        .order("min_points", { ascending: false });

      let profilesQuery = supabase
        .from("profiles")
        .select("id, username, full_name, email, role, must_change_password, added_by_teacher_id")
        .order("username", { ascending: true });

      if (currentUserRole === "teacher" && currentUser?.id) {
        profilesQuery = profilesQuery
          .eq("role", "student")
          .eq("added_by_teacher_id", currentUser.id);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;

      if (profilesError) throw profilesError;

      const studentIds = ((profiles as Profile[]) || [])
        .filter((p) => p.role === "student")
        .map((p) => p.id);

      let submissions: Submission[] = [];
      if (studentIds.length > 0 || currentUserRole !== "teacher") {
        let submissionsQuery = supabase
          .from("submissions")
          .select("id, student_id, topic_title"); // Ensure topic_id is selected

        if (currentUserRole === "teacher" && studentIds.length > 0) {
          submissionsQuery = submissionsQuery.in("student_id", studentIds);
        }

        const { data, error: submissionsError } = await submissionsQuery;
        if (submissionsError) throw submissionsError;
        submissions = (data || []) as Submission[];
      }

      let activityData: ActivitySubmission[] = [];
      if (studentIds.length > 0 || currentUserRole !== "teacher") {
        let activityQuery = supabase
          .from("activity_submissions")
          .select("id, student_id, topic_id, activity_id, response_text, created_at")
          .order("created_at", { ascending: false });

        if (currentUserRole === "teacher" && studentIds.length > 0) {
          activityQuery = activityQuery.in("student_id", studentIds);
        }

        const { data, error: activityError } = await activityQuery;
        if (activityError) throw activityError;
        activityData = (data || []) as ActivitySubmission[];
      }

      let completionData: CollaborativeCompletion[] = [];
      if (studentIds.length > 0 || currentUserRole !== "teacher") {
        let completionQuery = supabase
          .from("collaborative_activity_completions")
          .select("id, student_id, topic_id, activity_kind, completed_at")
          .order("completed_at", { ascending: false });

        if (currentUserRole === "teacher" && studentIds.length > 0) {
          completionQuery = completionQuery.in("student_id", studentIds);
        }

        const { data, error: completionError } = await completionQuery;
        if (completionError) throw completionError;
        completionData = (data || []) as CollaborativeCompletion[];
      }

      let tempTrackingData: StudentTrackingEntry[] = [];
      if (studentIds.length > 0 || currentUserRole !== "teacher") {
        let trackingQuery = supabase
          .from("student_tracking")
          .select("id, student_id, student_name, tracking_data, created_at, updated_at");

        if (currentUserRole === "teacher" && studentIds.length > 0) {
          trackingQuery = trackingQuery.in("student_id", studentIds);
        }

        const { data, error: trackingError } = await trackingQuery;
        if (trackingError) throw trackingError;
        tempTrackingData = (data || []) as StudentTrackingEntry[];
      }

      const subs = (submissions || []) as Submission[];
      const countsMap: Record<string, number> = {};
      subs.forEach((s) => {
        countsMap[s.student_id] = (countsMap[s.student_id] || 0) + 1;
      });

      const list: UserWithStats[] = (profiles as Profile[] || []).map((p) => ({
        ...p,
        must_change_password: p.must_change_password ?? false,
        submissionsCount: countsMap[p.id] || 0,
      }));

      setUsers(list);
      setActivitySubmissions(activityData);
      setCollaborativeCompletions(completionData);
      setStudentTrackingData(tempTrackingData);

      // Calculate Leaderboard using unified point calculation
      const students = list.filter(u => u.role === 'student');
      const entries: LeaderboardEntry[] = students.map(student => {
        const studentTrack = tempTrackingData.find((t: StudentTrackingEntry) => t.student_id === student.id);
        const tracks = studentTrack?.tracking_data || {};

        // Use unified point calculation
        const studentActivities = activityData.filter(a => a.student_id === student.id);
        const studentCollaborative = completionData.filter(c => c.student_id === student.id);
        const studentSubmissions = subs.filter(s => s.student_id === student.id);

        const points = calculatePointsFromData({
          lessons: tracks.lessons,
          activities: tracks.activities,
          evaluations: tracks.evaluations,
          collaborative: tracks.collaborative,
          activitySubmissions: studentActivities,
          collaborativeCompletions: studentCollaborative,
          submissions: studentSubmissions,
        });

        // Determine Level
        const level = (rewardsData || []).find((r: any) => r.min_points <= points) || { title: "مبتدئ" };

        return {
          rank: 0,
          studentId: student.id,
          name: getDisplayName(student),
          totalPoints: points,
          level: level.title
        };
      });

      entries.sort((a, b) => b.totalPoints - a.totalPoints);
      entries.forEach((e, i) => e.rank = i + 1);
      setLeaderboard(entries);

    } catch (err: any) {
      console.error("Error loading data:", err);
      setFormError(`حدث خطأ أثناء جلب البيانات: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUserRole]);

  useEffect(() => {
    if (!currentUserRole) return;
    loadData();
  }, [currentUserRole, loadData]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
      } else if (data?.user) {
        setCurrentUser(data.user);
        // Fetch profile to get the role
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profileError) {
          console.error("Error fetching user role:", profileError);
        } else if (profileData) {
          setCurrentUserRole(profileData.role);
        }
      }
    };
    fetchUser();
  }, []);

  const handleDeleteCompletion = async (completionId: number) => {
    try {
      const { error } = await supabase
        .from("collaborative_activity_completions")
        .delete()
        .eq("id", completionId);

      if (error) throw error;

      setCollaborativeCompletions((prev) =>
        prev.filter((item) => item.id !== completionId)
      );
    } catch (err: any) {
      setFormError(`تعذر حذف السجل: ${err.message}`);
    }
  };

  const handleViewCollaborativeDetails = async (topicId: string, studentId: string, kind: string) => {
    try {
      if (kind === 'discussion') {
        // Query collaborative_chat joined with participants
        const { data, error } = await supabase
          .from('collaborative_chat')
          .select('conversation_log')
          .eq('topic_id', topicId)
          .contains('conversation_log', [{ userId: studentId }]) // Simple heuristic, better would be join but Supabase JS join is tricky with participants
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          // If the contains filter failed or returned nothing, try finding via the participants table
          const { data: participation } = await supabase
            .from('collaborative_chat_participants')
            .select('chat_id')
            .eq('student_id', studentId)
            .limit(5); // Get recent chats

          if (participation && participation.length > 0) {
            const chatIds = participation.map(p => p.chat_id);
            const { data: chats } = await supabase
              .from('collaborative_chat')
              .select('conversation_log')
              .in('id', chatIds)
              .eq('topic_id', topicId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            return chats?.conversation_log || null;
          }
          return null;
        }
        return data?.conversation_log || null;
      } else if (kind === 'dialogue') {
        // Query dialogue_peer_sessions joined with participants
        const { data: participation } = await supabase
          .from('dialogue_peer_participants')
          .select('session_id')
          .eq('user_id', studentId)
          .limit(5);

        if (participation && participation.length > 0) {
          const sessionIds = participation.map(p => p.session_id);
          const { data: sessions } = await supabase
            .from('dialogue_peer_sessions')
            .select('conversation_log')
            .in('id', sessionIds)
            .eq('topic_id', topicId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          return sessions?.conversation_log || null;
        }
        return null;
      }
      return null;
    } catch (err) {
      console.error("Error fetching collab details:", err);
      return null;
    }
  };

  if (loading) {
    return <SkeletonPage />;
  }

  return (
    <div className="page" dir="rtl" style={{ padding: "2rem" }}>
      <div className='submissions-page' dir='rtl'>
        <header className='submissions-header'>
          <h1>تسليمات وأنشطة الطلاب</h1>
        </header>
      </div>
      {formError && <p className="login-error">{formError}</p>}
      <ActivitySubmissionPanel
        loading={loading}
        users={users}
        activitySubmissions={activitySubmissions}
        collaborativeCompletions={collaborativeCompletions}
        leaderboard={leaderboard}
        studentTrackingData={studentTrackingData}
        onDeleteCompletion={handleDeleteCompletion}
        onViewCollaborativeDetails={handleViewCollaborativeDetails}
        getDisplayName={getDisplayName}
      />
    </div>
  );
}
