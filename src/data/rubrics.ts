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
];
