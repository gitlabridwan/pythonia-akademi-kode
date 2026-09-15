import { missions, gradeMeta, typeLabels } from "./missions.js";
import { MultiplayerClient } from "./multiplayer.js";
import { WorldEngine } from "./world.js";

const STORAGE_KEY = "pythonia-progress-v1";
const avatars = ["01", "02", "03", "04", "05", "06"];
const relayLabels = ["Analisis", "Rancangan", "Pengujian"];

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const esc = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[character]);

function freshState() {
  return {
    profile: { name: "", classLevel: "X", avatar: 0 },
    xp: 0,
    completed: [],
    attempts: {},
    correct: 0,
    total: 0,
    streak: 0,
    bestStreak: 0,
    startedAt: Date.now(),
    missionResults: {},
    focusMission: "x-01",
    worldPosition: { x: 1340, y: 1255, direction: "up", scene: "city" }
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return freshState();
    const base = freshState();
    return {
      ...base,
      ...saved,
      profile: { ...base.profile, ...(saved.profile || {}) },
      completed: Array.isArray(saved.completed) ? saved.completed.filter((id) => missions.some((mission) => mission.id === id)) : [],
      attempts: saved.attempts || {},
      missionResults: saved.missionResults || {}
    };
  } catch {
    return freshState();
  }
}

let state = loadState();
let activeMission = null;
let configuredForMultiplayer = false;
let currentRoom = null;
let world;
let gameStarted = false;
let pendingAfterProfile = null;
let missionSource = "dashboard";
let journalReturn = "menu";
let lastPositionSave = 0;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function missionUnlocked(mission) {
  const index = missions.findIndex((item) => item.id === mission.id);
  return index === 0 || state.completed.includes(missions[index - 1].id);
}

function nextMission() {
  return missions.find((mission) => !state.completed.includes(mission.id)) || missions.at(-1);
}

function levelName() {
  const count = state.completed.length;
  if (count >= 12) return "Arsitek Python";
  if (count >= 9) return "Engineer 4";
  if (count >= 5) return "Navigator 3";
  if (count >= 2) return "Perintis 2";
  return "Kadet 1";
}

function toast(message, type = "info") {
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  $("#toastRegion").append(item);
  requestAnimationFrame(() => item.classList.add("show"));
  setTimeout(() => {
    item.classList.remove("show");
    setTimeout(() => item.remove(), 250);
  }, 3600);
}

class PythonRunner {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.bootPromise = null;
    this.pending = new Map();
  }

  setStatus(status, label) {
    const chip = $("#engineChip");
    chip.dataset.status = status;
    $("span:last-child", chip).textContent = label;
  }

  boot() {
    if (this.ready) return Promise.resolve();
    if (this.bootPromise) return this.bootPromise;
    this.setStatus("loading", "Memuat Python…");
    this.bootPromise = new Promise((resolve, reject) => {
      this.worker = new Worker(new URL("./py-worker.mjs", import.meta.url), { type: "module" });
      const bootTimer = setTimeout(() => {
        this.setStatus("error", "Python gagal dimuat");
        reject(new Error("Mesin Python terlalu lama dimuat. Periksa koneksi internet lalu coba lagi."));
        this.reset();
      }, 60_000);

      this.worker.onmessage = (event) => {
        const data = event.data;
        if (data.type === "ready") {
          clearTimeout(bootTimer);
          this.ready = true;
          this.setStatus("ready", "Python siap");
          resolve();
          return;
        }
        if (data.type === "boot-error") {
          clearTimeout(bootTimer);
          this.setStatus("error", "Python gagal dimuat");
          reject(new Error(`Mesin Python gagal dimuat: ${data.error}`));
          return;
        }
        const pending = this.pending.get(data.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pending.delete(data.id);
          pending.resolve(data);
        }
      };
      this.worker.onerror = (event) => {
        clearTimeout(bootTimer);
        this.setStatus("error", "Python tidak tersedia");
        reject(new Error(event.message || "Worker Python tidak dapat dijalankan."));
      };
    });
    return this.bootPromise;
  }

  async run(code, mission) {
    await this.boot();
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("Program dihentikan setelah 8 detik. Periksa kemungkinan perulangan tanpa akhir."));
        this.reset();
        this.boot().catch(() => {});
      }, 8_000);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, code, checks: mission.checks || [], outputExpected: mission.outputExpected });
    });
  }

  reset() {
    this.worker?.terminate();
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Mesin Python dimulai ulang."));
    }
    this.pending.clear();
    this.worker = null;
    this.ready = false;
    this.bootPromise = null;
  }
}

const python = new PythonRunner();

