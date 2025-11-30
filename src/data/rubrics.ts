
// نوع عام (اختياري لو تحب تستخدمه في التايبسكريبت)
export type RubricLevel = {
    id: string;           // "excellent" | "good" | "fair" | "weak"
    label: string;        // "ممتاز" ...
    score: number;        // 4 / 3 / 2 / 1
    description: string;
  };
  
  export type RubricCriterion = {
    id: string;
    name: string;         // اسم المعيار
    description: string;  // شرح بسيط للمعيار
    levels: RubricLevel[];
  };
  
  export type Rubric = {
    topicId: string;      // يطابق id في topics
    topicTitle: string;
    criteria: RubricCriterion[];
  };
  
  // مصفوفة الـ Rubrics لكل موضوع كتابة
  export const rubrics: Rubric[] = [
    // =========================================
    // 1) وصف منظر طبيعي - landscape-description
    // =========================================
    {
      topicId: "landscape-description",
      topicTitle: "وصف منظر طبيعي",
      criteria: [
        {
          id: "elements",
          name: "تحديد عناصر المنظر",
          description: "قدرة الطالب على ملاحظة عناصر المنظر الطبيعي المهمة وإدخالها في الوصف.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "يذكر معظم عناصر المنظر المهمة بتفاصيل واضحة (السماء، الجبال، الأشجار، الماء، الناس...).",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "يذكر عددًا جيدًا من العناصر لكن بعض التفاصيل غير واضحة أو منقوصة.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "يذكر عناصر قليلة أو عامة دون تحديد كافٍ.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "لا يذكر عناصر واضحة، أو الوصف غير مرتبط بمنظر طبيعي محدد.",
            },
          ],
        },
        {
          id: "imagery",
          name: "الألفاظ والصور التعبيرية",
          description: "اختيار كلمات وصور جميلة تناسب طبيعة المنظر.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "يستخدم ألفاظًا ثرية وصورًا تعبيرية قوية (تشبيه، استعارة...) تضيف جمالًا للوصف.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "يستخدم ألفاظًا مناسبة مع بعض التعابير الجميلة.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "الألفاظ بسيطة ومباشرة، مع قلة أو غياب للصور التعبيرية.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "ألفاظ ضعيفة أو مكررة، ولا توجد صور تعبيرية تقريبًا.",
            },
          ],
        },
        {
          id: "organization",
          name: "ترتيب الوصف وتسلسله",
          description: "تنظيم الوصف بطريقة منطقية (قريب → بعيد، أو عام → تفاصيل...).",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "تسلسل واضح ومتدرج، يبدأ بنقطة انطلاق محددة وينتقل بسلاسة بين عناصر المنظر.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "تسلسل مقبول مع بعض القفزات البسيطة في العرض.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "الأفكار غير مرتبة جيدًا، والانتقال بين أجزاء المنظر غير واضح.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "أفكار عشوائية بلا تسلسل، يصعب متابعة الوصف.",
            },
          ],
        },
        {
          id: "language",
          name: "سلامة اللغة والأسلوب",
          description: "سلامة التراكيب اللغوية والإملائية وقدرته على صياغة جمل مفهومة.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "جمل سليمة في الغالب، أخطاء قليلة جدًا لا تؤثر في الفهم.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "بعض الأخطاء اللغوية والإملائية مع بقاء المعنى واضحًا.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "أخطاء ملحوظة تؤثر جزئيًا في وضوح المعنى.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "كثير من الأخطاء تجعل فهم النص صعبًا.",
            },
          ],
        },
        {
          id: "impact",
          name: "التأثير والإيحاء",
          description: "مدى قدرة الوصف على نقل شعور أو حالة للقارئ.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "ينقل جو المنظر بوضوح ويجعل القارئ يتخيل المشهد ويشعر به.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "يعطي صورة جيدة عن المنظر مع تأثير عاطفي مقبول.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "الوصف مفهوم لكن تأثيره ضعيف.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "لا يحدث النص أي تأثير أو انطباع واضح لدى القارئ.",
            },
          ],
        },
      ],
    },
  
    // =========================================
    // 2) مناقشة قضية - discussing-issue
    // =========================================
    {
      topicId: "discussing-issue",
      topicTitle: "مناقشة قضية",
      criteria: [
        {
          id: "clarity",
          name: "وضوح عرض القضية",
          description: "بيان المشكلة أو القضية المطروحة للنقاش بشكل مفهوم.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "يعرض القضية بوضوح تام مع تحديد أبعادها الأساسية.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "يعرض القضية بوضوح مقبول مع بعض النقص في التفاصيل.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "عرض جزئي للقضية، يغيب عنه بعض الجوانب المهمة.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "القضية غير واضحة للقارئ أو غير محددة.",
            },
          ],
        },
        {
          id: "reasons_effects",
          name: "عرض الأسباب والآثار",
          description: "ذكر أسباب القضية وآثارها المنطقية على الفرد والمجتمع.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "يذكر أسبابًا متعددة ومنطقية، ويربطها بآثار واضحة ومقنعة.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "يذكر عدة أسباب وآثار لكن بعض الروابط غير كاملة.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "يذكر سببًا أو سببين وآثارًا عامة دون تفصيل كافٍ.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "لا يذكر أسبابًا واضحة أو آثارًا مرتبطة بالقضية.",
            },
          ],
        },
        {
          id: "arguments",
          name: "قوة الحجج والأدلة",
          description: "استخدام حجج منطقية وأمثلة تدعم الرأي.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "يستخدم حججًا قوية مدعومة بأمثلة أو شواهد مناسبة.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "يستخدم حججًا مقبولة مع قلة في الأمثلة.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "حجج عامة وضعيفة، مع أمثلة بسيطة أو قليلة.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "لا توجد حجج واضحة، النص مجرد رأي غير مدعوم.",
            },
          ],
        },
        {
          id: "objectivity",
          name: "الموضوعية واحترام الرأي الآخر",
          description: "طريقة عرض الرأي دون تجريح، مع قبول الرأي المقنع المخالف.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "أسلوب هادئ ومتوازن، يحترم الآراء الأخرى ويعرضها بعدل.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "أسلوب جيد في الغالب مع بعض الميل لرأي واحد.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "انحياز واضح مع احترام محدود للرأي الآخر.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "أسلوب هجومي أو متعصب، لا يظهر أي تقبل لآراء مختلفة.",
            },
          ],
        },
        {
          id: "conclusion",
          name: "الخاتمة والحلول",
          description: "تلخيص ما سبق وطرح حلول أو توصيات مناسبة.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "خاتمة واضحة تلخص الفكرة وتقدم حلولًا عملية أو توصيات واضحة.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "خاتمة جيدة مع حلول عامة.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "خاتمة قصيرة أو غامضة مع حلول قليلة أو غير واضحة.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "لا توجد خاتمة حقيقية أو لا تُذكر أي حلول.",
            },
          ],
        },
      ],
    },
  
    // =========================================
    // 3) كيفية كتابة التقرير - report-writing
    // =========================================
    {
      topicId: "report-writing",
      topicTitle: "كيفية كتابة التقرير",
      criteria: [
        {
          id: "purpose_audience",
          name: "تحديد الهدف والجمهور",
          description: "وضوح الهدف من التقرير ولمن يقدَّم.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "يوضّح هدف التقرير بدقة ويُشعر القارئ لمن كُتب التقرير.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "الهدف عام لكنه مفهوم، والجمهور ضمنيًا واضح.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "هدف التقرير غير محدد بشكل كافٍ.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "لا يظهر هدف التقرير أو سبب كتابته.",
            },
          ],
        },
        {
          id: "structure",
          name: "بنية التقرير (مقدمة - عرض - خاتمة)",
          description: "تنظيم التقرير وفق أجزاء واضحة.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "يتضمن مقدمة وعرضًا وخاتمة واضحة، مع عناوين أو فقرات منظمة.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "الأجزاء الرئيسة موجودة لكن بعض الحدود بينها غير واضحة.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "توجد أجزاء للتقرير لكن بدون تنظيم جيد أو توازن.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "لا يتضح تقسيم النص إلى مقدمة وعرض وخاتمة.",
            },
          ],
        },
        {
          id: "facts",
          name: "دقة المعلومات والحقائق",
          description: "ذكر معلومات صحيحة ومرتبطة بموضوع التقرير.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "معلومات دقيقة ومرتبطة تمامًا بالموضوع، بلا مبالغة أو تحريف.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "معلومات صحيحة في الغالب، مع بعض العموميات.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "بعض المعلومات غير دقيقة أو غير مكتملة.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "معلومات قليلة أو غير صحيحة، لا تُقدّم صورة واضحة عن الموضوع.",
            },
          ],
        },
        {
          id: "clarity_objectivity",
          name: "الوضوح والموضوعية",
          description: "الابتعاد عن الرأي الشخصي والاهتمام بنقل الوقائع بوضوح.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "لغة واضحة وجمل مباشرة، مع التزام واضح بالموضوعية.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "لغة جيدة في معظم النص مع بعض التعليقات الشخصية.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "يغلب على النص الرأي الشخصي مع قلة التركيز على الحقائق.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "النص أقرب إلى موضوع تعبيري عادي وليس تقريرًا موضوعيًا.",
            },
          ],
        },
        {
          id: "language",
          name: "سلامة اللغة والتنظيم",
          description: "سلامة الجمل وربط الفقرات وترتيب الأفكار داخل التقرير.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "جمل سليمة ومنظمة، والفقرات مترابطة، والنص سهل القراءة.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "بعض الأخطاء البسيطة مع بقاء الترابط العام جيدًا.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "أخطاء واضحة، وترابط ضعيف بين الفقرات.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "فوضى في تنظيم الجمل والفقرات، مما يصعّب متابعة التقرير.",
            },
          ],
        },
      ],
    },
  
    // =========================================
    // 4) التعبير الحر - free-expression
    // =========================================
    {
      topicId: "free-expression",
      topicTitle: "التعبير الحر",
      criteria: [
        {
          id: "idea_focus",
          name: "وضوح الفكرة الرئيسة",
          description: "وجود فكرة أو موقف واضح يدور حوله الموضوع.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "فكرة رئيسة واضحة ومحددة، والنص يدور حولها دون تشتت.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "فكرة عامة مفهومة مع بعض التفرعات الجانبية.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "فكرة غير محددة جيدًا، مع تشتت في بعض الفقرات.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "لا تظهر فكرة رئيسة واضحة، أو الموضوع متفكك.",
            },
          ],
        },
        {
          id: "personal_voice",
          name: "التعبير عن الذات (الصوت الشخصي)",
          description: "إظهار رأي أو شعور أو تجربة خاصة بالطالب.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "يعبر عن نفسه بوضوح وصدق، ويظهر صوته الخاص في الكتابة.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "يعبر عن ذاته بشكل جيد لكنه قريب من الأسلوب العام الشائع.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "تركّز الكتابة على أفكار عامة مع حضور بسيط للشعور الشخصي.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "لا يظهر في النص أي بعد شخصي أو شعور واضح.",
            },
          ],
        },
        {
          id: "coherence",
          name: "ترابط وتسلسل الأفكار",
          description: "تنقل منطقي بين بداية الموضوع ووسطه ونهايته.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "بداية تمهّد، وسط يشرح، وخاتمة تلخص، مع ترابط واضح بين الأجزاء.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "ترابط عام جيد مع بعض القفزات في الأفكار.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "ضعف في الربط بين الفقرات أو غياب أحد الأجزاء (مقدمة/خاتمة).",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "أفكار مبعثرة، من الصعب تتبع تسلسل الموضوع.",
            },
          ],
        },
        {
          id: "expression",
          name: "جمال الأسلوب والتعبير",
          description: "اختيار تعبيرات مناسبة وحيّة قدر الإمكان.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "أسلوب جميل فيه تعبيرات موفقة وصور أو أمثلة معبّرة.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "أسلوب جيد ومفهوم مع بعض العبارات الجيدة.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "أسلوب بسيط جدًا، قليل الصور أو الأمثلة.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "أسلوب ضعيف يفتقد الدقة أو فيه تكرار مزعج.",
            },
          ],
        },
        {
          id: "language",
          name: "سلامة اللغة والإملاء",
          description: "صحة الجمل من الناحية اللغوية والإملائية.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "أخطاء قليلة جدًا لا تؤثر في الفهم.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "بعض الأخطاء البسيطة مع بقاء المعنى واضحًا.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "أخطاء عديدة تؤثر جزئيًا في وضوح النص.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "أخطاء كثيرة تجعل النص صعب الفهم.",
            },
          ],
        },
      ],
    },
  
    // =========================================
    // 5) النص الحواري - dialogue-text
    // =========================================
    {
      topicId: "dialogue-text",
      topicTitle: "النص الحواري",
      criteria: [
        {
          id: "characters",
          name: "تحديد الشخصيات وملامحها",
          description: "وضوح من هم المتحاورون وملامح كل شخصية.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "شخصيات محددة وواضحة، لكل منها طابع مميز يظهر في كلامه.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "الشخصيات واضحة عمومًا مع تمييز بسيط بينها.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "توجد شخصيات لكن الفروق بينها غير واضحة.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "الشخصيات غير محددة، أو لا يمكن تمييز من يتكلم.",
            },
          ],
        },
        {
          id: "topic_focus",
          name: "تركيز الحوار على موضوع محدد",
          description: "عدم الانتقال بين موضوعات كثيرة بلا هدف.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "الحوار يدور حول موضوع واحد واضح من البداية للنهاية.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "موضوع الحوار واضح مع بعض التفرعات الجانبية.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "انتقال ملحوظ بين موضوعات مختلفة يضعف تركيز الحوار.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "الحوار مشتت ولا يظهر فيه موضوع رئيس.",
            },
          ],
        },
        {
          id: "natural_speech",
          name: "طبيعية الجمل الحوارية",
          description: "مدى قرب اللغة من الحوار الواقعي بين الناس.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "الجمل طبيعية وقريبة من كلام الناس، مع تنويع في الأسئلة والتعليقات والترددات.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "الجمل مناسبة عمومًا مع بعض الرسمية أو الجمود.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "الحوار يبدو أقرب إلى فقرة خبرية من كونه حوارًا حيًّا.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "الجمل غير منطقية أو لا تشبه أسلوب الحوار بين أشخاص حقيقيين.",
            },
          ],
        },
        {
          id: "structure",
          name: "بنية النص الحواري (مقدمة - عرض - خاتمة)",
          description: "وجود بداية تمهّد للحوار وعرض وخاتمة تُنهي الموقف.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "بداية توضّح مكان/سبب الحوار، ثم تبادل منظم للجمل، وخاتمة واضحة.",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "مقدمة وعرض جيدان مع خاتمة بسيطة أو سريعة.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "غياب واضح لأحد الأجزاء أو ضعف في الربط بينها.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "الحوار يبدأ وينتهي فجأة دون تمهيد أو خاتمة.",
            },
          ],
        },
        {
          id: "format_punctuation",
          name: "تنسيق الحوار وعلامات الترقيم",
          description: "تمييز كل متحدث واستخدام علامات ترقيم مناسبة.",
          levels: [
            {
              id: "excellent",
              label: "ممتاز",
              score: 4,
              description: "كل جملة منسوبة بوضوح للمتحدث، مع استخدام مناسب لعلامات الترقيم (؟ ! ، ...).",
            },
            {
              id: "good",
              label: "جيد",
              score: 3,
              description: "بعض الأخطاء البسيطة في النسبة أو الترقيم، لكن المتحدثين مفهومون.",
            },
            {
              id: "fair",
              label: "مقبول",
              score: 2,
              description: "ضعف في تمييز المتحدثين أو قلة في استخدام علامات الترقيم.",
            },
            {
              id: "weak",
              label: "ضعيف",
              score: 1,
              description: "اختلاط في المتحدثين وعدم استخدام علامات الترقيم تقريبًا.",
            },
          ],
        },
      ],
    },
  ];
