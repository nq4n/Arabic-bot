export type RubricLevel = {
  id: string;
  label: string;
  score: number;
  description: string;
};

export type RubricCriterion = {
  id: string;
  name: string;
  description: string;
  levels: RubricLevel[];
};

export type Rubric = {
  topicId: string;
  topicTitle: string;
  criteria: RubricCriterion[];
};

const createLevels = (descriptions: {
  excellent: string;
  veryGood: string;
  good: string;
  weak: string;
}): RubricLevel[] => [
  {
    id: 'excellent',
    label: 'ممتاز',
    score: 2,
    description: descriptions.excellent,
  },
  {
    id: 'very-good',
    label: 'جيد جدا',
    score: 1,
    description: descriptions.veryGood,
  },
  {
    id: 'good',
    label: 'جيد',
    score: 0.5,
    description: descriptions.good,
  },
  {
    id: 'weak',
    label: 'ضعيف',
    score: 0,
    description: descriptions.weak,
  },
];

const createLegacyLevels = (descriptions: {
  excellent: string;
  good: string;
  fair: string;
  weak: string;
  notMentioned?: string;
}): RubricLevel[] => [
  {
    id: 'excellent',
    label: 'ممتاز',
    score: 4,
    description: descriptions.excellent,
  },
  {
    id: 'good',
    label: 'جيد',
    score: 3,
    description: descriptions.good,
  },
  {
    id: 'fair',
    label: 'مقبول',
    score: 2,
    description: descriptions.fair,
  },
  {
    id: 'weak',
    label: 'ضعيف',
    score: 1,
    description: descriptions.weak,
  },
  {
    id: 'not-mentioned',
    label: 'غير مذكور',
    score: 0,
    description: descriptions.notMentioned || 'المعيار غير مذكور في الكتابة',
  },
];