const multiplayer = new MultiplayerClient({
  onConfiguration({ configured, error }) {
    configuredForMultiplayer = configured;
    $("#firebaseNote").textContent = configured
      ? "Firebase terhubung. Ruang kolaborasi siap digunakan."
      : error || "Multiplayer belum dikonfigurasi. Mode solo tetap dapat dimainkan.";
    $("#firebaseNote").classList.toggle("configured", configured);
  },
  onRoom(room) {
    const newlyConnected = Boolean(room) && !currentRoom;
    currentRoom = room;
    renderRoom(newlyConnected);
    world?.setOthers(room?.players || []);
  },
  onError(message) {
    toast(message, "error");
  }
});

world = new WorldEngine($("#worldCanvas"), {
  getMissionStatus(id) {
    const mission = missions.find((item) => item.id === id);
    return mission ? statusFor(mission) : "locked";
  },
  onNear(item) {
    const prompt = $("#nearPrompt");
    prompt.hidden = !item;
    if (!item) return;
    const mission = item.type === "site" ? missions.find((entry) => entry.id === item.missionId) : null;
    const locked = mission && !missionUnlocked(mission);
    $("#nearPromptLabel").textContent = locked ? `${item.label} · terkunci` : item.label;
  },
  onScene({ label }) {
    toast(`Memasuki ${label}.`, "info");
  },
  onMission(id, site) {
    const mission = missions.find((item) => item.id === id);
    if (!missionUnlocked(mission)) {
      const previous = missions[missions.findIndex((item) => item.id === id) - 1];
      toast(`Terminal terkunci. Selesaikan “${previous.title}” terlebih dahulu.`, "error");
      return;
    }
    openMission(id, "game");
  },
  onNpc(npc) {
    openNpc(npc);
  },
  onMove(position) {
    state.worldPosition = position;
    if (Date.now() - lastPositionSave > 1000) {
      lastPositionSave = Date.now();
      saveState();
    }
    multiplayer.syncPosition(position).catch(() => {});
  }
});

function renderAll() {
  renderIdentity();
  renderStats();
  renderMissionMap();
  renderMissionGrid();
  renderProgress();
  renderGameHud();
}

function renderIdentity() {
  const name = state.profile.name || "Kadet Baru";
  $("#profileSideName").textContent = name;
  $("#profileSideClass").textContent = `SMA · Kelas ${state.profile.classLevel}`;
  $("#welcomeTitle").textContent = `Selamat datang, ${name}`;
  $("#xpValue").textContent = state.xp;
  const avatarButton = $("#profileButton");
  avatarButton.className = `avatar avatar-${state.profile.avatar}`;
  $("span", avatarButton).textContent = avatars[state.profile.avatar] || "01";
  world?.setProfile(state.profile);
}

function renderStats() {
  $("#completedStat").textContent = `${state.completed.length} / ${missions.length}`;
  $("#accuracyStat").textContent = state.total ? `${Math.round((state.correct / state.total) * 100)}%` : "—";
  $("#streakStat").textContent = `${state.bestStreak} misi`;
  $("#levelStat").textContent = levelName();
  const next = nextMission();
  $("#continueButton").innerHTML = state.completed.length === missions.length
    ? "Ulangi misi final <span>→</span>"
    : `Lanjutkan misi ${String(next.number).padStart(2, "0")} <span>→</span>`;
}

function renderGameHud() {
  const name = state.profile.name || "Kadet";
  const avatar = $("#gameAvatar");
  avatar.className = `avatar avatar-${state.profile.avatar}`;
  avatar.textContent = avatars[state.profile.avatar] || "01";
  $("#gamePlayerName").textContent = name;
  $("#gamePlayerClass").textContent = `Kelas ${state.profile.classLevel}`;
  $("#gameXpValue").textContent = state.xp;
  const next = nextMission();
  $("#gameObjective").textContent = state.completed.length === missions.length ? "Pythonia pulih — jelajahi kembali" : `Temukan ${next.title}`;
  $("#gameObjectiveProgress").textContent = `${state.completed.length} / ${missions.length} selesai`;
}

function statusFor(mission) {
  if (state.completed.includes(mission.id)) return "done";
  return missionUnlocked(mission) ? "current" : "locked";
}

function renderMissionMap() {
  $("#missionMap").innerHTML = [10, 11, 12].map((grade) => {
    const meta = gradeMeta[grade];
    const gradeMissions = missions.filter((mission) => mission.grade === grade);
    const done = gradeMissions.filter((mission) => state.completed.includes(mission.id)).length;
    return `
      <section class="world-track theme-${meta.theme}">
        <div class="world-copy">
          <span class="world-index">TINGKAT ${meta.roman}</span>
          <h4>${meta.name}</h4>
          <p>${meta.focus}</p>
          <strong>${done}/${gradeMissions.length}</strong>
        </div>
        <div class="mission-nodes">
          ${gradeMissions.map((mission) => {
            const status = statusFor(mission);
            return `<button class="mission-node ${status}" data-mission="${mission.id}" ${status === "locked" ? "disabled" : ""} aria-label="Misi ${mission.number}: ${mission.title}">
              <span class="node-number">${String(mission.number).padStart(2, "0")}</span>
              <span class="node-icon">${mission.icon}</span>
              <span class="node-copy"><b>${mission.title}</b><small>${mission.concept}</small></span>
              <span class="node-state">${status === "done" ? "✓" : status === "locked" ? "⌑" : "→"}</span>
            </button>`;
          }).join("")}
        </div>
      </section>`;
  }).join("");
}

