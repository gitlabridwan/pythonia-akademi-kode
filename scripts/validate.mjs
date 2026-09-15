import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { missions } from "../dist/missions.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "dist/index.html",
  "dist/styles.css",
  "dist/game.css",
  "dist/app.js",
  "dist/world.js",
  "dist/missions.js",
  "dist/multiplayer.js",
  "dist/multiplayer-config.json",
  "dist/py-worker.mjs",
  "dist/favicon.svg",
  "dist/assets/pythonia-campus.png",
  "dist/.nojekyll",
  "firebase.rules.json",
  "server.mjs",
  "start.bat",
  "start.sh",
  "scripts/test-world.mjs",
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
for (const reference of ["./styles.css", "./game.css", "./app.js", "./favicon.svg"]) {
  if (!html.includes(reference)) errors.push(`Referensi ${reference} tidak ditemukan di index.html.`);
}

const gameCss = await readFile(resolve(root, "dist/game.css"), "utf8");
const appSource = await readFile(resolve(root, "dist/app.js"), "utf8");
for (const signature of ["max-width: 1180px", "pointer: coarse", "html.touch-input .touch-joystick", "html.touch-input .touch-interact"]) {
  if (!gameCss.includes(signature)) errors.push(`Dukungan kontrol sentuh tidak lengkap: ${signature}.`);
}
for (const signature of ['id="touchJoystick"', 'class="joystick-knob"']) {
  if (!html.includes(signature)) errors.push(`Elemen joystick analog tidak ditemukan: ${signature}.`);
}
const worldSource = await readFile(resolve(root, "dist/world.js"), "utf8");
for (const signature of ["this.touch", "setPointerCapture", "updateJoystick", "--joystick-x"]) {
  if (!worldSource.includes(signature)) errors.push(`Logika joystick analog tidak lengkap: ${signature}.`);
}
if (html.includes("data-move") || gameCss.includes("touch-dpad")) {
  errors.push("Kontrol D-pad lama masih ditemukan.");
}
if (gameCss.includes(".game-hud-actions button:first-child { display: none; }")) {
  errors.push("Tombol Tim masih disembunyikan pada layar kecil.");
}
if (!appSource.includes("navigator.maxTouchPoints") || !appSource.includes('classList.toggle("touch-input"')) {
  errors.push("Deteksi perangkat sentuh di app.js belum tersedia.");
}

if (errors.length) {
  console.error("Validasi gagal:\n" + errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Validasi berhasil: 12 misi, struktur deployment, dan JSON siap.");
