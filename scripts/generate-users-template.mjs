import * as XLSX from "xlsx";
import { fileURLToPath } from "url";
import path from "path";
import { writeFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const headers = ["email", "role", "password", "full_name", "grade"];

const exampleRows = [
  ["student1@example.com", "student", "Pass123!", "محمد أحمد", "الصف التاسع"],
  ["teacher1@example.com", "teacher", "Pass123!", "خالد سعيد", ""],
  ["", "", "", "", ""],
];

const aoa = [headers, ...exampleRows];

const ws = XLSX.utils.aoa_to_sheet(aoa);

ws["!cols"] = [
  { wch: 30 },
  { wch: 10 },
  { wch: 16 },
  { wch: 20 },
  { wch: 14 },
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "users");

const outPath = path.join(__dirname, "..", "public", "users-template.xlsx");
const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync(outPath, buffer);
console.log("Template written to", outPath);