function renderMissionGrid(filter = $("#missionFilters .active")?.dataset.filter || "all") {
  const visible = missions.filter((mission) => filter === "all" || String(mission.grade) === filter || (filter === "code" && ["code", "debug"].includes(mission.type)));
  $("#missionGrid").innerHTML = visible.map((mission) => {
    const status = statusFor(mission);
    const meta = gradeMeta[mission.grade];
    return `<article class="mission-card ${status} theme-${meta.theme}">
      <div class="mission-card-top"><span class="mission-symbol">${mission.icon}</span><span class="grade-pill grade-${mission.grade}">Kelas ${meta.roman}</span></div>
      <small>MISI ${String(mission.number).padStart(2, "0")} · ${typeLabels[mission.type]}</small>
      <h3>${mission.title}</h3><p>${mission.subtitle}</p>
      <div class="mission-card-foot"><span>⚡ ${mission.xp} XP</span><button data-mission="${mission.id}" ${status === "locked" ? "disabled" : ""}>${status === "done" ? "Ulangi" : status === "locked" ? "Terkunci" : "Mulai"} →</button></div>
    </article>`;
  }).join("");
}

function renderProgress() {
  const dashboard = $("#progressDashboard");
  const accuracy = state.total ? Math.round((state.correct / state.total) * 100) : 0;
  const totalXp = missions.reduce((sum, mission) => sum + mission.xp, 0);
  const grades = [10, 11, 12].map((grade) => {
    const list = missions.filter((mission) => mission.grade === grade);
    const done = list.filter((mission) => state.completed.includes(mission.id)).length;
    return { grade, done, total: list.length, percent: Math.round(done / list.length * 100) };
  });
  const review = missions.filter((mission) => (state.attempts[mission.id] || 0) > 1 && !state.completed.includes(mission.id));
  dashboard.innerHTML = `
    <div class="progress-hero">
      <div class="rank-ring" style="--progress:${state.completed.length / missions.length * 360}deg"><div><strong>${state.completed.length}</strong><small>/ 12 MISI</small></div></div>
      <div><span class="kicker">STATUS AKADEMI</span><h3>${levelName()}</h3><p>${state.completed.length === 12 ? "Seluruh jaringan Pythonia telah pulih. Kamu siap merancang proyekmu sendiri." : `${12 - state.completed.length} misi lagi untuk menuntaskan ekspedisi.`}</p></div>
      <div class="progress-quick"><span><small>XP TERKUMPUL</small><b>${state.xp} / ${totalXp}</b></span><span><small>AKURASI</small><b>${state.total ? `${accuracy}%` : "Belum ada data"}</b></span></div>
    </div>
    <div class="grade-progress-grid">
      ${grades.map(({ grade, done, total, percent }) => `<article class="theme-${gradeMeta[grade].theme}"><span>KELAS ${gradeMeta[grade].roman}</span><h4>${gradeMeta[grade].focus}</h4><div class="progress-bar"><i style="width:${percent}%"></i></div><p><b>${done}/${total}</b> misi selesai <strong>${percent}%</strong></p></article>`).join("")}
    </div>
    <div class="progress-detail-grid">
      <article><span class="kicker">JEJAK AKTIVITAS</span><h3>Misi yang dikuasai</h3><div class="achievement-list">${state.completed.length ? state.completed.map((id) => { const mission = missions.find((item) => item.id === id); return `<button data-mission="${id}"><span>${mission.icon}</span><div><b>${mission.title}</b><small>${mission.concept}</small></div><em>✓</em></button>`; }).join("") : "<p>Selesaikan misi pertama untuk membuka jejak aktivitas.</p>"}</div></article>
      <article><span class="kicker">REKOMENDASI</span><h3>Fokus berikutnya</h3>${review.length ? `<p>Ulangi konsep yang masih memerlukan beberapa percobaan:</p>${review.map((mission) => `<button class="review-item" data-mission="${mission.id}">${mission.title} <span>→</span></button>`).join("")}` : `<div class="recommendation"><span>◎</span><p>${state.completed.length ? "Lanjutkan misi berikutnya agar streak belajarmu tetap terjaga." : "Mulai dari Gerbang Algoritma untuk memetakan kemampuan awalmu."}</p><button data-mission="${nextMission().id}">Buka misi →</button></div>`}</article>
    </div>`;
}

