const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

const CITY = { width: 2680, height: 1960 };
const INTERIOR = { width: 1280, height: 820 };
const DIRECTIONS = new Map([
  ["arrowup", "up"], ["w", "up"], ["arrowdown", "down"], ["s", "down"],
  ["arrowleft", "left"], ["a", "left"], ["arrowright", "right"], ["d", "right"]
]);

const BUILDINGS = [
  { id: "algorithms", number: 1, x: 170, y: 170, w: 520, h: 310, label: "Akademi Algoritma", short: "ALGORITMA", color: "#df735f", roof: "#b94d4b", accent: "#ffd19a", missions: ["x-01", "x-02"] },
  { id: "control", number: 2, x: 1080, y: 155, w: 520, h: 325, label: "Menara Kendali", short: "KENDALI", color: "#e5a347", roof: "#bd742b", accent: "#ffe9a6", missions: ["x-03", "x-04"] },
  { id: "data", number: 3, x: 1990, y: 170, w: 520, h: 310, label: "Perpustakaan Data", short: "DATA", color: "#4aa99f", roof: "#237b78", accent: "#a6f1df", missions: ["xi-05"] },
  { id: "functions", number: 4, x: 110, y: 765, w: 520, h: 305, label: "Bengkel Fungsi", short: "FUNGSI", color: "#8c79c8", roof: "#6653a4", accent: "#d8c9ff", missions: ["xi-06"] },
  { id: "dictionary", number: 5, x: 2050, y: 765, w: 520, h: 305, label: "Brankas Dictionary", short: "DICTIONARY", color: "#3f93ad", roof: "#27677d", accent: "#b5edff", missions: ["xi-07"] },
  { id: "debug", number: 6, x: 90, y: 1390, w: 490, h: 310, label: "Klinik Debugging", short: "DEBUG", color: "#8ba85b", roof: "#647d3b", accent: "#e4f7ae", missions: ["xi-08"] },
  { id: "robotics", number: 7, x: 730, y: 1390, w: 490, h: 310, label: "Laboratorium Robot", short: "ROBOTIKA", color: "#9b70c8", roof: "#7045a2", accent: "#ecc8ff", missions: ["xii-09", "xii-10"] },
  { id: "pipeline", number: 8, x: 1460, y: 1390, w: 490, h: 310, label: "Stasiun Pipeline", short: "PIPELINE", color: "#dda04a", roof: "#a86c28", accent: "#ffe0a1", missions: ["xii-11"] },
  { id: "core", number: 9, x: 2100, y: 1390, w: 490, h: 310, label: "Portal Inti Pythonia", short: "INTI PYTHONIA", color: "#537ebd", roof: "#365999", accent: "#bcd9ff", missions: ["xii-12"] }
];

const CITY_NPCS = [
  { id: "prof-py", x: 1475, y: 1120, name: "Prof. Py", avatar: 4, message: "Selamat datang di Kota Pythonia. Mulailah dari Akademi Algoritma, lalu ikuti jalan dan nomor gedung sampai Portal Inti." },
  { id: "naya", x: 1040, y: 1090, name: "Naya", avatar: 2, message: "Setiap gedung memiliki ruang belajar sendiri. Dekati pintu, tekan E, lalu temukan terminal misi di dalamnya." },
  { id: "bima", x: 820, y: 600, name: "Teknisi Bima", avatar: 1, message: "Kamera akan mengikuti langkahmu. Pilih jalan yang terbuka karena gedung dan fountain akan menghalangi pergerakan." },
  { id: "dr-data", x: 1900, y: 1170, name: "Dr. Data", avatar: 5, message: "Misi tetap bertingkat dari kelas X hingga XII. Terminal terkunci akan terbuka setelah misi sebelumnya selesai." }
];

const TREE_POSITIONS = [
  [90, 110], [790, 160], [940, 260], [1740, 180], [1870, 350], [2580, 120],
  [120, 590], [365, 635], [760, 790], [910, 920], [1760, 790], [1910, 920], [2550, 610],
  [160, 1240], [420, 1250], [720, 1190], [1010, 1250], [1690, 1240], [1980, 1250], [2510, 1240],
  [650, 1795], [1310, 1810], [2010, 1810], [2600, 1810]
];

const FLOWER_PATCHES = [
  [760, 325], [900, 430], [1740, 330], [1880, 540], [760, 1210], [1940, 1220],
  [300, 1815], [1090, 1815], [1580, 1815], [2360, 1815]
];

