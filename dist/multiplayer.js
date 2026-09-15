const CONFIG_PATH = "./multiplayer-config.json";
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomId(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join("");
}

function safeKey(value) {
  return String(value).replace(/[.#$\[\]/]/g, "_").slice(0, 42);
}

export class MultiplayerClient {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.config = null;
    this.auth = null;
    this.roomCode = null;
    this.room = null;
    this.profile = null;
    this.pollTimer = null;
    this.heartbeatTimer = null;
  }

  async initialise() {
    try {
      const response = await fetch(CONFIG_PATH, { cache: "no-store" });
      if (!response.ok) throw new Error("Konfigurasi multiplayer tidak ditemukan.");
      this.config = await response.json();
      const { apiKey, databaseURL } = this.config.firebase || {};
      const configured = Boolean(
        apiKey && databaseURL &&
        !apiKey.includes("GANTI_") &&
        !databaseURL.includes("NAMA_PROJECT")
      );
      this.callbacks.onConfiguration?.({ configured });
      return configured;
    } catch (error) {
      this.callbacks.onConfiguration?.({ configured: false, error: error.message });
      return false;
    }
  }

  async ensureAuth() {
    if (this.auth && Date.now() < this.auth.expiresAt - 60_000) return this.auth;
    if (this.auth?.refreshToken) {
      try {
        await this.refreshAuth();
        return this.auth;
      } catch {
        this.auth = null;
      }
    }

    const apiKey = this.config?.firebase?.apiKey;
    if (!apiKey || apiKey.includes("GANTI_")) throw new Error("Firebase belum dikonfigurasi.");
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(this.authError(body?.error?.message));
    this.auth = {
      uid: body.localId,
      idToken: body.idToken,
      refreshToken: body.refreshToken,
      expiresAt: Date.now() + Number(body.expiresIn || 3600) * 1000
    };
    return this.auth;
  }

  async refreshAuth() {
    const apiKey = this.config.firebase.apiKey;
    const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: this.auth.refreshToken })
    });
    const body = await response.json();
    if (!response.ok) throw new Error("Sesi Firebase tidak dapat diperbarui.");
    this.auth = {
      uid: body.user_id,
      idToken: body.id_token,
      refreshToken: body.refresh_token,
      expiresAt: Date.now() + Number(body.expires_in || 3600) * 1000
    };
  }

  authError(code = "") {
    if (code.includes("OPERATION_NOT_ALLOWED")) return "Anonymous Authentication belum diaktifkan di Firebase.";
    if (code.includes("API_KEY")) return "Firebase apiKey tidak valid.";
    return `Firebase menolak autentikasi (${code || "kesalahan tidak diketahui"}).`;
  }

  async request(path, options = {}, retry = true) {
    await this.ensureAuth();
    const base = this.config.firebase.databaseURL.replace(/\/$/, "");
    const url = `${base}/${path}.json?auth=${encodeURIComponent(this.auth.idToken)}`;
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    if (response.status === 401 && retry && this.auth.refreshToken) {
      await this.refreshAuth();
      return this.request(path, options, false);
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const reason = body?.error || `HTTP ${response.status}`;
      if (response.status === 401 || response.status === 403) {
        throw new Error("Akses Firebase ditolak. Periksa Anonymous Authentication dan Rules.");
      }
      throw new Error(String(reason));
    }
    return body;
  }

  makePlayer(profile, progress) {
    return {
      name: String(profile.name || "Kadet").slice(0, 24),
      avatar: Number(profile.avatar || 0),
      classLevel: String(profile.classLevel || "X"),
      ready: false,
      activeAt: Date.now(),
      joined: Date.now(),
      xp: Number(progress.xp || 0),
      focusMission: String(progress.focusMission || "x-01"),
      completed: JSON.stringify(progress.completed || []).slice(0, 300)
    };
  }

  async createRoom(profile, progress) {
    this.profile = profile;
    await this.ensureAuth();
    let code;
    let exists = true;
    for (let attempt = 0; attempt < 6 && exists; attempt += 1) {
      code = randomId();
      try {
        exists = Boolean(await this.request(`pythoniaRooms/${code}`));
      } catch (error) {
        // Rules intentionally hide rooms from non-members. A generated code can be tried safely.
        if (String(error.message).includes("ditolak")) exists = false;
        else throw error;
      }
    }
    if (!code) throw new Error("Kode ruang gagal dibuat. Coba lagi.");
    const now = Date.now();
    const player = this.makePlayer(profile, progress);
    const room = {
      host: this.auth.uid,
      status: "lobby",
      created: now,
      expires: now + 24 * 60 * 60 * 1000,
      players: { [this.auth.uid]: player }
    };
    await this.request(`pythoniaRooms/${code}`, { method: "PUT", body: room });
    this.connect(code, room);
    return code;
  }

  async joinRoom(code, profile, progress) {
    this.profile = profile;
    await this.ensureAuth();
    const normalCode = String(code).toUpperCase().trim();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalCode)) throw new Error("Kode ruang harus terdiri dari 6 karakter.");
    const player = this.makePlayer(profile, progress);
    await this.request(`pythoniaRooms/${normalCode}/players/${safeKey(this.auth.uid)}`, { method: "PUT", body: player });
    try {
      const room = await this.request(`pythoniaRooms/${normalCode}`);
      if (!room?.host) throw new Error("Ruang tidak ditemukan atau sudah berakhir.");
      const count = Object.keys(room.players || {}).length;
      if (count > Number(this.config.maxPlayers || 8)) {
        await this.request(`pythoniaRooms/${normalCode}/players/${safeKey(this.auth.uid)}`, { method: "DELETE", body: null });
        throw new Error("Ruang sudah penuh (maksimal 8 pemain). Coba ruang lain.");
      }
      if (room.expires < Date.now()) throw new Error("Ruang ini sudah kedaluwarsa.");
      this.connect(normalCode, room);
      return normalCode;
    } catch (error) {
      if (!String(error.message).includes("penuh")) {
        await this.request(`pythoniaRooms/${normalCode}/players/${safeKey(this.auth.uid)}`, { method: "DELETE", body: null }).catch(() => {});
      }
      throw error;
    }
  }

  connect(code, room) {
    this.roomCode = code;
    this.room = room;
    this.stopTimers();
    this.callbacks.onRoom?.(this.normaliseRoom(room));
    const interval = Math.max(1000, Number(this.config.pollIntervalMs || 1500));
    this.pollTimer = setInterval(() => this.poll(), interval);
    this.heartbeatTimer = setInterval(() => this.heartbeat(), 10_000);
  }

  normaliseRoom(room) {
    const now = Date.now();
    const players = Object.entries(room?.players || {}).map(([uid, player]) => ({
      uid,
      ...player,
      online: now - Number(player.activeAt || 0) < 25_000,
      isSelf: uid === this.auth?.uid,
      isHost: uid === room?.host
    }));
    const chat = Object.values(room?.chat || {}).sort((a, b) => a.created - b.created).slice(-40);
    const relay = ["analysis", "design", "test"].map((key) => room?.relay?.[key] || null);
    return { ...room, code: this.roomCode, players, chat, relay, isHost: room?.host === this.auth?.uid };
  }

  async poll() {
    if (!this.roomCode) return;
    try {
      const room = await this.request(`pythoniaRooms/${this.roomCode}`);
      if (!room) {
        this.disconnect();
        this.callbacks.onError?.("Ruang telah ditutup oleh host.");
        return;
      }
      this.room = room;
      this.callbacks.onRoom?.(this.normaliseRoom(room));
    } catch (error) {
      this.callbacks.onError?.(error.message);
    }
  }

  async heartbeat() {
    if (!this.roomCode || !this.auth) return;
    await this.request(`pythoniaRooms/${this.roomCode}/players/${safeKey(this.auth.uid)}/activeAt`, { method: "PUT", body: Date.now() }).catch(() => {});
  }

  async setReady(ready) {
    await this.writePlayerField("ready", Boolean(ready));
  }

  async startSession() {
    if (!this.room || this.room.host !== this.auth.uid) throw new Error("Hanya host yang dapat memulai sesi.");
    const players = Object.values(this.room.players || {});
    if (players.length < 2) throw new Error("Ajak minimal satu teman sebelum memulai.");
    if (players.some((player) => !player.ready)) throw new Error("Semua anggota harus berstatus siap.");
    await this.request(`pythoniaRooms/${this.roomCode}/status`, { method: "PUT", body: "playing" });
    await this.poll();
  }

  async syncProgress(progress) {
    if (!this.roomCode) return;
    const base = `pythoniaRooms/${this.roomCode}/players/${safeKey(this.auth.uid)}`;
    await Promise.all([
      this.request(`${base}/xp`, { method: "PUT", body: Number(progress.xp || 0) }),
      this.request(`${base}/focusMission`, { method: "PUT", body: String(progress.focusMission || "x-01") }),
      this.request(`${base}/completed`, { method: "PUT", body: JSON.stringify(progress.completed || []).slice(0, 300) })
    ]);
  }

  async writePlayerField(field, value) {
    if (!this.roomCode) throw new Error("Belum terhubung ke ruang.");
    await this.request(`pythoniaRooms/${this.roomCode}/players/${safeKey(this.auth.uid)}/${field}`, { method: "PUT", body: value });
    await this.poll();
  }

  async sendChat(message) {
    const clean = String(message).trim().slice(0, 120);
    if (!clean) return;
    const id = `${Date.now()}_${randomId(4)}`;
    await this.request(`pythoniaRooms/${this.roomCode}/chat/${id}`, {
      method: "PUT",
      body: { id, player: this.auth.uid, name: this.profile.name.slice(0, 24), message: clean, created: Date.now() }
    });
    await this.poll();
  }

  async claimRelay(index) {
    const keys = ["analysis", "design", "test"];
    if (!this.room || this.room.status !== "playing") throw new Error("Host harus memulai sesi terlebih dahulu.");
    if (index > 0 && !this.room.relay?.[keys[index - 1]]) throw new Error("Aktifkan tahap sebelumnya terlebih dahulu.");
    if (this.room.relay?.[keys[index]]) throw new Error("Tahap ini sudah diaktifkan.");
    if (index === 2) {
      const contributors = new Set([this.room.relay?.analysis?.player, this.room.relay?.design?.player, this.auth.uid].filter(Boolean));
      if (contributors.size < 2) throw new Error("Relay harus melibatkan minimal dua anggota berbeda.");
    }
    await this.request(`pythoniaRooms/${this.roomCode}/relay/${keys[index]}`, {
      method: "PUT",
      body: { player: this.auth.uid, name: this.profile.name.slice(0, 24), created: Date.now() }
    });
    await this.poll();
  }

  async leave() {
    if (!this.roomCode || !this.auth) return;
    const path = this.room?.host === this.auth.uid
      ? `pythoniaRooms/${this.roomCode}`
      : `pythoniaRooms/${this.roomCode}/players/${safeKey(this.auth.uid)}`;
    await this.request(path, { method: "DELETE", body: null }).catch(() => {});
    this.disconnect();
  }

  disconnect() {
    this.stopTimers();
    this.roomCode = null;
    this.room = null;
    this.callbacks.onRoom?.(null);
  }

  stopTimers() {
    clearInterval(this.pollTimer);
    clearInterval(this.heartbeatTimer);
    this.pollTimer = null;
    this.heartbeatTimer = null;
  }
}
