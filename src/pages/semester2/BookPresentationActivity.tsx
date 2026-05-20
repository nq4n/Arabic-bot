import { bookPresentationInteractiveActivity } from "../../data/semester2Activities/bookPresentationActivity";
import Semester2ActivityShell from "./Semester2ActivityShell";

export default function BookPresentationActivity() {
  return (
    <Semester2ActivityShell
      expectedTopicId="book-presentation"
      activity={bookPresentationInteractiveActivity}
      copy={{
        submissionLabel: "عرض الكتاب",
        finalTitle: "كتابة عرض الكتاب",
        finalPlaceholder: "اكتب عرض الكتاب هنا...",
        sceneHeading: "منصة عرض الكتاب",
        sceneCounterLabel: "المحطة",
        sceneHint: "اختر العنصر المناسب لكل محطة حتى تبني عرضًا مرتبًا عن الكتاب.",
        sceneDropHint: "اسحب عنصر العرض المناسب",
        sceneOptionsTitle: "عناصر العرض",
        sceneOptionsHint: "اسحب العنصر أو انقر عليه",
        selectionRequiredError: "يرجى اختيار عنصر مناسب لكل محطة في عرض الكتاب.",
        quickIntro: "اتبع هذه الخطوات لبناء عرض كتاب واضح ومقنع.",
        quickSteps: [
          "ابدأ ببطاقة التعريف بالكتاب.",
          "اختر العنصر الذي يلخص محتوى الكتاب دون إطالة.",
          "أضف رأيك الشخصي في النهاية ليكتمل العرض.",
        ],
        promptsHint: "يمكنك اختيار كتاب آخر وتطبيق مراحل العرض عليه.",
        draftNotice: "تم إنشاء مسودة عرض الكتاب. راجع التعريف والمحتوى والرأي قبل الإرسال.",
      }}
    />
  );
}
