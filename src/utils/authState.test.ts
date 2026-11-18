// اختبارات وحدة لتصنيف أحداث تغيّر المصادقة.
// التشغيل:  npx tsx src/utils/authState.test.ts
import assert from "node:assert/strict";
import { classifyAuthChange } from "./authState";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log("classifyAuthChange");

// الحالة المسبّبة للمشكلة: فتح تبويب ثانٍ يُطلق تحديث رمز لنفس المستخدم.
// يجب أن يُصنَّف كتحديث خلفي حتى لا تُعاد تهيئة الواجهة وتُلغى العملية الجارية.
test("نفس المستخدم (تحديث رمز/تبويب) = تحديث خلفي", () =>
  assert.equal(classifyAuthChange("u1", "u1"), "background-refresh"));

test("دخول مستخدم جديد من لا جلسة = تغيّر مستخدم", () =>
  assert.equal(classifyAuthChange(null, "u1"), "user-changed"));

test("تبديل الحساب إلى مستخدم آخر = تغيّر مستخدم", () =>
  assert.equal(classifyAuthChange("u1", "u2"), "user-changed"));

test("خروج المستخدم = تسجيل خروج", () =>
  assert.equal(classifyAuthChange("u1", null), "signed-out"));

test("لا جلسة قبل ولا بعد = تسجيل خروج", () =>
  assert.equal(classifyAuthChange(null, null), "signed-out"));

console.log(`\nكل الاختبارات نجحت: ${passed}/${passed}`);