export const rubrics: Rubric[] = [
  {
    topicId: 'landscape-description',
    topicTitle: 'وصف منظر طبيعي',
    criteria: [
      {
        id: 'description-elements',
        name: 'تحديد عناصر الوصف ومكوناته',
        description: 'مدى تحديد الطالب للعناصر التي سيصفها داخل المشهد.',
        levels: createLevels({
          excellent: 'حدد أكثر من عنصرين للوصف.',
          veryGood: 'حدد عنصرين للوصف.',
          good: 'حدد عنصرا واحدا للوصف.',
          weak: 'لم يحدد أي عنصر للوصف.',
        }),
      },
      {
        id: 'description-organization',
        name: 'تنظيم الوصف وترتيبه',
        description: 'مدى ترتيب الوصف وفق نسق واضح من العام إلى الخاص أو من القريب إلى البعيد.',
        levels: createLevels({
          excellent: 'وصف منظم وفق نسق واضح (عام إلى خاص أو قريب إلى بعيد).',
          veryGood: 'ترتيب مقبول.',
          good: 'محاولة للتنظيم لكنها غير واضحة.',
          weak: 'وصف عشوائي دون ترتيب.',
        }),
      },
      {
        id: 'figurative-images',
        name: 'الصور الجمالية',
        description: 'مدى توظيف الصور الجمالية لخدمة الوصف.',
        levels: createLevels({
          excellent: 'استخدام صورتين جماليتين على الأقل.',
          veryGood: 'استخدام صورة جمالية واحدة بشكل صحيح.',
          good: 'استخدام صورة جمالية واحدة غير دقيقة.',
          weak: 'لا توجد صور جمالية.',
        }),
      },
      {
        id: 'description-accuracy',
        name: 'دقة الوصف',
        description: 'مدى دقة التفاصيل التي يقدمها الطالب في وصف عناصر المشهد.',
        levels: createLevels({
          excellent: 'ذكر تفاصيل عنصرين أو أكثر على الأقل.',
          veryGood: 'ذكر تفاصيل شيء واحد على الأقل.',
          good: 'محاولة واحدة في وصف شيء واحد بدقة ولكنها غير دقيقة.',
          weak: 'وصف غير دقيق.',
        }),
      },
      {
        id: 'language-safety',
        name: 'سلامة اللغة',
        description: 'السلامة الإملائية والنحوية ومراعاة علامات الترقيم.',
        levels: createLevels({
          excellent: 'أقل من خطأين.',
          veryGood: 'من 2 إلى 4 أخطاء.',
          good: 'من 4 إلى 8 أخطاء.',
          weak: 'أكثر من ثمانية أخطاء.',
        }),
      },
    ],
  },
  {
    topicId: 'discussing-issue',
    topicTitle: 'مناقشة قضية',
    criteria: [
      {
        id: 'clarity',
        name: 'وضوح عرض القضية',
        description: 'بيان المشكلة أو القضية المطروحة للنقاش بشكل مفهوم.',
        levels: createLegacyLevels({
          excellent: 'يعرض القضية بوضوح تام مع تحديد أبعادها الأساسية.',
          good: 'يعرض القضية بوضوح مقبول مع بعض النقص في التفاصيل.',
          fair: 'عرض جزئي للقضية، يغيب عنه بعض الجوانب المهمة.',
          weak: 'القضية غير واضحة للقارئ أو غير محددة.',
        }),
      },
      {
        id: 'reasons_effects',
        name: 'عرض الأسباب والآثار',
        description: 'ذكر أسباب القضية وآثارها المنطقية على الفرد والمجتمع.',
        levels: createLegacyLevels({
          excellent: 'يذكر أسبابا متعددة ومنطقية، ويربطها بآثار واضحة ومقنعة.',
          good: 'يذكر عدة أسباب وآثار لكن بعض الروابط غير كاملة.',
          fair: 'يذكر سببا أو سببين وآثارا عامة دون تفصيل كاف.',
          weak: 'لا يذكر أسبابا واضحة أو آثارا مرتبطة بالقضية.',
        }),
      },
      {
        id: 'arguments',
        name: 'قوة الحجج والأدلة',
        description: 'استخدام حجج منطقية وأمثلة تدعم الرأي.',
        levels: createLegacyLevels({
          excellent: 'يستخدم حججا قوية مدعومة بأمثلة أو شواهد مناسبة.',
          good: 'يستخدم حججا مقبولة مع قلة في الأمثلة.',
          fair: 'حجج عامة وضعيفة، مع أمثلة بسيطة أو قليلة.',
          weak: 'لا توجد حجج واضحة، النص مجرد رأي غير مدعوم.',
        }),
      },
      {
        id: 'objectivity',
        name: 'الموضوعية واحترام الرأي الآخر',
        description: 'طريقة عرض الرأي دون تجريح، مع قبول الرأي المقنع المخالف.',
        levels: createLegacyLevels({
          excellent: 'أسلوب هادئ ومتوازن، يحترم الآراء الأخرى ويعرضها بعدل.',
          good: 'أسلوب جيد في الغالب مع بعض الميل لرأي واحد.',
          fair: 'انحياز واضح مع احترام محدود للرأي الآخر.',
          weak: 'أسلوب هجومي أو متعصب، لا يظهر أي تقبل لآراء مختلفة.',
        }),
      },
      {
        id: 'language',
        name: 'سلامة اللغة والأسلوب',
        description: 'سلامة التراكيب اللغوية والإملائية، وقدرة الطالب على صياغة جمل واضحة ومفهومة.',
        levels: createLegacyLevels({
          excellent: 'جمل سليمة في الغالب، وأخطاء قليلة جدا لا تؤثر في الفهم.',
          good: 'بعض الأخطاء اللغوية والإملائية مع بقاء المعنى واضحا.',
          fair: 'أخطاء ملحوظة تؤثر جزئيا في وضوح المعنى.',
          weak: 'كثرة الأخطاء تجعل فهم النص صعبا.',
        }),
      },
    ],
  },
  {
    topicId: 'report-writing',
    topicTitle: 'كيفية كتابة التقرير',
    criteria: [
      {
        id: 'report-elements',
        name: 'عناصر التقرير',
        description: 'مدى اكتمال عناصر التقرير الأساسية: العنوان والمقدمة والعرض والخاتمة.',
        levels: createLevels({
          excellent: 'جميع العناصر: عنوان ومقدمة وعرض وخاتمة.',
          veryGood: 'ذكر 3 عناصر.',
          good: 'ذكر عنصرين فقط.',
          weak: 'غياب معظم عناصر التقرير.',
        }),
      },
      {
        id: 'report-purpose',
        name: 'تحديد الهدف',
        description: 'مدى وضوح هدف التقرير في المقدمة.',
        levels: createLevels({
          excellent: 'تحديد الهدف في جملة واضحة في المقدمة.',
          veryGood: 'هدف محدد في جملة غير واضحة تماما.',
          good: 'ذكر هدف عام.',
          weak: 'الهدف غير محدد.',
        }),
      },
      {
        id: 'report-information',
        name: 'عرض المعلومات',
        description: 'مدى تنظيم المعلومات ووضوحها أثناء العرض.',
        levels: createLevels({
          excellent: 'جميع المعلومات منظمة وواضحة.',
          veryGood: 'معظم المعلومات منظمة.',
          good: 'معلومات قليلة التنظيم.',
          weak: 'عرض عشوائي ومعلومات غير منظمة.',
        }),
      },
      {
        id: 'report-sequencing',
        name: 'تسلسل الأفكار',
        description: 'مدى ترابط أفكار التقرير وتسلسلها المنطقي.',
        levels: createLevels({
          excellent: 'معظم الأفكار مرتبة منطقيا.',
          veryGood: 'توجد 3 أفكار مترابطة على الأقل.',
          good: 'توجد فكرتان على الأقل مرتبتان منطقيا.',
          weak: 'أفكار غير مرتبة.',
        }),
      },
      {
        id: 'report-language',
        name: 'السلامة اللغوية',
        description: 'السلامة الإملائية والنحوية ومراعاة علامات الترقيم.',
        levels: createLevels({
          excellent: 'أقل من خطأين.',
          veryGood: 'من 2 إلى 4 أخطاء.',
          good: 'من 4 إلى 8 أخطاء.',
          weak: 'أكثر من ثمانية أخطاء.',
        }),
      },
    ],
  },
  {
    topicId: 'free-expression',
    topicTitle: 'التعبير الحر',
    criteria: [
      {
        id: 'expression-structure',
        name: 'وضوح عناصر التعبير',
        description: 'مدى ظهور المقدمة والعرض والخاتمة بوضوح في النص.',
        levels: createLevels({
          excellent: 'وضوح جميع العناصر: المقدمة والعرض والخاتمة.',
          veryGood: 'كتابة جمل مناسبة في عنصرين على الأقل.',
          good: 'كتابة جمل قليلة وقصيرة جدا في عنصرين على الأقل.',
          weak: 'غياب عنصرين من عناصر التعبير.',
        }),
      },
      {
        id: 'expression-imagery',
        name: 'الصور الجمالية',
        description: 'مدى استخدام الصور الجمالية في التعبير الحر.',
        levels: createLevels({
          excellent: 'استخدام صورتين جماليتين صحيحتين على الأقل.',
          veryGood: 'صورة جمالية واحدة صحيحة على الأقل.',
          good: 'صورة جمالية واحدة غير دقيقة.',
          weak: 'لا توجد صور جمالية.',
        }),
      },
      {
        id: 'expression-sequencing',
        name: 'الأفكار وتسلسلها',
        description: 'مدى ترابط الأفكار وتنظيمها داخل النص.',
        levels: createLevels({
          excellent: 'معظم الأفكار مرتبة منطقيا.',
          veryGood: 'توجد 3 أفكار مترابطة على الأقل.',
          good: 'توجد فكرتان على الأقل مرتبتان منطقيا.',
          weak: 'معظم الأفكار غير مرتبة.',
        }),
      },
      {
        id: 'expression-linking-tools',
        name: 'أدوات الربط',
        description: 'مدى استخدام أدوات الربط لربط الجمل والأفكار داخل التعبير الحر.',
        levels: createLevels({
          excellent: 'وجود 3 أدوات على الأقل.',
          veryGood: 'وجود أداتين على الأقل.',
          good: 'وجود أداة على الأقل.',
          weak: 'لا توجد أدوات ربط.',
        }),
      },
      {
        id: 'expression-language',
        name: 'السلامة اللغوية',
        description: 'السلامة الإملائية والنحوية ومراعاة علامات الترقيم.',
        levels: createLevels({
          excellent: 'أقل من خطأين.',
          veryGood: 'من 2 إلى 4 أخطاء.',
          good: 'من 4 إلى 8 أخطاء.',
          weak: 'أكثر من ثمانية أخطاء.',
        }),
      },
    ],
  },
  {
    topicId: 'dialogue-text',
    topicTitle: 'النص الحواري',
    criteria: [
      {
        id: 'dialogue-form',
        name: 'شكل الحوار',
        description: 'مدى ظهور النص في صورة حوار واضح بين طرفين أو أكثر.',
        levels: createLevels({
          excellent: 'على شكل حوار واضح: سؤال وجواب أو نقاش ورد عليه.',
          veryGood: 'على شكل حوار في معظمه لكن الإجابات أو الردود غير واضحة تماما.',
          good: 'على شكل حوار في مواضع قليلة.',
          weak: 'على شكل سرد لا حوار.',
        }),
      },
      {
        id: 'dialogue-clarity',
        name: 'وضوح الأفكار',
        description: 'مدى وضوح المعلومات والأفكار المطروحة في الحوار.',
        levels: createLevels({
          excellent: 'المعلومات كلها واضحة.',
          veryGood: 'المعلومات واضحة في معظمها.',
          good: 'أفكار معظمها غير واضحة.',
          weak: 'عرض عشوائي للأفكار وبشكل غير واضح.',
        }),
      },
      {
        id: 'dialogue-sequencing',
        name: 'التسلسل',
        description: 'مدى ترتيب جمل الحوار بشكل منطقي ومتدرج.',
        levels: createLevels({
          excellent: 'وجود 3 جمل فأكثر متسلسلة في الحوار منطقيا.',
          veryGood: 'وجود 3 جمل على الأقل مرتبة منطقيا في الحوار.',
          good: 'وجود جملتين على الأقل مرتبتين منطقيا في الحوار.',
          weak: 'حوار غير مرتب.',
        }),
      },
      {
        id: 'dialogue-persuasion',
        name: 'إقناع القارئ',
        description: 'مدى دعم الحوار بأمثلة أو شواهد مناسبة للإقناع.',
        levels: createLevels({
          excellent: 'الاستشهاد بأكثر من مثال للإقناع.',
          veryGood: 'الاستشهاد بمثال واحد للإقناع.',
          good: 'محاولة الإقناع بمثال ولكن ليس في موضعه.',
          weak: 'حوار غير مدعم بالحجج.',
        }),
      },
      {
        id: 'dialogue-language',
        name: 'سلامة اللغة',
        description: 'السلامة الإملائية والنحوية ومراعاة علامات الترقيم.',
        levels: createLevels({
          excellent: 'أقل من خطأين.',
          veryGood: 'من 2 إلى 4 أخطاء.',
          good: 'من 4 إلى 8 أخطاء.',
          weak: 'أكثر من ثمانية أخطاء.',
        }),
      },
    ],
  },
{
    topicId: "paragraph-writing",
    topicTitle: "كتابة الفقرة",
    criteria: [
      {
        id: "main-idea",
        name: "وضوح الفكرة الرئيسة",
        description: "مدى ظهور فكرة رئيسة واحدة تدور حولها الفقرة.",
        levels: createLevels({
          excellent: "الفكرة الرئيسة واضحة ومحددة وتضبط كل الجمل.",
          veryGood: "الفكرة واضحة غالبًا مع خروج بسيط عن الموضوع.",
          good: "الفكرة موجودة لكنها عامة أو غير مركزة.",
          weak: "لا تظهر فكرة رئيسة واضحة.",
        }),
      },
      {
        id: "supporting-details",
        name: "الأفكار الداعمة",
        description: "مدى دعم الفكرة الرئيسة بتفاصيل وأمثلة مناسبة.",
        levels: createLevels({
          excellent: "توجد أفكار داعمة وأمثلة مناسبة تعزز المعنى.",
          veryGood: "توجد أفكار داعمة كافية مع مثال أو تفصيل محدود.",
          good: "الأفكار الداعمة قليلة أو عامة.",
          weak: "لا توجد أفكار داعمة مناسبة.",
        }),
      },
      {
        id: "coherence",
        name: "ترابط الجمل",
        description: "مدى ترتيب الجمل واستخدام أدوات الربط.",
        levels: createLevels({
          excellent: "الجمل مترابطة ومرتبة بأدوات ربط مناسبة.",
          veryGood: "الترابط جيد مع نقص بسيط في أدوات الربط.",
          good: "الترابط محدود وبعض الجمل غير متصلة.",
          weak: "الجمل متناثرة وغير مترابطة.",
        }),
      },
      {
        id: "language",
        name: "سلامة اللغة",
        description: "السلامة النحوية والإملائية ووضوح التراكيب.",
        levels: createLevels({
          excellent: "أخطاء قليلة جدًا لا تؤثر في المعنى.",
          veryGood: "أخطاء محدودة والمعنى واضح.",
          good: "أخطاء ملحوظة تؤثر جزئيًا في جودة النص.",
          weak: "أخطاء كثيرة تعيق الفهم.",
        }),
      },
      {
        id: "punctuation",
        name: "علامات الترقيم",
        description: "مدى توظيف علامات الترقيم المناسبة داخل الفقرة.",
        levels: createLevels({
          excellent: "استخدام صحيح ومناسب لعلامات الترقيم.",
          veryGood: "استخدام جيد مع هفوات قليلة.",
          good: "استخدام محدود أو غير منتظم.",
          weak: "غياب علامات الترقيم أو استخدامها استخدامًا خاطئًا.",
        }),
      },
    ],
  },
  {
    topicId: "topic-planning",
    topicTitle: "تصميم موضوع",
    criteria: [
      {
        id: "topic-entry",
        name: "تحديد البداية والفكرة العامة",
        description: "مدى وضوح مدخل الموضوع وفكرته العامة.",
        levels: createLevels({
          excellent: "بداية مناسبة وفكرة عامة واضحة ومركزة.",
          veryGood: "بداية مناسبة غالبًا والفكرة مفهومة.",
          good: "بداية عامة أو فكرة تحتاج إلى تحديد أكبر.",
          weak: "لا توجد بداية واضحة أو فكرة عامة محددة.",
        }),
      },
      {
        id: "elements",
        name: "عناصر الموضوع",
        description: "مدى اكتمال الأفكار الرئيسة والفرعية في التصميم.",
        levels: createLevels({
          excellent: "العناصر مكتملة وتشمل أفكارًا رئيسة وفرعية مناسبة.",
          veryGood: "العناصر جيدة مع نقص بسيط في التفصيل.",
          good: "العناصر قليلة أو غير متوازنة.",
          weak: "العناصر غير واضحة أو غير مرتبطة بالموضوع.",
        }),
      },
      {
        id: "sequence",
        name: "ترتيب الأفكار",
        description: "مدى ترتيب العناصر في تسلسل منطقي.",
        levels: createLevels({
          excellent: "ترتيب منطقي واضح من المقدمة إلى الخاتمة.",
          veryGood: "الترتيب جيد مع انتقالات تحتاج إلى تحسين.",
          good: "الترتيب موجود لكنه غير محكم.",
          weak: "الأفكار مبعثرة بلا تسلسل.",
        }),
      },
      {
        id: "conclusion",
        name: "الخاتمة",
        description: "مدى مناسبة الخاتمة للموضوع وما سبقها.",
        levels: createLevels({
          excellent: "خاتمة مناسبة تلخص النتيجة أو تقدم رأيًا واضحًا.",
          veryGood: "خاتمة مناسبة غالبًا لكنها مختصرة.",
          good: "خاتمة عامة لا ترتبط بقوة بالموضوع.",
          weak: "غياب الخاتمة أو عدم مناسبتها.",
        }),
      },
      {
        id: "clarity",
        name: "وضوح العرض",
        description: "مدى وضوح لغة التصميم وسهولة فهمه.",
        levels: createLevels({
          excellent: "التصميم واضح ومنظم بلغة سليمة.",
          veryGood: "واضح في معظمه مع هفوات لغوية بسيطة.",
          good: "يحتاج إلى تنظيم أو صياغة أوضح.",
          weak: "يصعب فهم التصميم بسبب الغموض أو كثرة الأخطاء.",
        }),
      },
    ],
  },
  {
    topicId: "summarization",
    topicTitle: "التلخيص",
    criteria: [
      {
        id: "main-ideas",
        name: "الأفكار الأساسية",
        description: "مدى احتفاظ التلخيص بالفكرة العامة والأفكار الرئيسة.",
        levels: createLevels({
          excellent: "يشمل الفكرة العامة ومعظم الأفكار الأساسية بدقة.",
          veryGood: "يشمل أهم الأفكار مع نقص بسيط.",
          good: "يعرض بعض الأفكار ويغفل أخرى مهمة.",
          weak: "لا يبرز الأفكار الأساسية للنص.",
        }),
      },
      {
        id: "conciseness",
        name: "الإيجاز",
        description: "مدى اختصار النص دون إخلال بالمعنى.",
        levels: createLevels({
          excellent: "التلخيص موجز وواضح ولا يتضمن حشوًا.",
          veryGood: "موجز غالبًا مع بعض التفصيل الزائد.",
          good: "أقصر من النص لكنه ما زال مطولًا أو ناقصًا.",
          weak: "طويل جدًا أو مخل بالمعنى.",
        }),
      },
      {
        id: "own-phrasing",
        name: "إعادة الصياغة",
        description: "مدى كتابة التلخيص بأسلوب الطالب لا بالنقل الحرفي.",
        levels: createLevels({
          excellent: "إعادة صياغة واضحة بأسلوب خاص وسليم.",
          veryGood: "إعادة صياغة جيدة مع نقل عبارات قليلة.",
          good: "يعتمد كثيرًا على ألفاظ النص الأصلي.",
          weak: "نقل حرفي أو صياغة غير مفهومة.",
        }),
      },
      {
        id: "cohesion",
        name: "ترابط التلخيص",
        description: "مدى تسلسل الجمل وترابط الأفكار في التلخيص.",
        levels: createLevels({
          excellent: "الأفكار مترابطة ومتسلسلة منطقيًا.",
          veryGood: "الترابط جيد مع انتقالات تحتاج إلى تحسين.",
          good: "ترابط محدود بين الجمل.",
          weak: "الأفكار متفرقة وغير مرتبة.",
        }),
      },
      {
        id: "language",
        name: "سلامة اللغة",
        description: "سلامة الإملاء والنحو وعلامات الترقيم.",
        levels: createLevels({
          excellent: "أخطاء قليلة جدًا لا تؤثر في المعنى.",
          veryGood: "أخطاء محدودة والمعنى واضح.",
          good: "أخطاء ملحوظة تؤثر جزئيًا في الجودة.",
          weak: "كثرة الأخطاء تعيق الفهم.",
        }),
      },
    ],
  },
  {
    topicId: "biography-writing",
    topicTitle: "ترجمة علم",
    criteria: [
      {
        id: "identity",
        name: "التعريف بالشخصية",
        description: "مدى وضوح اسم الشخصية ومجالها ومكانتها.",
        levels: createLevels({
          excellent: "تعريف واضح ودقيق بالشخصية ومجال تميزها.",
          veryGood: "تعريف جيد مع نقص بسيط في التفاصيل.",
          good: "تعريف عام يحتاج إلى توضيح.",
          weak: "لا يعرّف بالشخصية تعريفًا كافيًا.",
        }),
      },
      {
        id: "information-selection",
        name: "انتقاء المعلومات",
        description: "مدى اختيار المعلومات المهمة دون حشو.",
        levels: createLevels({
          excellent: "معلومات مهمة ومناسبة تبرز الشخصية.",
          veryGood: "معلومات جيدة مع بعض التفاصيل غير الضرورية.",
          good: "معلومات قليلة أو غير متوازنة.",
          weak: "معلومات غير مناسبة أو ناقصة جدًا.",
        }),
      },
      {
        id: "organization",
        name: "تنظيم السيرة",
        description: "مدى ترتيب المعلومات في تسلسل واضح.",
        levels: createLevels({
          excellent: "ترتيب واضح: تعريف، نشأة، أعمال، أثر.",
          veryGood: "تنظيم جيد مع انتقالات تحتاج إلى تحسين.",
          good: "تنظيم محدود أو غير مكتمل.",
          weak: "المعلومات مبعثرة بلا ترتيب.",
        }),
      },
      {
        id: "impact",
        name: "إبراز الأثر",
        description: "مدى بيان أثر الشخصية أو إنجازاتها.",
        levels: createLevels({
          excellent: "يعرض الإنجازات والأثر بوضوح.",
          veryGood: "يعرض الإنجازات مع أثر مختصر.",
          good: "يذكر إنجازات عامة دون توضيح أثرها.",
          weak: "لا يذكر إنجازات أو أثرًا واضحًا.",
        }),
      },
      {
        id: "language",
        name: "سلامة اللغة",
        description: "سلامة الأسلوب ودقة الأسماء والتواريخ.",
        levels: createLevels({
          excellent: "لغة سليمة ودقيقة في الأسماء والمعلومات.",
          veryGood: "أخطاء قليلة لا تؤثر في الفهم.",
          good: "أخطاء ملحوظة تحتاج إلى مراجعة.",
          weak: "أخطاء كثيرة أو معلومات غير دقيقة.",
        }),
      },
    ],
  },
  {
    topicId: "book-presentation",
    topicTitle: "كيفية عرض كتاب",
    criteria: [
      {
        id: "book-info",
        name: "معلومات الكتاب",
        description: "مدى ذكر العنوان والمؤلف والموضوع العام.",
        levels: createLevels({
          excellent: "يذكر معلومات الكتاب الأساسية كاملة بوضوح.",
          veryGood: "يذكر معظم المعلومات الأساسية.",
          good: "يذكر بعض المعلومات ويغفل أخرى مهمة.",
          weak: "معلومات الكتاب الأساسية غائبة أو غير واضحة.",
        }),
      },
      {
        id: "content-summary",
        name: "عرض المحتوى",
        description: "مدى تلخيص محتوى الكتاب وأهم أفكاره.",
        levels: createLevels({
          excellent: "يعرض الموضوع وأهم الأفكار عرضًا واضحًا وموجزًا.",
          veryGood: "يعرض المحتوى جيدًا مع نقص بسيط.",
          good: "يعرض المحتوى عرضًا عامًا أو غير كاف.",
          weak: "لا يبين محتوى الكتاب بوضوح.",
        }),
      },
      {
        id: "method",
        name: "منهج المؤلف ومصادره",
        description: "مدى الإشارة إلى طريقة المؤلف أو مصادر الكتاب عند الحاجة.",
        levels: createLevels({
          excellent: "يوضح منهج المؤلف ومصادره أو طريقته بوعي.",
          veryGood: "يشير إلى المنهج أو المصادر إشارة مناسبة.",
          good: "إشارة محدودة أو غير واضحة.",
          weak: "لا يذكر المنهج أو المصادر.",
        }),
      },
      {
        id: "opinion",
        name: "الرأي والتقويم",
        description: "مدى إبداء رأي معلل في قيمة الكتاب.",
        levels: createLevels({
          excellent: "رأي واضح ومعلل بأسباب مناسبة.",
          veryGood: "رأي واضح مع تعليل مختصر.",
          good: "رأي عام بلا تعليل كاف.",
          weak: "لا يظهر رأي الطالب في الكتاب.",
        }),
      },
      {
        id: "language",
        name: "سلامة اللغة والتنظيم",
        description: "سلامة الصياغة وترابط فقرات العرض.",
        levels: createLevels({
          excellent: "لغة سليمة وفقرات مترابطة.",
          veryGood: "أخطاء قليلة وتنظيم جيد.",
          good: "أخطاء أو ضعف تنظيم يؤثر جزئيًا في العرض.",
          weak: "أخطاء كثيرة أو عرض غير منظم.",
        }),
      },
    ],
  },
  {
    topicId: "storytelling",
    topicTitle: "حكاية قصة",
    criteria: [
      {
        id: "story-elements",
        name: "عناصر القصة",
        description: "مدى ظهور الشخصيات والزمان والمكان والأحداث.",
        levels: createLevels({
          excellent: "العناصر الأساسية واضحة ومتكاملة.",
          veryGood: "العناصر موجودة مع نقص بسيط في التفصيل.",
          good: "بعض العناصر موجودة وبعضها غائب.",
          weak: "معظم عناصر القصة غير واضحة.",
        }),
      },
      {
        id: "event-sequence",
        name: "تسلسل الأحداث",
        description: "مدى ترتيب الأحداث من البداية إلى النهاية.",
        levels: createLevels({
          excellent: "الأحداث مرتبة ومترابطة بوضوح.",
          veryGood: "الأحداث مرتبة غالبًا مع بعض القفزات.",
          good: "التسلسل موجود لكنه ضعيف.",
          weak: "الأحداث مبعثرة وغير مفهومة.",
        }),
      },
      {
        id: "narration",
        name: "أسلوب السرد",
        description: "مدى مناسبة ضمير السرد وطريقة الحكاية.",
        levels: createLevels({
          excellent: "ضمير السرد مناسب والأسلوب واضح ومؤثر.",
          veryGood: "السرد مناسب مع هفوات قليلة.",
          good: "السرد مفهوم لكنه يحتاج إلى ضبط.",
          weak: "السرد مضطرب أو غير مناسب.",
        }),
      },
      {
        id: "engagement",
        name: "التشويق",
        description: "مدى قدرة القصة على جذب القارئ أو السامع.",
        levels: createLevels({
          excellent: "بداية جاذبة وتفاصيل مؤثرة ونهاية مناسبة.",
          veryGood: "في القصة قدر جيد من التشويق.",
          good: "التشويق محدود والتفاصيل عامة.",
          weak: "القصة لا تجذب القارئ أو تخلو من الحركة.",
        }),
      },
      {
        id: "language",
        name: "سلامة اللغة",
        description: "سلامة الجمل والإملاء وعلامات الترقيم.",
        levels: createLevels({
          excellent: "لغة سليمة وواضحة.",
          veryGood: "أخطاء قليلة لا تؤثر في الفهم.",
          good: "أخطاء ملحوظة تؤثر جزئيًا في جودة القصة.",
          weak: "أخطاء كثيرة تعيق الفهم.",
        }),
      },
    ],
  },
];
