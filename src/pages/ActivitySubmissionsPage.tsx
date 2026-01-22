import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { topics } from "../data/topics";
import { User } from "@supabase/supabase-js";
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

      // Calculate Leaderboard
      const students = list.filter(u => u.role === 'student');
      const entries: LeaderboardEntry[] = students.map(student => {
        const studentTrack = studentTrackingData.find((t: StudentTrackingEntry) => t.student_id === student.id);
        const tracks = studentTrack?.tracking_data || {};

        let points = 0;
        // 1. Lesson Completion (20 pts)
        topics.forEach(topic => {
          if (tracks.lessons?.[topic.id]?.completed) points += 20;
        });

        // 2. Activities (5 pts each)
        const studentActivities = activityData.filter(a => a.student_id === student.id);
        const uniqueActivities = new Set(studentActivities.map(a => `${a.topic_id}-${a.activity_id}`));
        points += uniqueActivities.size * 5;

        // 3. Submissions (10 pts per topic if submission exists)
        // Correctly linking submissions to topics
        const submittedTopicIds = new Set(subs
            .filter(s => s.student_id === student.id && s.topic_title)
            .map(s => topics.find(t => t.title === s.topic_title)?.id)
            .filter((id): id is string => id !== undefined));
        points += submittedTopicIds.size * 10;

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
  }, [currentUser?.id, currentUserRole, studentTrackingData]);

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
          .single();
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
        getDisplayName={getDisplayName}
      />
    </div>
  );
}
