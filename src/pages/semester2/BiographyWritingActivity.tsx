import { biographyWritingInteractiveActivity } from "../../data/semester2Activities/biographyWritingActivity";
import Semester2ActivityShell from "./Semester2ActivityShell";

export default function BiographyWritingActivity() {
  return (
    <Semester2ActivityShell
      expectedTopicId="biography-writing"
      activity={biographyWritingInteractiveActivity}
      copy={{
        submissionLabel: "ترجمة العلم",
        partsTitle: "بطاقات ترجمة الشخصية",
        finalTitle: "كتابة ترجمة العلم",
        finalPlaceholder: "اكتب ترجمة الشخصية هنا...",
        partLabel: "بطاقة",
        assembleHint: "رتّب المعلومات من التعريف بالشخصية إلى المنهج والإنجاز والأثر.",
        quickIntro: "اتبع هذه الخطوات لبناء ترجمة موجزة ومنظمة.",
        quickSteps: [
          "ابدأ بتعريف واضح بالشخصية ومجالها.",
          "رتّب المنهج والإنجازات في تسلسل منطقي.",
          "اختم ببيان أثر الشخصية وقيمة سيرتها.",
        ],
        promptsHint: "يمكنك اختيار شخصية أخرى وتطبيق ترتيب البطاقات عليها.",
        draftNotice: "تم إنشاء مسودة الترجمة. راجع التسلسل وأضف لمستك قبل الإرسال.",
      }}
    />
  );
}
