You are a senior full-stack developer. Implement the Student Tracking Confirmation System + Session Time Tracking in my React app with Supabase.

Context:
- The database schema is ALREADY DONE (tables/columns/indexes exist). Do NOT write or run any SQL.
- Existing tracking utilities currently auto-track without validation/confirmation.
- The system must add a confirmation step + session duration tracking for: lesson, activity, evaluation, collaborative.

Hard rules:
1) NO SQL. Assume DB is ready.
2) If a file/function/component already exists, do NOT duplicate it. Update or extend it.
3) Do not break backward compatibility. Keep existing flows working, but route tracking through the new confirmation flow.
4) Produce FULL code for every file you touch (complete file content), and list exactly which files are changed/added.
5) Keep UI simple and fast (confirm/cancel). No complex styling. Use existing project styles/components if present.
6) Every tracking event must create a row in tracking_confirmations first (pending). Only after user confirms do we mark the tracking as confirmed and apply progress updates.
7) Session timing:
   - Start a session when the user enters a page/section (lesson/activity/evaluation/collaborative).
   - End a session when the user leaves the page, navigates away, closes tab, or submits/completes.
   - Save duration to session_durations (start_time, end_time, duration_seconds, is_completed).
8) Data validation:
   - Basic validation before showing the confirmation dialog (required ids exist).
   - Calculate a simple data_quality_score (default 100, reduce if missing optional fields).
9) Supabase security:
   - Use the existing supabase client import in the project.
   - Use authenticated user id as student_id.
   - Handle errors safely (toast/console) without crashing UI.

Implementation steps you must follow (output exactly in this order):

A) Scan existing code mentally based on typical structure:
- src/utils/studentTracking.ts (existing tracking calls)
- Topic page (lesson completion)
- Activity page (activity submission)
- Evaluation page (evaluation submission)
- Collaborative page/flow (completion)
If exact file names differ, search by function names (trackLessonCompletion, trackActivitySubmission, trackEvaluationSubmission, trackCollaborativeCompletion) and integrate there.

B) Add a new util file:
- src/utils/enhancedStudentTracking.ts
It must export:
- requestTrackingConfirmation(params)
- confirmTracking(confirmationId, applyFn)
- rejectTracking(confirmationId)
- startSession(studentId, topicId, sessionType)
- endSession(sessionId, isCompleted)
- validateTrackingPayload(payload)
- calculateDataQualityScore(payload)

C) Add ONE reusable component:
- src/components/ConfirmationDialog.tsx
Props:
- isOpen, title, message, details(optional string[]), onConfirm, onCancel, confirmText, cancelText, loading(optional)
Must be accessible (focus, ESC closes, buttons).

D) Integrate confirmations:
- Replace direct calls to old track* functions so the flow becomes:
  1) validate payload
  2) create tracking_confirmations row (pending)
  3) open ConfirmationDialog
  4) if confirm:
      - set is_confirmed=true + confirmation_timestamp
      - call the old tracking function (so progress is applied)
      - update student_tracking confirmation fields if needed
    if cancel:
      - keep pending or mark rejected (set is_confirmed=false, store rejection metadata)
- Ensure activity button disabled logic uses confirmed status (not pending).

E) Integrate session timing:
- On mount: startSession -> insert session_durations row and store sessionId in state/ref
- On unmount/beforeunload: endSession(sessionId, false)
- On successful confirm/submit: endSession(sessionId, true)

F) Output:
1) A short bullet list of files added/changed.
2) Then for each file, output the COMPLETE file content (no snippets).
3) No extra explanations.

Notes:
- Use TypeScript.
- Use the project’s existing toast/notification system if present; otherwise use console.error and minimal UI feedback.
- Ensure no duplicate “Activity section” rendering or repeated blocks.
