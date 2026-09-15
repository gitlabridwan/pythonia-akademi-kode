import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { missions } from "../dist/missions.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "dist/index.html",
  "dist/styles.css",
  "dist/app.js",
  "dist/missions.js",
  "dist/multiplayer.js",
  "dist/multiplayer-config.json",
  "dist/py-worker.mjs",
  "dist/favicon.svg",
  "dist/.nojekyll",
  "firebase.rules.json",
  ".github/workflows/deploy-pages.yml"
];

const errors = [];
for (const file of required) {
  try { await access(resolve(root, file)); }
  catch { errors.push(`File wajib tidak ditemukan: ${file}`); }
}

for (const file of ["dist/multiplayer-config.json", "firebase.rules.json", "package.json"]) {
  try { JSON.parse(await readFile(resolve(root, file), "utf8")); }
  catch (error) { errors.push(`${file} bukan JSON valid: ${error.message}`); }
}

if (missions.length !== 12) errors.push(`Jumlah misi harus 12, ditemukan ${missions.length}.`);
for (const grade of [10, 11, 12]) {
  const count = missions.filter((mission) => mission.grade === grade).length;
  if (count !== 4) errors.push(`Kelas ${grade} harus memiliki 4 misi, ditemukan ${count}.`);
}
const ids = new Set(missions.map((mission) => mission.id));
if (ids.size !== missions.length) errors.push("ID misi harus unik.");

const rules = await readFile(resolve(root, "firebase.rules.json"), "utf8");
if (rules.includes("numChildren")) errors.push("Rules masih memakai numChildren(), yang tidak didukung Realtime Database.");

const html = await readFile(resolve(root, "dist/index.html"), "utf8");
for (const reference of ["./styles.css", "./app.js", "./favicon.svg"]) {
  if (!html.includes(reference)) errors.push(`Referensi ${reference} tidak ditemukan di index.html.`);
}

if (errors.length) {
  console.error("Validasi gagal:\n" + errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Validasi berhasil: 12 misi, struktur deployment, dan JSON siap.");