function missionShell(mission, body) {
  const meta = gradeMeta[mission.grade];
  return `<div class="mission-shell theme-${meta.theme}">
    <button class="modal-close" type="button" data-close-mission aria-label="Tutup">×</button>
    <aside class="mission-brief">
      <div class="mission-seal">${mission.icon}</div><span>KELAS ${meta.roman} · MISI ${String(mission.number).padStart(2, "0")}</span>
      <h2>${mission.title}</h2><p>${mission.subtitle}</p>
      <div class="brief-data"><span><small>AKTIVITAS</small><b>${typeLabels[mission.type]}</b></span><span><small>IMBALAN</small><b>⚡ ${mission.xp} XP</b></span></div>
      <div class="lesson-card"><small>INTEL KONSEP</small><p>${mission.lesson}</p></div>
    </aside>
    <main class="mission-work"><div class="mission-prompt"><span>TANTANGAN</span><h3>${mission.prompt}</h3></div>${body}</main>
  </div>`;
}

function openMission(id, source = "dashboard") {
  const mission = missions.find((item) => item.id === id);
  if (!mission || !missionUnlocked(mission)) return;
  missionSource = source;
  if (source === "game") world.pause();
  activeMission = mission;
  state.focusMission = mission.id;
  saveState();
  multiplayer.syncProgress(state).catch(() => {});

  let body = "";
  if (mission.type === "quiz") {
    body = `<form class="challenge-form quiz-form" onsubmit="return false"><div class="option-list">${mission.options.map((option, index) => `<label><input type="radio" name="answer" value="${index}" /><span><i>${String.fromCharCode(65 + index)}</i>${esc(option)}</span></label>`).join("")}</div>${challengeFooter(mission, "Periksa jawaban")}</form>`;
  } else if (mission.type === "arrange") {
    const shuffled = mission.blocks.map((block, index) => ({ block, index })).sort(() => Math.random() - 0.5);
    body = `<div class="challenge-form arrange-form" data-order="">
      <div class="arrange-columns"><section><small>BLOK TERSEDIA</small><div class="code-bank">${shuffled.map(({ block, index }) => `<button type="button" data-block="${index}"><b>＋</b><code>${esc(block)}</code></button>`).join("")}</div></section><section><small>ALGORITMA KAMU</small><div class="solution-zone"><p>Pilih blok dari panel kiri.</p></div><button type="button" class="text-button" data-reset-order>↺ Susun ulang</button></section></div>
      ${challengeFooter(mission, "Uji urutan")}</div>`;
  } else {
    body = `<div class="challenge-form code-form"><div class="editor-shell"><div class="editor-bar"><span><i></i><i></i><i></i></span><b>solusi.py</b><small>Python 3 · browser</small></div><div class="editor-body"><pre class="line-numbers" aria-hidden="true"></pre><textarea id="codeEditor" spellcheck="false" aria-label="Editor kode Python">${esc(mission.starter)}</textarea></div></div><div class="console"><div class="console-head"><span>OUTPUT & PENGUJIAN</span><small>Belum dijalankan</small></div><div class="console-output"><p>Tekan “Jalankan kode” untuk menguji solusi.</p></div></div>${challengeFooter(mission, "Jalankan kode")}</div>`;
  }
  $("#missionContent").innerHTML = missionShell(mission, body);
  const dialog = $("#missionDialog");
  dialog.showModal();
  bindMissionActions(mission);
  if (["code", "debug"].includes(mission.type)) updateLineNumbers();
}

function challengeFooter(mission, action) {
  return `<div class="challenge-feedback" hidden></div><div class="challenge-actions"><button type="button" class="hint-button" data-hint>Petunjuk</button><button type="button" class="primary-button" data-submit-challenge>${action} <span>→</span></button></div>`;
}

function bindMissionActions(mission) {
  const root = $("#missionContent");
  $("[data-close-mission]", root).addEventListener("click", closeMission);
  $("[data-hint]", root).addEventListener("click", () => toast(mission.hint));

  if (mission.type === "arrange") {
    const form = $(".arrange-form", root);
    const chosen = [];
    const renderOrder = () => {
      form.dataset.order = chosen.join(",");
      $$("[data-block]", form).forEach((button) => { button.disabled = chosen.includes(Number(button.dataset.block)); });
      $(".solution-zone", form).innerHTML = chosen.length
        ? chosen.map((index, position) => `<button type="button" data-remove-position="${position}"><span>${position + 1}</span><code>${esc(mission.blocks[index])}</code><b>×</b></button>`).join("")
        : "<p>Pilih blok dari panel kiri.</p>";
      $$('[data-remove-position]', form).forEach((button) => button.addEventListener("click", () => { chosen.splice(Number(button.dataset.removePosition), 1); renderOrder(); }));
    };
    $$("[data-block]", form).forEach((button) => button.addEventListener("click", () => { chosen.push(Number(button.dataset.block)); renderOrder(); }));
    $("[data-reset-order]", form).addEventListener("click", () => { chosen.splice(0); renderOrder(); });
  }

  const editor = $("#codeEditor", root);
  editor?.addEventListener("input", updateLineNumbers);
  editor?.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = editor.selectionStart;
      editor.setRangeText("    ", start, editor.selectionEnd, "end");
      updateLineNumbers();
    }
  });
  $("[data-submit-challenge]", root).addEventListener("click", () => submitChallenge(mission));
}

