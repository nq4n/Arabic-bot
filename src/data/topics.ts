/* eslint-disable no-useless-escape */
// src/data/topics.ts

export type PredefinedQuestion = {
  id: string;
  question: string;
  answer: string;
};

export type LessonStep = {
  step: number;
  icon: string;
  title: string;
  description: string;
  options?: string[];
};

export type Activity = {
  activity: number;
  icon: string;
  description: string;
};

/**
 * البنية الرئيسية للموضوع
 */
export type Topic = {
  id: string;
  title: string;
  description: string;
  
  lesson: {
    header: string;
    introduction: {
      tahdid: string;
      importance: string;
    };
    steps: LessonStep[];
  };

  // النموذج الكتابي
  writingModel: {
    header: string;
    content: string;
  };

  activities: {
    header: string;
    list: Activity[];
  };

  writingPrompts: {
    header: string;
    list: string[];
  };

  reviewQuestions: PredefinedQuestion[];
};


// بيانات الموضوعات
export const topics: Topic[] = [
  {
    id: "landscape-description",
    title: "وصف منظر طبيعي",
    description: "تعلم كيفية وصف المناظر الطبيعية بأسلوب أدبي مبدع، بدءًا من تحديد العناصر وحتى التحرير والمراجعة.",
    lesson: {
      header: "الدرس الأول: وصف منظر طبيعي",
      introduction: {
        tahdid: "الطبيعة بمناظرها المختلفة والمتنوعة هي المحل الذي فتح الإنسان عليه عينه وفكره منذ أن وجد على هذا الكوكب؛ فارتبط بها في حياته ومعاشه، ودخلت إلى لغته لتحتل المكانة العليا فيها. فهي كما تمده بالمعاش، تمده بالفكر والتعبير. لذا نظر الإنسان إليها نظرة إكبار تملأ عينه وفكره ووجدانه، ورغم تعقّد حياة الإنسان وابتعاده عن مناظر الطبيعة البسيطة الملهمة، إلا أنها تظل الملجأ الذي يهرب إليه كلما أحس بضغوط الحياة.",
        importance: "تمثل الطبيعة مصدرًا من مصادر الإلهام اللغوي العام والأدبي الخاص؛ فهي تمد اللغة بالعديد من المفردات، وهي منطلق إبداع الكثير من الأدباء شعراء وكُتّاب. وللوصول إلى مرحلة الإبداع الأدبي في وصف الطبيعة، يحتاج المتعلّم إلى فهم كيفية وصف المنظر الطبيعي بعبارات معبرة موحية."
      },
      steps: [
        { step: 1, icon: "fas fa-eye", title: "تعيين العناصر التي يشملها الوصف", description: "يلزم الواصف أن يتفاعل بصريًا مع المنظر، فيراه بعين فاحصة، مستكشفًا مواطن الجمال والروعة فيه، مع تفعيل القلب والعقل أثناء النظر." },
        { step: 2, icon: "fas fa-pen-nib", title: "اختيار المعاني المناسبة", description: "يقوم الواصف بانتقاء ألفاظ وتراكيب وصور مناسبة لكل عنصر من عناصر المنظر؛ وهي عملية فكرية لغوية." },
        { step: 3, icon: "fas fa-sitemap", title: "تحديد منطلق عملية الوصف", description: "اختر نقطة بداية لوصفك.", options: ["البدء بالأشياء القريبة ثم الانتقال إلى البعيدة (أو العكس).", "البدء بأبرز العناصر المؤثرة في المنظر، ثم متابعة التفاصيل.", "البدء بالوصف الشامل ثم الانتقال إلى الجزئيات."] },
        { step: 4, icon: "fas fa-file-alt", title: "التحرير والكتابة", description: "يصوغ الواصف نصًا متكامل الجُمَل والفقرات، واضح البداية والنهاية، مع مراعاة اختيار الألفاظ الملائمة والتعبير المناسب." },
        { step: 5, icon: "fas fa-check-double", title: "المراجعة", description: "يعود الواصف لوصفه للمراجعة والتهذيب وإجراء التعديلات اللازمة." }
      ]
    },
    writingModel: {
        header: "نموذج كتابي: وصف غروب الشمس",
        content: "كانت الشمس تغرق في بحر من الألوان الدافئة، مرسلةً أشعتها الأخيرة كخيوط من ذهب تنسج على صفحة السماء. تدرجت الألوان من البرتقالي الناري عند الأفق إلى الوردي الهادئ، ثم إلى الأزرق النيلي في الأعلى. كانت السحب المتفرقة كقطع من القطن المصبوغ، تعكس الضوء وتزيد المشهد سحراً. وببطء، اختفى قرص الشمس خلف الجبال البعيدة، تاركاً وراءه شفقاً بديعاً يودع النهار ويعلن قدوم ليلة هادئة."
    },
    activities: {
      header: "ثالثًا - أنشطة تطبيقية",
      list: [
        { activity: 1, icon: "fas fa-cloud-showers-heavy", description: "صمّم وصفًا لمنظر سقوط الأمطار وسيلان الأودية والشعاب وتأثيره في الناس، متبعًا خطوات الوصف السابقة." },
        { activity: 2, icon: "fas fa-tree", description: "صمّم موضوع وصف لمنظر طبيعي أعجبك، محددًا عناصره، ومنتقيًا بعض الألفاظ والتراكيب الملائمة، ومبيّنًا منطلق الوصف المناسب." },
        { activity: 3, icon: "fas fa-book-open", description: "ابحث في أحد مصادر التعلم عن وصف لمنظر طبيعي، ثم حلّله في ضوء خصائص الوصف الجيد." }
      ]
    },
    writingPrompts: {
      header: "اختر أحد الموضوعات التالية للكتابة:",
      list: [
        "منظر طبيعي في الشتاء.",
        "منظر طبيعي في الصيف.",
        "منظر طبيعي أعجبك.",
        "منظر طبيعي تتخيله من غير بيئتك."
      ]
    },
    reviewQuestions: [
      { id: "q1", question: "ما هي أول خطوة في وصف منظر طبيعي؟", answer: "أول خطوة هي التفاعل البصري مع المنظر ورؤيته بعين فاحصة لاستكشاف تفاصيله ومواطن الجمال فيه." },
      { id: "q2", question: "ماذا يعني \"تحديد منطلق عملية الوصف\"؟", answer: "يعني أن تختار نقطة بداية لوصفك، مثل البدء من الأشياء القريبة ثم البعيدة، أو البدء بالجزء الأبرز في المنظر، أو وصف المنظر بشكل عام ثم الدخول في التفاصيل." },
      { id: "q3", question: "ما أهمية المراجعة بعد الكتابة؟", answer: "المراجعة ضرورية لنقد النص وتهذيب العبارات وإصلاح الأخطاء وإدخال التعديلات التي تجعل الوصف أفضل وأكثر تأثيرًا." }
    ]
  },
  // المواضيع الأخرى (قيد الإنشاء)
  {
    id: "discussing-issue",
    title: "مناقشة قضية",
    description: "تعلم كيفية تحليل القضايا المختلفة، وبناء الحجج، وتقديم رأيك بوضوح وموضوعية.",
    lesson: { header:"", introduction: { tahdid: "", importance: "" }, steps: [] },
    writingModel: { header: "", content: "" },
    activities: { header:"", list: [] },
    writingPrompts: { header:"", list: [] },
    reviewQuestions: []
  },
  {
    id: "report-writing",
    title: "كيفية كتابة التقرير",
    description: "اكتشف العناصر الأساسية للتقرير الناجح وكيفية تنظيمه وعرض المعلومات فيه بفعالية.",
    lesson: { header:"", introduction: { tahdid: "", importance: "" }, steps: [] },
    writingModel: { header: "", content: "" },
    activities: { header:"", list: [] },
    writingPrompts: { header:"", list: [] },
    reviewQuestions: []
  },
  {
    id: "free-expression",
    title: "التعبير الحر",
    description: "أطلق العنان لإبداعك وتعلم كيفية التعبير عن أفكارك ومشاعرك بحرية وبدون قيود.",
    lesson: { header:"", introduction: { tahdid: "", importance: "" }, steps: [] },
    writingModel: { header: "", content: "" },
    activities: { header:"", list: [] },
    writingPrompts: { header:"", list: [] },
    reviewQuestions: []
  },
  {
    id: "dialogue-text",
    title: "النص الحواري",
    description: "تعلم فن كتابة الحوارات الجذابة والواقعية التي تعكس الشخصيات وتدفع الأحداث.",
    lesson: { header:"", introduction: { tahdid: "", importance: "" }, steps: [] },
    writingModel: { header: "", content: "" },
    activities: { header:"", list: [] },
    writingPrompts: { header:"", list: [] },
    reviewQuestions: []
  }
];