const sceneIds = new Set(["city", ...BUILDINGS.map((building) => building.id)]);
const buildingForScene = (scene) => BUILDINGS.find((building) => building.id === scene);
const missionNumber = (id) => Number(id.split("-").at(-1));

function rounded(ctx, x, y, width, height, radius, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

export class WorldEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.options = options;
    this.scene = "city";
    this.world = { ...CITY };
    this.player = { x: 1340, y: 1255, direction: "up", moving: false, avatar: 0, name: "Kadet", scene: "city" };
    this.camera = { x: this.player.x, y: this.player.y };
    this.keys = new Set();
    this.touch = { x: 0, y: 0 };
    this.others = [];
    this.running = false;
    this.paused = false;
    this.lastTime = 0;
    this.nearest = null;
    this.lastMoveSync = 0;
    this.frameRequest = null;
    this.layers = new Map();
    this.activeBuilding = null;
    this.bindControls();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  setProfile(profile = {}) {
    this.player.name = profile.name || "Kadet";
    this.player.avatar = Number(profile.avatar || 0);
  }

  setPosition(position) {
    if (!position) return;
    const requestedScene = sceneIds.has(position.scene) ? position.scene : "city";
    this.setScene(requestedScene, false);
    const fallback = requestedScene === "city" ? { x: 1340, y: 1255 } : { x: 640, y: 690 };
    const x = clamp(Number(position.x || fallback.x), 70, this.world.width - 70);
    const y = clamp(Number(position.y || fallback.y), 80, this.world.height - 50);
    if (!this.isBlocked(x, y)) {
      this.player.x = x;
      this.player.y = y;
    } else {
      this.player.x = fallback.x;
      this.player.y = fallback.y;
    }
    if (["up", "down", "left", "right"].includes(position.direction)) this.player.direction = position.direction;
    this.player.scene = this.scene;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
  }

  setOthers(players = []) {
    const previous = new Map(this.others.map((player) => [player.uid, player]));
    this.others = players
      .filter((player) => !player.isSelf && player.online && Number.isFinite(Number(player.x)) && Number.isFinite(Number(player.y)))
      .map((player) => ({
        uid: player.uid,
        x: Number(player.x),
        y: Number(player.y),
        direction: player.direction || "down",
        scene: sceneIds.has(player.scene) ? player.scene : "city",
        moving: previous.has(player.uid) && Math.hypot(Number(player.x) - previous.get(player.uid).x, Number(player.y) - previous.get(player.uid).y) > 2,
        avatar: Number(player.avatar || 0),
        name: player.name || "Kadet",
        remote: true
      }));
  }

  start() {
    this.running = true;
    this.paused = false;
    this.resize();
    this.lastTime = performance.now();
    if (!this.frameRequest) this.frameRequest = requestAnimationFrame((time) => this.loop(time));
  }

  stop() {
    this.running = false;
    this.keys.clear();
    this.resetJoystick();
  }

  pause() {
    this.paused = true;
    this.keys.clear();
    this.resetJoystick();
  }

  resume() {
    if (this.running) this.paused = false;
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, bounds.width || window.innerWidth);
    this.height = Math.max(1, bounds.height || window.innerHeight);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.ratio = ratio;
    this.zoom = clamp(this.height / 900, 0.82, 1.18);
  }

  bindControls() {
    window.addEventListener("keydown", (event) => {
      if (!this.running || this.paused) return;
      const key = event.key.toLowerCase();
      if (DIRECTIONS.has(key)) {
        event.preventDefault();
        this.keys.add(DIRECTIONS.get(key));
      }
      if ((key === "e" || key === "enter" || key === " ") && !event.repeat) {
        event.preventDefault();
        this.interact();
      }
    });
    window.addEventListener("keyup", (event) => {
      const direction = DIRECTIONS.get(event.key.toLowerCase());
      if (direction) this.keys.delete(direction);
    });
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.resetJoystick();
    });
    const joystick = document.querySelector("#touchJoystick");
    if (joystick) {
      const move = (event) => {
        event.preventDefault();
        this.updateJoystick(event, joystick);
      };
      const release = (event) => {
        event.preventDefault();
        this.resetJoystick(joystick);
      };
      joystick.addEventListener("pointerdown", (event) => {
        if (!this.running || this.paused) return;
        joystick.setPointerCapture(event.pointerId);
        joystick.classList.add("is-active");
        move(event);
      });
      joystick.addEventListener("pointermove", (event) => {
        if (joystick.hasPointerCapture(event.pointerId)) move(event);
      });
      joystick.addEventListener("pointerup", release);
      joystick.addEventListener("pointercancel", release);
      joystick.addEventListener("lostpointercapture", () => this.resetJoystick(joystick));
    }
    document.querySelector("#interactButton")?.addEventListener("click", () => this.interact());
  }

  updateJoystick(event, joystick) {
    const bounds = joystick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(bounds.width, bounds.height) * .28);
    const offsetX = event.clientX - bounds.left - bounds.width / 2;
    const offsetY = event.clientY - bounds.top - bounds.height / 2;
    const distance = Math.hypot(offsetX, offsetY);
    const limitedDistance = Math.min(distance, radius);
    const unitX = distance ? offsetX / distance : 0;
    const unitY = distance ? offsetY / distance : 0;
    const strength = distance / radius < .08 ? 0 : Math.min(1, distance / radius);
    this.touch.x = unitX * strength;
    this.touch.y = unitY * strength;
    joystick.style.setProperty("--joystick-x", `${unitX * limitedDistance}px`);
    joystick.style.setProperty("--joystick-y", `${unitY * limitedDistance}px`);
  }

  resetJoystick(joystick = document.querySelector("#touchJoystick")) {
    this.touch.x = 0;
    this.touch.y = 0;
    joystick?.classList.remove("is-active");
    joystick?.style.setProperty("--joystick-x", "0px");
    joystick?.style.setProperty("--joystick-y", "0px");
  }

  interact() {
    if (!this.running || this.paused || !this.nearest) return;
    if (this.nearest.type === "npc") {
      this.options.onNpc?.(this.nearest);
      return;
    }
    if (this.nearest.type === "door") {
      this.enterBuilding(this.nearest.buildingId);
      return;
    }
    if (this.nearest.type === "exit") {
      this.leaveBuilding();
      return;
    }
    if (this.nearest.type === "site") this.options.onMission?.(this.nearest.missionId, this.nearest);
  }

  setScene(scene, notify = true) {
    this.scene = sceneIds.has(scene) ? scene : "city";
    this.player.scene = this.scene;
    this.activeBuilding = buildingForScene(this.scene) || null;
    this.world = this.scene === "city" ? { ...CITY } : { ...INTERIOR };
    this.keys.clear();
    this.resetJoystick();
    this.nearest = null;
    this.options.onNear?.(null);
    if (notify) this.options.onScene?.({ scene: this.scene, label: this.activeBuilding?.label || "Kota Pythonia" });
  }

  enterBuilding(buildingId) {
    const building = buildingForScene(buildingId);
    if (!building) return;
    this.setScene(building.id);
    this.player.x = 640;
    this.player.y = 700;
    this.player.direction = "up";
    this.camera = { x: 640, y: 455 };
    this.emitPosition(true);
  }

  leaveBuilding() {
    const building = this.activeBuilding;
    this.setScene("city");
    this.player.x = building ? building.x + building.w / 2 : 1340;
    this.player.y = building ? building.y + building.h + 78 : 1255;
    this.player.direction = "down";
    this.camera = { x: this.player.x, y: this.player.y };
    this.emitPosition(true);
  }

  sceneObjects() {
    if (this.scene === "city") {
      const doors = BUILDINGS.map((building) => ({
        id: `door-${building.id}`,
        type: "door",
        buildingId: building.id,
        building,
        x: building.x + building.w / 2,
        y: building.y + building.h + 55,
        label: `Masuk ${building.label}`
      }));
      return [...doors, ...CITY_NPCS.map((npc) => ({ ...npc, type: "npc", label: `Bicara dengan ${npc.name}` }))];
    }
    const building = this.activeBuilding;
    if (!building) return [];
    const xs = building.missions.length === 1 ? [640] : [410, 870];
    const terminals = building.missions.map((missionId, index) => ({
      id: `terminal-${missionId}`,
      type: "site",
      missionId,
      x: xs[index],
      y: 405,
      label: `Buka Terminal Misi ${String(missionNumber(missionId)).padStart(2, "0")}`
    }));
    const mentor = {
      id: `mentor-${building.id}`,
      type: "npc",
      x: 1000,
      y: 585,
      name: `Mentor ${building.short}`,
      avatar: (building.number + 1) % 6,
      label: `Bicara dengan Mentor ${building.short}`,
      message: `${building.label} menyimpan ${building.missions.length === 1 ? "satu terminal" : "dua terminal"} latihan. Selesaikan misi secara berurutan agar jalur berikutnya terbuka.`
    };
    const exit = { id: `exit-${building.id}`, type: "exit", x: 640, y: 735, label: "Keluar ke Kota Pythonia" };
    return [...terminals, mentor, exit];
  }

  isBlocked(x, y) {
    const halfWidth = 18;
    const halfHeight = 12;
    if (this.scene !== "city") {
      if (x - halfWidth < 62 || x + halfWidth > INTERIOR.width - 62 || y - halfHeight < 92 || y + halfHeight > INTERIOR.height - 38) return true;
      return false;
    }
    if (x - halfWidth < 55 || x + halfWidth > CITY.width - 55 || y - halfHeight < 55 || y + halfHeight > CITY.height - 55) return true;
    for (const building of BUILDINGS) {
      if (x + halfWidth > building.x && x - halfWidth < building.x + building.w && y + halfHeight > building.y && y - halfHeight < building.y + building.h) return true;
    }
    if (Math.hypot(x - 1340, y - 970) < 145 + halfWidth) return true;
    return false;
  }

  update(delta, time) {
    if (this.paused) return;
    let dx = this.touch.x;
    let dy = this.touch.y;
    if (this.keys.has("left")) dx -= 1;
    if (this.keys.has("right")) dx += 1;
    if (this.keys.has("up")) dy -= 1;
    if (this.keys.has("down")) dy += 1;
    this.player.moving = Boolean(dx || dy);
    if (this.player.moving) {
      const length = Math.hypot(dx, dy);
      const strength = Math.min(1, length);
      dx /= length;
      dy /= length;
      if (Math.abs(dx) > Math.abs(dy)) this.player.direction = dx < 0 ? "left" : "right";
      else this.player.direction = dy < 0 ? "up" : "down";
      const speed = 250 * strength;
      const nextX = this.player.x + dx * speed * delta;
      const nextY = this.player.y + dy * speed * delta;
      if (!this.isBlocked(nextX, this.player.y)) this.player.x = nextX;
      if (!this.isBlocked(this.player.x, nextY)) this.player.y = nextY;
      if (time - this.lastMoveSync > 430) {
        this.lastMoveSync = time;
        this.emitPosition();
      }
    }
    this.camera.x += (this.player.x - this.camera.x) * Math.min(1, delta * 7);
    this.camera.y += (this.player.y - this.camera.y) * Math.min(1, delta * 7);
    this.findNearest();
  }

  emitPosition(force = false) {
    if (!force && !this.player.moving) return;
    this.options.onMove?.({
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      direction: this.player.direction,
      scene: this.scene
    });
  }

  findNearest() {
    let nearest = null;
    let distance = this.scene === "city" ? 118 : 125;
    for (const item of this.sceneObjects()) {
      const current = Math.hypot(this.player.x - item.x, this.player.y - item.y);
      if (current < distance) {
        distance = current;
        nearest = item;
      }
    }
    if (nearest?.id !== this.nearest?.id) {
      this.nearest = nearest;
      this.options.onNear?.(nearest);
    }
  }

  loop(time) {
    this.frameRequest = null;
    if (!this.running) return;
    const delta = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(delta, time);
    this.draw(time / 1000);
    this.frameRequest = requestAnimationFrame((next) => this.loop(next));
  }

  layerForScene() {
    if (this.layers.has(this.scene)) return this.layers.get(this.scene);
    const layer = document.createElement("canvas");
    layer.width = this.world.width;
    layer.height = this.world.height;
    const context = layer.getContext("2d");
    if (this.scene === "city") this.renderCity(context);
    else this.renderInterior(context, this.activeBuilding);
    this.layers.set(this.scene, layer);
    return layer;
  }

  draw(time) {
    const ctx = this.ctx;
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#183b43";
    ctx.fillRect(0, 0, this.width, this.height);
    const viewWidth = this.width / this.zoom;
    const viewHeight = this.height / this.zoom;
    const cameraX = clamp(this.camera.x - viewWidth / 2, 0, Math.max(0, this.world.width - viewWidth));
    const cameraY = clamp(this.camera.y - viewHeight / 2, 0, Math.max(0, this.world.height - viewHeight));
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cameraX, -cameraY);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.layerForScene(), 0, 0);

    const objects = this.sceneObjects();
    const npcs = objects.filter((item) => item.type === "npc").map((npc) => ({ ...npc, direction: "down", moving: false, scene: this.scene }));
    const othersHere = this.others.filter((player) => player.scene === this.scene);
    objects.filter((item) => item.type === "door" || item.type === "site" || item.type === "exit").forEach((item, index) => this.drawMarker(ctx, item, index, time));
    const characters = [...npcs, ...othersHere, this.player].sort((a, b) => a.y - b.y);
    characters.forEach((character) => this.drawCharacter(ctx, character, time, character === this.player));
    ctx.restore();
    this.drawScreenOverlay(ctx);
  }

  renderCity(ctx) {
    ctx.fillStyle = "#68c8cc";
    ctx.fillRect(0, 0, CITY.width, CITY.height);
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 3;
    for (let y = 20; y < CITY.height; y += 34) {
      ctx.beginPath();
      for (let x = 0; x < CITY.width; x += 64) {
        const wave = y + Math.sin((x + y) * .013) * 5;
        if (x === 0) ctx.moveTo(x, wave); else ctx.lineTo(x, wave);
      }
      ctx.stroke();
    }

    rounded(ctx, 46, 42, CITY.width - 92, CITY.height - 84, 72, "#94d88a", "#d5f0b7", 8);
    ctx.fillStyle = "rgba(55,126,68,.08)";
    for (let y = 80; y < CITY.height - 70; y += 52) {
      for (let x = 80; x < CITY.width - 70; x += 56) {
        if ((x + y) % 3) ctx.fillRect(x, y, 3, 7);
      }
    }

    this.drawRoad(ctx, 1242, 55, 196, 1840);
    this.drawRoad(ctx, 65, 500, 2550, 190);
    this.drawRoad(ctx, 65, 1065, 2550, 190);
    this.drawRoad(ctx, 65, 1705, 2550, 180);
    for (const building of BUILDINGS) {
      const center = building.x + building.w / 2;
      if (building.y < 600) this.drawRoad(ctx, center - 70, 460, 140, 125);
      else if (building.y < 1200) this.drawRoad(ctx, center - 70, 1030, 140, 115);
      else this.drawRoad(ctx, center - 70, 1680, 140, 115);
    }

    ctx.beginPath();
    ctx.arc(1340, 970, 285, 0, Math.PI * 2);
    ctx.fillStyle = "#eee7c9";
    ctx.fill();
    ctx.strokeStyle = "#cfc79f";
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1340, 970, 235, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(169,155,117,.35)";
    ctx.lineWidth = 3;
    ctx.stroke();

    BUILDINGS.forEach((building) => this.drawBuilding(ctx, building));
    TREE_POSITIONS.forEach(([x, y], index) => this.drawTree(ctx, x, y, index));
    FLOWER_PATCHES.forEach(([x, y], index) => this.drawFlowers(ctx, x, y, index));
    this.drawFountain(ctx, 1340, 970);
    this.drawBenches(ctx);

    rounded(ctx, 1165, 1260, 350, 62, 12, "#fff9dc", "#b9ad7d", 4);
    ctx.fillStyle = "#355f51";
    ctx.textAlign = "center";
    ctx.font = "900 24px system-ui, sans-serif";
    ctx.fillText("KOTA PYTHONIA", 1340, 1288);
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillStyle = "#71806c";
    ctx.fillText("AKADEMI KODE NUSANTARA", 1340, 1310);
  }

  drawRoad(ctx, x, y, width, height) {
    ctx.fillStyle = "#eee7c9";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgba(169,155,117,.22)";
    ctx.lineWidth = 2;
    for (let lineX = x + 38; lineX < x + width; lineX += 76) {
      ctx.beginPath(); ctx.moveTo(lineX, y); ctx.lineTo(lineX, y + height); ctx.stroke();
    }
    for (let lineY = y + 38; lineY < y + height; lineY += 38) {
      ctx.beginPath(); ctx.moveTo(x, lineY); ctx.lineTo(x + width, lineY); ctx.stroke();
    }
  }

  drawBuilding(ctx, building) {
    const { x, y, w, h, color, roof, accent } = building;
    ctx.fillStyle = "rgba(39,77,63,.2)";
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 22, w * .48, 42, 0, 0, Math.PI * 2); ctx.fill();
    rounded(ctx, x, y + 78, w, h - 78, 18, "#f3e7c5", "#5f715e", 6);
    rounded(ctx, x + 23, y + 100, w - 46, h - 126, 10, color);

    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x - 24, y + 102);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w + 24, y + 102);
    ctx.lineTo(x + w - 10, y + 137);
    ctx.lineTo(x + 10, y + 137);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#594b43";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.beginPath(); ctx.moveTo(x + 40, y + 101); ctx.lineTo(x + w / 2, y + 24); ctx.lineTo(x + w - 40, y + 101); ctx.closePath(); ctx.fill();

    for (const windowX of [x + 72, x + w - 132]) {
      rounded(ctx, windowX, y + 172, 62, 65, 8, "#b8e9eb", "#315e66", 5);
      ctx.strokeStyle = "rgba(255,255,255,.7)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(windowX + 31, y + 177); ctx.lineTo(windowX + 31, y + 232); ctx.stroke();
    }
    rounded(ctx, x + w / 2 - 54, y + h - 105, 108, 105, 12, "#36586a", "#173744", 6);
    rounded(ctx, x + w / 2 - 36, y + h - 85, 72, 85, 8, accent);
    ctx.fillStyle = "#476067";
    ctx.fillRect(x + w / 2 - 4, y + h - 85, 8, 85);
    rounded(ctx, x + 88, y + 112, w - 176, 48, 10, "#fff7d9", "#7e795e", 4);
    ctx.fillStyle = "#3f514a";
    ctx.textAlign = "center";
    ctx.font = "900 20px system-ui, sans-serif";
    ctx.fillText(building.label, x + w / 2, y + 143);
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(x + w / 2, y + 74, 31, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = roof;
    ctx.font = "900 25px ui-monospace, monospace";
    ctx.fillText(String(building.number), x + w / 2, y + 83);
  }

  drawTree(ctx, x, y, index) {
    ctx.fillStyle = "rgba(48,90,62,.18)";
    ctx.beginPath(); ctx.ellipse(x + 8, y + 39, 54, 20, 0, 0, Math.PI * 2); ctx.fill();
    rounded(ctx, x - 9, y + 8, 18, 55, 4, "#8b6549");
    const shades = index % 2 ? ["#38875e", "#52a86f", "#75c579"] : ["#2f7c5b", "#4b9c66", "#70bd72"];
    ctx.fillStyle = shades[0]; ctx.beginPath(); ctx.arc(x, y - 8, 48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shades[1]; ctx.beginPath(); ctx.arc(x - 28, y - 7, 32, 0, Math.PI * 2); ctx.arc(x + 30, y - 12, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shades[2]; ctx.beginPath(); ctx.arc(x - 5, y - 34, 31, 0, Math.PI * 2); ctx.fill();
  }

  drawFlowers(ctx, x, y, index) {
    const colors = index % 2 ? ["#fff2a3", "#e46f91"] : ["#f8d7ff", "#6eafff"];
    for (let i = 0; i < 12; i += 1) {
      const px = x + (i % 6) * 17;
      const py = y + Math.floor(i / 6) * 17;
      ctx.fillStyle = colors[i % 2];
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fffbd4"; ctx.fillRect(px - 1, py - 1, 3, 3);
    }
  }

  drawFountain(ctx, x, y) {
    ctx.fillStyle = "rgba(47,91,82,.2)";
    ctx.beginPath(); ctx.ellipse(x + 15, y + 100, 165, 52, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a9c7c3"; ctx.beginPath(); ctx.ellipse(x, y + 64, 158, 78, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#64cddd"; ctx.beginPath(); ctx.ellipse(x, y + 53, 137, 62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(x, y + 50, 102, 40, 0, 0, Math.PI * 2); ctx.stroke();
    rounded(ctx, x - 30, y - 8, 60, 72, 15, "#dbe9df");
    ctx.fillStyle = "#dbe9df"; ctx.beginPath(); ctx.arc(x, y - 12, 38, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#a8ecf2"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.quadraticCurveTo(x - 75, y - 90, x - 92, y + 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.quadraticCurveTo(x + 75, y - 90, x + 92, y + 18); ctx.stroke();
    ctx.strokeStyle = "#e9ffff"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x, y - 106); ctx.stroke();
  }

  drawBenches(ctx) {
    for (const [x, y] of [[1055, 805], [1550, 805], [1055, 1125], [1550, 1125]]) {
      rounded(ctx, x, y, 92, 24, 6, "#a66b43", "#68462f", 3);
      ctx.fillStyle = "#68462f"; ctx.fillRect(x + 10, y + 24, 8, 15); ctx.fillRect(x + 74, y + 24, 8, 15);
    }
  }

  renderInterior(ctx, building) {
    const dark = building?.roof || "#315e66";
    const color = building?.color || "#4aa99f";
    const accent = building?.accent || "#d9ffff";
    ctx.fillStyle = "#172f38";
    ctx.fillRect(0, 0, INTERIOR.width, INTERIOR.height);
    rounded(ctx, 38, 38, INTERIOR.width - 76, INTERIOR.height - 58, 30, "#e9e2c7", "#8e8c76", 8);
    for (let y = 95; y < INTERIOR.height - 40; y += 58) {
      for (let x = 70; x < INTERIOR.width - 60; x += 70) {
        ctx.strokeStyle = "rgba(102,101,84,.16)"; ctx.lineWidth = 2; ctx.strokeRect(x, y, 70, 58);
      }
    }
    rounded(ctx, 62, 62, INTERIOR.width - 124, 120, 22, dark, "#f3e8ba", 5);
    ctx.fillStyle = accent;
    ctx.textAlign = "center";
    ctx.font = "900 31px system-ui, sans-serif";
    ctx.fillText(building?.label || "Ruang Belajar", 640, 116);
    ctx.font = "800 14px ui-monospace, monospace";
    ctx.fillText(`GEDUNG ${String(building?.number || 0).padStart(2, "0")} · ${building?.short || "PYTHONIA"}`, 640, 148);

    const missionIds = building?.missions || [];
    const xs = missionIds.length === 1 ? [640] : [410, 870];
    missionIds.forEach((missionId, index) => {
      const x = xs[index];
      rounded(ctx, x - 130, 230, 260, 135, 18, color, dark, 6);
      rounded(ctx, x - 92, 252, 184, 72, 10, "#152f3b", accent, 4);
      ctx.fillStyle = accent;
      ctx.font = "900 30px ui-monospace, monospace";
      ctx.fillText(`>_ ${String(missionNumber(missionId)).padStart(2, "0")}`, x, 296);
      ctx.fillStyle = "#755f47";
      ctx.fillRect(x - 72, 365, 144, 24);
      ctx.fillRect(x - 12, 386, 24, 36);
    });

    for (const shelfX of [100, 1040]) {
      rounded(ctx, shelfX, 235, 140, 300, 14, "#795b43", "#4f3b30", 5);
      for (let row = 0; row < 4; row += 1) {
        ctx.fillStyle = "#4f3b30"; ctx.fillRect(shelfX + 12, 278 + row * 65, 116, 8);
        for (let book = 0; book < 6; book += 1) {
          ctx.fillStyle = [color, accent, "#e47767", "#e7ac4d"][book % 4];
          ctx.fillRect(shelfX + 18 + book * 18, 246 + row * 65, 13, 31);
        }
      }
    }

    rounded(ctx, 525, 718, 230, 74, 15, dark, "#f3e8ba", 6);
    rounded(ctx, 560, 730, 160, 62, 10, accent);
    ctx.fillStyle = dark;
    ctx.font = "900 13px system-ui, sans-serif";
    ctx.fillText("KELUAR KE KOTA", 640, 765);
    rounded(ctx, 310, 540, 360, 84, 14, "rgba(255,255,255,.75)", "#aaa184", 3);
    ctx.fillStyle = "#40564e";
    ctx.font = "800 16px system-ui, sans-serif";
    ctx.fillText("Dekati terminal dan tekan E", 490, 574);
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillStyle = "#718078";
    ctx.fillText("Misi yang terkunci akan terbuka berurutan.", 490, 600);
  }

  buildingStatus(building) {
    const statuses = building.missions.map((id) => this.options.getMissionStatus?.(id) || "locked");
    if (statuses.every((status) => status === "done")) return "done";
    if (statuses.some((status) => status === "current")) return "current";
    return "locked";
  }

  drawMarker(ctx, item, index, time) {
    let status = "current";
    let text = "↩";
    let color = "#52e5ff";
    if (item.type === "door") {
      status = this.buildingStatus(item.building);
      text = String(item.building.number);
      color = item.building.accent;
    } else if (item.type === "site") {
      status = this.options.getMissionStatus?.(item.missionId) || "locked";
      text = String(missionNumber(item.missionId)).padStart(2, "0");
      color = this.activeBuilding?.accent || "#52e5ff";
    }
    const bob = Math.sin(time * 2.3 + index) * 4;
    const y = item.y - 56 + bob;
    ctx.save();
    ctx.globalAlpha = status === "locked" ? .68 : 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = status === "current" ? 25 : 10;
    rounded(ctx, item.x - 24, y - 24, 48, 48, 15, "rgba(16,43,49,.94)", color, 3);
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = "900 17px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(status === "done" ? "✓" : status === "locked" ? "⌑" : text, item.x, y + 1);
    ctx.beginPath(); ctx.moveTo(item.x - 7, y + 27); ctx.lineTo(item.x + 7, y + 27); ctx.lineTo(item.x, y + 38); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  drawCharacter(ctx, character, time, isPlayer = false) {
    const palettes = [
      ["#173d6b", "#52e5ff", "#242f48"], ["#4b2e83", "#b79cff", "#2f2c51"],
      ["#88431e", "#ffad62", "#3e3340"], ["#176b59", "#52e8aa", "#263c46"],
      ["#812f66", "#ff91d1", "#3d2b49"], ["#415d9b", "#8db4ff", "#29354d"]
    ];
    const [dark, bright, trousers] = palettes[character.avatar % palettes.length];
    const phase = character.moving ? Math.sin(time * 12 + character.x * .01) : Math.sin(time * 2) * .12;
    const bounce = character.moving ? Math.abs(phase) * 3 : 0;
    ctx.save();
    ctx.translate(character.x, character.y - bounce);
    ctx.fillStyle = "rgba(5,18,25,.28)";
    ctx.beginPath(); ctx.ellipse(0, 5 + bounce, 23, 9, 0, 0, Math.PI * 2); ctx.fill();
    rounded(ctx, -15, -21 + phase * 5, 12, 27, 5, trousers);
    rounded(ctx, 3, -21 - phase * 5, 12, 27, 5, trousers);
    rounded(ctx, -17, -2 + phase * 5, 15, 8, 4, "#eef4f6");
    rounded(ctx, 2, -2 - phase * 5, 15, 8, 4, "#eef4f6");
    rounded(ctx, -21, -54, 42, 37, 10, bright);
    rounded(ctx, -22, -51, 44, 10, 5, dark);
    rounded(ctx, -28, -50 - phase * 4, 9, 27, 5, bright);
    rounded(ctx, 19, -50 + phase * 4, 9, 27, 5, bright);
    ctx.fillStyle = ["#f0bd93", "#d99c78", "#a86d4f"][character.avatar % 3];
    ctx.beginPath(); ctx.arc(0, -68, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(0, -75, 21, Math.PI, Math.PI * 2); ctx.fill();
    rounded(ctx, -20, -78, 40, 10, 5, dark);
    if (character.direction !== "up") {
      const look = character.direction === "left" ? -4 : character.direction === "right" ? 4 : 0;
      ctx.fillStyle = "#172637";
      ctx.beginPath(); ctx.arc(-7 + look, -67, 2, 0, Math.PI * 2); ctx.arc(7 + look, -67, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#985e55"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(look, -60, 5, 0, Math.PI); ctx.stroke();
    }
    if (isPlayer) {
      ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -45, 35, 0, Math.PI * 2); ctx.stroke();
    }
    if (character.name) {
      ctx.font = "800 14px system-ui, sans-serif";
      const width = ctx.measureText(character.name).width + 20;
      rounded(ctx, -width / 2, -111, width, 24, 8, isPlayer ? "rgba(5,20,31,.92)" : "rgba(255,255,255,.92)");
      ctx.fillStyle = isPlayer ? "#fff" : "#173d46";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(character.name, 0, -99);
    }
    ctx.restore();
  }

  drawScreenOverlay(ctx) {
    const location = this.activeBuilding?.label || "Alun-alun Pythonia";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    rounded(ctx, this.width / 2 - 120, 88, 240, 34, 17, "rgba(255,250,226,.92)", "rgba(90,91,72,.28)", 1);
    ctx.fillStyle = "#51685d";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.fillText(`⌖  ${location}`, this.width / 2, 105);
    if (this.scene === "city" && this.width > 850) this.drawMiniMap(ctx);
    const gradient = ctx.createRadialGradient(this.width / 2, this.height / 2, Math.min(this.width, this.height) * .28, this.width / 2, this.height / 2, Math.max(this.width, this.height) * .78);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(5,24,29,.2)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  drawMiniMap(ctx) {
    const width = 132;
    const height = 108;
    const x = this.width - width - 24;
    const y = Math.max(170, this.height / 2 - height / 2);
    rounded(ctx, x - 8, y - 8, width + 16, height + 16, 14, "rgba(255,250,226,.9)", "rgba(255,255,255,.75)", 2);
    rounded(ctx, x, y, width, height, 9, "#9bd591");
    ctx.fillStyle = "#eee7c9";
    ctx.fillRect(x + 61, y + 4, 10, height - 8);
    ctx.fillRect(x + 5, y + 26, width - 10, 9);
    ctx.fillRect(x + 5, y + 57, width - 10, 9);
    ctx.fillRect(x + 5, y + 91, width - 10, 9);
    for (const building of BUILDINGS) {
      const bx = x + building.x / CITY.width * width;
      const by = y + building.y / CITY.height * height;
      ctx.fillStyle = building.color;
      ctx.fillRect(bx, by, Math.max(8, building.w / CITY.width * width), Math.max(7, building.h / CITY.height * height));
    }
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#285d68";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + this.player.x / CITY.width * width, y + this.player.y / CITY.height * height, 5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
}