function updateLineNumbers() {
  const editor = $("#codeEditor");
  const numbers = $(".line-numbers");
  if (!editor || !numbers) return;
  const count = editor.value.split("\n").length;
  numbers.textContent = Array.from({ length: count }, (_, index) => index + 1).join("\n");
  numbers.scrollTop = editor.scrollTop;
  editor.onscroll = () => { numbers.scrollTop = editor.scrollTop; };
}

async function submitChallenge(mission) {
  const root = $("#missionContent");
  const button = $("[data-submit-challenge]", root);
  let passed = false;
  let details = "";
  button.disabled = true;

  try {
    if (mission.type === "quiz") {
      const chosen = Number($("input[name=answer]:checked", root)?.value);
      if (!Number.isInteger(chosen)) throw new Error("Pilih salah satu jawaban terlebih dahulu.");
      passed = chosen === mission.answer;
      details = passed ? mission.explanation : `Belum tepat. ${mission.hint}`;
    } else if (mission.type === "arrange") {
      const orderText = $(".arrange-form", root).dataset.order;
      const order = orderText ? orderText.split(",").map(Number) : [];
      passed = order.length === mission.blocks.length && order.every((value, index) => value === index);
      details = passed ? "Urutan instruksi benar dan alurnya konsisten." : "Urutan belum tepat. Periksa kembali dependensi antarbaris dan indentasinya.";
    } else {
      button.innerHTML = "Menjalankan…";
      const result = await python.run($("#codeEditor", root).value, mission);
      passed = result.ok;
      details = renderCodeResult(result);
      const consoleOutput = $(".console-output", root);
      consoleOutput.innerHTML = details;
      $(".console-head small", root).textContent = passed ? "Semua pengujian lolos" : "Perlu diperbaiki";
      $(".console", root).classList.toggle("passed", passed);
      $(".console", root).classList.toggle("failed", !passed);
    }

    recordAttempt(mission, passed);
    showFeedback(mission, passed, details);
  } catch (error) {
    showFeedback(mission, false, error.message, false);
  } finally {
    button.disabled = false;
    button.innerHTML = ["code", "debug"].includes(mission.type) ? "Jalankan kode <span>→</span>" : mission.type === "arrange" ? "Uji urutan <span>→</span>" : "Periksa jawaban <span>→</span>";
  }
}

function renderCodeResult(result) {
  if (result.error) return `<pre>${esc(result.error)}</pre>${result.output ? `<small>OUTPUT</small><pre>${esc(result.output)}</pre>` : ""}`;
  const tests = [...(result.checks || [])];
  if (result.outputCheck) tests.push({ label: "Output sesuai", ...result.outputCheck });
  return `${result.output ? `<small>OUTPUT PROGRAM</small><pre>${esc(result.output)}</pre>` : "<small>PROGRAM TIDAK MENCETAK OUTPUT</small>"}<div class="test-list">${tests.map((test) => `<div class="${test.passed ? "pass" : "fail"}"><span>${test.passed ? "✓" : "×"}</span><p><b>${esc(test.label)}</b>${test.passed ? "" : `<small>Diharapkan ${esc(JSON.stringify(test.expected))}, diperoleh ${esc(JSON.stringify(test.actual))}</small>`}</p></div>`).join("")}</div>`;
}

function recordAttempt(mission, passed) {
  state.attempts[mission.id] = (state.attempts[mission.id] || 0) + 1;
  state.total += 1;
  if (passed) {
    state.correct += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    if (!state.completed.includes(mission.id)) {
      state.completed.push(mission.id);
      state.xp += mission.xp;
      state.missionResults[mission.id] = { completedAt: Date.now(), attempts: state.attempts[mission.id], xp: mission.xp };
    }
  } else {
    state.streak = 0;
  }
  saveState();
  renderAll();
  multiplayer.syncProgress(state).catch(() => {});
}

