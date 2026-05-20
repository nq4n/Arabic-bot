import { storytellingInteractiveActivity } from "../../data/semester2Activities/storytellingActivity";
import Semester2ActivityShell from "./Semester2ActivityShell";

export default function StorytellingActivity() {
  return (
    <Semester2ActivityShell
      expectedTopicId="storytelling"
      activity={storytellingInteractiveActivity}
      copy={{
        submissionLabel: "القصة",
        finalTitle: "كتابة القصة",
        finalPlaceholder: "اكتب قصتك هنا...",
        sceneHeading: "اختيار مسار القصة",
        sceneCounterLabel: "مرحلة",
        sceneHint: "اختر الحدث الأنسب لكل مرحلة حتى يتكون مسار قصصي واضح ومشوق.",
        sceneDropHint: "اسحب الحدث المناسب لمسار القصة",
        sceneOptionsTitle: "اختيارات الحبكة",
        sceneOptionsHint: "اسحب الحدث أو انقر عليه",
        selectionRequiredError: "يرجى اختيار حدث مناسب لكل مرحلة قبل إنشاء القصة.",
        quickIntro: "اتبع هذه الخطوات لبناء قصة مترابطة.",
        quickSteps: [
          "اختر بداية تعرّف بالمكان والشخصية.",
          "حدد حدثًا يخلق مشكلة أو توترًا في القصة.",
          "اختر نهاية تحل المشكلة وتترك أثرًا واضحًا.",
        ],
        promptsHint: "يمكنك اختيار موقف آخر وتطبيق مسار القصة عليه.",
        draftNotice: "تم إنشاء مسودة القصة. أضف الوصف والحوار قبل الإرسال.",
      }}
    />
  );
}
