// اختبارات وحدة لمنطق التسليمات المتعددة.
// التشغيل:  npx tsx src/utils/submissionHelpers.test.ts
import assert from "node:assert/strict";
import {
  defaultSubmissionTitle,
  grantsPointsForEvaluation,
  resolveSubmissionTitle,
  hasReachedAttemptLimit,
  TopicSubmissionLike,
} from "./submissionHelpers";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log("defaultSubmissionTitle");
test("يرقّم التسليم الأول", () =>
  assert.equal(defaultSubmissionTitle(1), "التسليم رقم 1"));
test("يرقّم التسليم الثالث", () =>
  assert.equal(defaultSubmissionTitle(3), "التسليم رقم 3"));

console.log("resolveSubmissionTitle");
test("يأخذ عنوان الطالب ويزيل الفراغات", () =>
  assert.equal(resolveSubmissionTitle("  كتابة موضوع  ", 2), "كتابة موضوع"));
test("يعود للعنوان الافتراضي عند الفراغ", () =>
  assert.equal(resolveSubmissionTitle("   ", 2), "التسليم رقم 2"));
test("يعود للعنوان الافتراضي عند السلسلة الفارغة", () =>
  assert.equal(resolveSubmissionTitle("", 5), "التسليم رقم 5"));

console.log("hasReachedAttemptLimit");
test("لا حدّ قبل أي تعديل", () =>
  assert.equal(hasReachedAttemptLimit(0), false));
test("يبلغ الحدّ بعد تعديل واحد", () =>
  assert.equal(hasReachedAttemptLimit(1), true));

console.log("grantsPointsForEvaluation");
test("التسليم الأول للدرس يمنح نقاطاً", () =>
  assert.equal(grantsPointsForEvaluation(false, [], null), true));
test("التعديل (المراجعة) لا يمنح نقاطاً", () => {
  const subs: TopicSubmissionLike[] = [{ id: 1, ai_grade: 80 }];
  assert.equal(grantsPointsForEvaluation(true, subs, 1), false);
});
test("تقييم مسودة لم تُقيَّم من قبل يمنح نقاطاً", () => {
  const subs: TopicSubmissionLike[] = [{ id: 7, ai_grade: null }];
  assert.equal(grantsPointsForEvaluation(false, subs, 7), true);
});
test("تسليم جديد بينما يوجد تسليم مُقيَّم لا يمنح نقاطاً", () => {
  const subs: TopicSubmissionLike[] = [{ id: 1, ai_grade: 90 }];
  assert.equal(grantsPointsForEvaluation(false, subs, null), false);
});
test("تسليم جديد بينما كل الموجود مسودات يمنح نقاطاً", () => {
  const subs: TopicSubmissionLike[] = [{ id: 1, ai_grade: null }];
  assert.equal(grantsPointsForEvaluation(false, subs, null), true);
});

console.log(`\nكل الاختبارات نجحت: ${passed}/${passed}`);