function showFeedback(mission, passed, details, countAsAttempt = true) {
  const feedback = $(".challenge-feedback", $("#missionContent"));
  feedback.hidden = false;
  feedback.className = `challenge-feedback ${passed ? "success" : "error"}`;
  const successAction = missionSource === "game" ? "Kembali menjelajah" : state.completed.length === missions.length ? "Lihat progres akhir" : "Lanjut ke misi berikutnya";
  feedback.innerHTML = `<span>${passed ? "✓" : "!"}</span><div><b>${passed ? "Misi berhasil!" : countAsAttempt ? "Belum berhasil" : "Perlu diperhatikan"}</b><div class="feedback-copy">${details}</div>${passed ? `<button type="button" data-next-mission>${successAction} →</button>` : ""}</div>`;
  $("[data-next-mission]", feedback)?.addEventListener("click", () => {
    if (missionSource === "game") {
      closeMission();
      toast(state.completed.length === missions.length ? "Seluruh pusat ilmu telah dipulihkan!" : "Misi berikutnya telah terbuka di kota.", "success");
    } else {
      $("#missionDialog").close();
      const index = missions.findIndex((item) => item.id === mission.id);
      if (index < missions.length - 1) openMission(missions[index + 1].id);
      else navigate("progress");
    }
  });
}

function closeMission() {
  $("#missionDialog").close();
  if (missionSource === "game") world.resume();
}

function enterWorld(mode = "solo") {
  gameStarted = true;
  journalReturn = "game";
  $("#mainMenu").hidden = true;
  $("#app").hidden = true;
  $("#gameView").hidden = false;
  $("#roomPanel").classList.remove("open");
  world.setProfile(state.profile);
  world.setPosition(state.worldPosition);
  world.setOthers(currentRoom?.players || []);
  world.start();
  renderGameHud();
  if (mode === "multiplayer" && currentRoom) toast(`Menjelajah bersama ruang ${currentRoom.code}.`, "success");
}

function showMainMenu() {
  journalReturn = "menu";
  $("#gameView").hidden = true;
  $("#app").hidden = true;
  $("#mainMenu").hidden = false;
  $("#roomPanel").classList.remove("open");
  world.stop();
}

function openJournal(screen = "map", returnTo = null) {
  journalReturn = returnTo || (!$("#gameView").hidden ? "game" : "menu");
  $("#mainMenu").hidden = true;
  $("#gameView").hidden = true;
  $("#app").hidden = false;
  world.pause();
  navigate(screen);
}

function closeJournal() {
  $("#app").hidden = true;
  if (journalReturn === "game" && gameStarted) {
    $("#gameView").hidden = false;
    world.start();
  } else {
    $("#mainMenu").hidden = false;
    world.stop();
  }
}

function openNpc(npc) {
  world.pause();
  const portrait = $("#npcPortrait");
  portrait.className = `npc-portrait avatar avatar-${npc.avatar}`;
  portrait.textContent = avatars[npc.avatar] || "01";
  $("#npcName").textContent = npc.name;
  $("#npcMessage").textContent = npc.message;
  $("#npcDialog").showModal();
}

function closeNpc() {
  $("#npcDialog").close();
  world.resume();
}

function navigate(screen) {
  $$(".screen").forEach((section) => section.classList.toggle("active", section.id === `screen-${screen}`));
  $$("[data-screen]").forEach((button) => button.classList.toggle("active", button.dataset.screen === screen));
  const labels = { map: "PETA MISI", missions: "DAFTAR MISI", progress: "PROGRES", help: "PANDUAN" };
  $("#screenLabel").textContent = labels[screen];
  document.body.classList.remove("menu-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openProfile() {
  $("#profileName").value = state.profile.name;
  $("#profileClass").value = state.profile.classLevel;
  $$("#avatarPicker button").forEach((button) => button.classList.toggle("selected", Number(button.dataset.avatar) === Number(state.profile.avatar)));
  $("#profileDialog").showModal();
}

function openRoomDialog() {
  if (!$("#gameView").hidden) world.pause();
  $("#roomDialog").showModal();
}

function showRoomControls() {
  if (currentRoom) $("#roomPanel").classList.add("open");
  else openRoomDialog();
}

function renderRoom(openOnConnect = false) {
  const panel = $("#roomPanel");
  if (!currentRoom) panel.classList.remove("open");
  else if (openOnConnect) panel.classList.add("open");
  $("#roomSideStatus").textContent = currentRoom ? `Ruang ${currentRoom.code}` : "Belum terhubung";
  if (!currentRoom) return;
  $("#roomCodeLabel").textContent = currentRoom.code;
  $("#roomStateBadge").textContent = currentRoom.status === "playing" ? "SESI BERJALAN" : currentRoom.status === "ended" ? "SESI SELESAI" : "LOBBY";
  $("#roomStateBadge").dataset.state = currentRoom.status;
  $("#playerCount").textContent = `${currentRoom.players.length}/8`;
  $("#playerList").innerHTML = currentRoom.players.map((player) => `<article class="${player.isSelf ? "self" : ""}"><span class="avatar avatar-${player.avatar}">${avatars[player.avatar] || "01"}</span><div><b>${esc(player.name)}${player.isSelf ? " (kamu)" : ""}</b><small>Kelas ${esc(player.classLevel)} · ${player.xp} XP</small></div>${player.isHost ? "<em>HOST</em>" : player.ready ? "<em class=ready>SIAP</em>" : ""}<i class="online-dot ${player.online ? "" : "offline"}"></i></article>`).join("");
  const self = currentRoom.players.find((player) => player.isSelf);
  $("#readyButton").textContent = self?.ready ? "Batalkan siap" : "Saya siap";
  $("#startRoomButton").hidden = !currentRoom.isHost;
  $("#lobbyControls").hidden = currentRoom.status !== "lobby";
  $("#relayCount").textContent = `${currentRoom.relay.filter(Boolean).length}/3`;
  $("#relaySteps").innerHTML = relayLabels.map((label, index) => {
    const step = currentRoom.relay[index];
    const enabled = currentRoom.status === "playing" && !step && (index === 0 || currentRoom.relay[index - 1]);
    return `<button data-relay="${index}" class="${step ? "complete" : ""}" ${enabled ? "" : "disabled"}><span>${step ? "✓" : index + 1}</span><div><b>${label}</b><small>${step ? `oleh ${esc(step.name)}` : enabled ? "Siap diaktifkan" : "Menunggu tahap sebelumnya"}</small></div></button>`;
  }).join("");
  $("#chatMessages").innerHTML = currentRoom.chat.length ? currentRoom.chat.map((message) => `<div class="${message.player === multiplayer.auth?.uid ? "mine" : ""}"><b>${esc(message.name)}</b><p>${esc(message.message)}</p><small>${new Date(message.created).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</small></div>`).join("") : "<p class=chat-empty>Belum ada pesan. Sapa timmu!</p>";
  $("#chatMessages").scrollTop = $("#chatMessages").scrollHeight;
}

async function roomAction(action, busyButton) {
  if (!configuredForMultiplayer) {
    toast("Isi multiplayer-config.json dan konfigurasi Firebase terlebih dahulu.", "error");
    return;
  }
  busyButton && (busyButton.disabled = true);
  try {
    await action();
  } catch (error) {
    toast(error.message, "error");
  } finally {
    busyButton && (busyButton.disabled = false);
  }
}

function exportCsv() {
  const rows = [["Misi", "Kelas", "Konsep", "Status", "Percobaan", "XP"]];
  missions.forEach((mission) => rows.push([
    `${String(mission.number).padStart(2, "0")} - ${mission.title}`,
    gradeMeta[mission.grade].roman,
    mission.concept,
    state.completed.includes(mission.id) ? "Selesai" : missionUnlocked(mission) ? "Terbuka" : "Terkunci",
    state.attempts[mission.id] || 0,
    state.completed.includes(mission.id) ? mission.xp : 0
  ]));
  rows.push([], ["Nama", state.profile.name], ["Total XP", state.xp], ["Akurasi", state.total ? `${Math.round(state.correct / state.total * 100)}%` : "-"]);
  const safeCsvCell = (cell) => {
    let value = String(cell ?? "");
    if (/^[=+\-@]/.test(value)) value = `'${value}`;
    return `"${value.replaceAll('"', '""')}"`;
  };
  const csv = rows.map((row) => row.map(safeCsvCell).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const fileName = (state.profile.name || "kadet").toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, "-").replace(/^-|-$/g, "") || "kadet";
  link.download = `laporan-pythonia-${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function bindGlobalActions() {
  $$("[data-screen]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.screen)));
  document.addEventListener("click", (event) => {
    const missionButton = event.target.closest("[data-mission]");
    if (missionButton && !missionButton.disabled) openMission(missionButton.dataset.mission);
  });
  $("#continueButton").addEventListener("click", () => openMission(nextMission().id));
  $$(".floating-island").forEach((button) => button.addEventListener("click", () => {
    navigate("missions");
    const filter = button.dataset.grade;
    $$("#missionFilters button").forEach((item) => item.classList.toggle("active", item.dataset.filter === filter));
    renderMissionGrid(filter);
  }));
  $$("#missionFilters button").forEach((button) => button.addEventListener("click", () => {
    $$("#missionFilters button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderMissionGrid(button.dataset.filter);
  }));
  $("#menuSoloButton").addEventListener("click", () => {
    if (!state.profile.name) {
      pendingAfterProfile = "solo";
      openProfile();
    } else enterWorld("solo");
  });
  $("#menuMultiplayerButton").addEventListener("click", () => {
    if (!state.profile.name) {
      pendingAfterProfile = "room";
      openProfile();
    } else if (currentRoom) {
      enterWorld("multiplayer");
      $("#roomPanel").classList.add("open");
    } else openRoomDialog();
  });
  $("#menuGuideButton").addEventListener("click", () => openJournal("help", "menu"));
  $("#gameJournalButton").addEventListener("click", () => openJournal("map", "game"));
  $("#gameMenuButton").addEventListener("click", showMainMenu);
  $("#gameRoomButton").addEventListener("click", showRoomControls);
  $("#backToWorldButton").addEventListener("click", closeJournal);
  $("#profileButton").addEventListener("click", openProfile);
  $("[data-close-profile]").addEventListener("click", () => {
    pendingAfterProfile = null;
    $("#profileDialog").close();
  });
  $("#mobileMenuButton").addEventListener("click", () => document.body.classList.toggle("menu-open"));
  $("#exportButton").addEventListener("click", exportCsv);

  $("#avatarPicker").innerHTML = avatars.map((avatar, index) => `<button type="button" class="avatar avatar-${index}" data-avatar="${index}"><span>${avatar}</span></button>`).join("");
  $$("#avatarPicker button").forEach((button) => button.addEventListener("click", () => {
    $$("#avatarPicker button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    state.profile.avatar = Number(button.dataset.avatar);
  }));
  $("#profileForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#profileName").value.trim();
    if (!name) return;
    state.profile.name = name.slice(0, 24);
    state.profile.classLevel = $("#profileClass").value;
    saveState();
    renderAll();
    $("#profileDialog").close();
    toast(`Profil ${state.profile.name} tersimpan.`, "success");
    const destination = pendingAfterProfile;
    pendingAfterProfile = null;
    if (destination === "solo") enterWorld("solo");
    if (destination === "room") openRoomDialog();
  });

  ["#openRoomButton", "#heroRoomButton"].forEach((id) => $(id).addEventListener("click", showRoomControls));
  $("#closeRoomDialog").addEventListener("click", () => $("#roomDialog").close());
  $("#roomDialog").addEventListener("close", () => {
    if (!$("#gameView").hidden) world.resume();
  });
  $("#createRoomButton").addEventListener("click", (event) => roomAction(async () => {
    if (!state.profile.name) { $("#roomDialog").close(); openProfile(); throw new Error("Isi profil sebelum membuat ruang."); }
    const code = await multiplayer.createRoom(state.profile, state);
    $("#roomDialog").close();
    toast(`Ruang ${code} berhasil dibuat.`, "success");
    enterWorld("multiplayer");
    $("#roomPanel").classList.add("open");
  }, event.currentTarget));
  $("#joinRoomForm").addEventListener("submit", (event) => {
    event.preventDefault();
    roomAction(async () => {
      if (!state.profile.name) { $("#roomDialog").close(); openProfile(); throw new Error("Isi profil sebelum bergabung."); }
      const code = await multiplayer.joinRoom($("#joinCodeInput").value, state.profile, state);
      $("#roomDialog").close();
      toast(`Terhubung ke ruang ${code}.`, "success");
      enterWorld("multiplayer");
      $("#roomPanel").classList.add("open");
    }, $("#joinRoomForm button"));
  });
  $("#closeRoomPanel").addEventListener("click", () => $("#roomPanel").classList.remove("open"));
  $("#readyButton").addEventListener("click", (event) => {
    const self = currentRoom?.players.find((player) => player.isSelf);
    roomAction(() => multiplayer.setReady(!self?.ready), event.currentTarget);
  });
  $("#startRoomButton").addEventListener("click", (event) => roomAction(() => multiplayer.startSession(), event.currentTarget));
  $("#relaySteps").addEventListener("click", (event) => {
    const button = event.target.closest("[data-relay]");
    if (button) roomAction(() => multiplayer.claimRelay(Number(button.dataset.relay)), button);
  });
  $("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    const value = input.value;
    input.value = "";
    roomAction(() => multiplayer.sendChat(value));
  });
  $("#leaveRoomButton").addEventListener("click", (event) => roomAction(async () => {
    await multiplayer.leave();
    toast("Kamu telah keluar dari ruang.");
  }, event.currentTarget));
  $("#closeNpcDialog").addEventListener("click", closeNpc);
  $("#npcContinueButton").addEventListener("click", closeNpc);
  $("#npcDialog").addEventListener("close", () => world.resume());
  $("#missionDialog").addEventListener("close", () => {
    if (missionSource === "game") world.resume();
  });
}

async function start() {
  const touchQuery = window.matchMedia?.("(hover: none), (pointer: coarse)");
  const updateInputMode = () => {
    const touchInput = Number(navigator.maxTouchPoints || 0) > 0 || Boolean(touchQuery?.matches);
    document.documentElement.classList.toggle("touch-input", touchInput);
  };
  updateInputMode();
  touchQuery?.addEventListener?.("change", updateInputMode);
  bindGlobalActions();
  renderAll();
  await multiplayer.initialise();
  $("#bootScreen").classList.add("leaving");
  $("#mainMenu").hidden = false;
  setTimeout(() => $("#bootScreen").remove(), 450);
  if (navigator.onLine) python.boot().catch((error) => toast(error.message, "error"));
  else python.setStatus("error", "Offline · kuis tetap aktif");
}

start();
