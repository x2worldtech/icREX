import type { Assets } from "./assets";
import type { AudioManager } from "./audio";
import {
  DESIGN,
  FIXED_DT,
  MAX_FRAME_DT,
  PALETTE,
  PHYSICS,
  PLAYER,
  POWERUPS,
  SCORING,
  SPAWN,
  SPEED,
  STAGE_LENGTH,
  STAGES,
} from "./config";
import type {
  Box,
  Coin,
  GameEvents,
  GamePhase,
  Mission,
  Obstacle,
  ObstacleKind,
  Particle,
  Popup,
  PowerUp,
  PowerUpKind,
  RunStats,
} from "./types";

const BEST_KEY = "icrex_best_score";

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function rand(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}
function hexToRgb(c: string): [number, number, number] {
  const v = c.replace("#", "");
  return [
    Number.parseInt(v.slice(0, 2), 16),
    Number.parseInt(v.slice(2, 4), 16),
    Number.parseInt(v.slice(4, 6), 16),
  ];
}
function mixHex(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  return `rgb(${Math.round(lerp(pa[0], pb[0], t))},${Math.round(
    lerp(pa[1], pb[1], t),
  )},${Math.round(lerp(pa[2], pb[2], t))})`;
}

function readBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? Math.max(0, Number.parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
}
function writeBest(v: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    // ignore
  }
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
}
interface WindLine {
  y: number;
  len: number;
  speed: number;
  phase: number;
}
interface Bird {
  x: number;
  y: number;
  phase: number;
  speed: number;
}
interface Tumbleweed {
  x: number;
  y: number;
  spin: number;
  r: number;
}
interface StageColors {
  skyTop: string;
  skyBottom: string;
  duneFar: string;
  duneNear: string;
  ground: string;
  nightAmount: number;
  stormAmount: number;
  name: string;
  index: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private assets: Assets;
  private audio: AudioManager;
  private events: GameEvents;

  private phase: GamePhase = "menu";
  private rafId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private animClock = 0;
  private runClock = 0;

  // Player
  private px = PLAYER.startX;
  private py = 0;
  private prevPy = 0;
  private vy = 0;
  private onGround = true;
  private jumpsUsed = 0;
  private duckHeld = false;
  private jumpBufferTimer = 0;
  private coyoteTimer = 0;
  private skinHue = 0;
  private reducedMotion = false;
  private deathStart = 0;

  // World
  private distance = 0;
  private speed: number = SPEED.start;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private powerups: PowerUp[] = [];
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private stars: Star[] = [];
  private wind: WindLine[] = [];
  private birds: Bird[] = [];
  private tumbleweeds: Tumbleweed[] = [];
  private nextObstacleDist = 0;
  private nextCoinDist = 0;
  private nextPowerupDist = 0;

  // Parallax
  private offMesa = 0;
  private offFar = 0;
  private offDune = 0;
  private offGround = 0;
  private prevOffMesa = 0;
  private prevOffFar = 0;
  private prevOffDune = 0;
  private prevOffGround = 0;

  // Scoring
  private scoreAccum = 0;
  private coinCount = 0;
  private goldenCount = 0;
  private nearMissCount = 0;
  private powerupCount = 0;
  private comboCount = 0;
  private comboTimer = 0;
  private maxCombo = 0;
  private lastMilestone = 0;

  // Power-up state
  private shieldActive = false;
  private invulnTimer = 0;
  private magnetTimer = 0;
  private scoreX2Timer = 0;
  private slowmoTimer = 0;
  private usedShield = false;

  // Mission
  private mission: Mission | null = null;
  private missionDone = false;

  // Effects
  private shake = 0;
  private hitFlash = 0;
  private powerFlash = 0;
  private lastStageIndex = 0;
  private stageBanner = "";
  private stageBannerTimer = 0;
  private best = readBest();

  constructor(
    canvas: HTMLCanvasElement,
    assets: Assets,
    audio: AudioManager,
    events: GameEvents,
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.assets = assets;
    this.audio = audio;
    this.events = events;
    this.canvas.width = DESIGN.width;
    this.canvas.height = DESIGN.height;
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * DESIGN.width,
        y: Math.random() * (DESIGN.height - DESIGN.groundHeight) * 0.8,
        r: rand(0.6, 2.1),
        phase: Math.random() * Math.PI * 2,
      });
    }
    for (let i = 0; i < 46; i++) {
      this.wind.push({
        y: rand(0, DESIGN.height),
        len: rand(60, 220),
        speed: rand(900, 1700),
        phase: Math.random() * 1000,
      });
    }
    this.resetWorld();
    this.events.onBestChange?.(this.best);
  }

  // ---- lifecycle -----------------------------------------------------------

  start(): void {
    this.audio.unlock();
    this.resetWorld();
    this.setPhase("running");
    this.audio.startMusic();
    if (this.rafId === null) {
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this.frame);
    }
  }

  mountMenu(): void {
    this.setPhase("menu");
    if (this.rafId === null) {
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this.frame);
    }
  }

  pause(): void {
    if (this.phase !== "running") return;
    this.setPhase("paused");
    this.audio.stopMusic();
  }

  resume(): void {
    if (this.phase !== "paused") return;
    this.setPhase("running");
    this.audio.startMusic();
    this.lastTime = performance.now();
    this.accumulator = 0;
  }

  togglePause(): void {
    if (this.phase === "running") this.pause();
    else if (this.phase === "paused") this.resume();
  }

  toMenu(): void {
    this.audio.stopMusic();
    this.resetWorld();
    this.setPhase("menu");
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.audio.stopMusic();
  }

  getPhase(): GamePhase {
    return this.phase;
  }
  getBest(): number {
    return this.best;
  }
  setSkin(hue: number): void {
    this.skinHue = hue;
  }
  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
  }
  setMission(m: Mission | null): void {
    this.mission = m;
    this.missionDone = false;
  }

  private setPhase(p: GamePhase): void {
    if (this.phase === p) return;
    this.phase = p;
    this.events.onPhaseChange?.(p);
  }

  private resetWorld(): void {
    this.distance = 0;
    this.speed = SPEED.start;
    this.obstacles = [];
    this.coins = [];
    this.powerups = [];
    this.particles = [];
    this.popups = [];
    this.birds = [];
    this.tumbleweeds = [];
    this.scoreAccum = 0;
    this.coinCount = 0;
    this.goldenCount = 0;
    this.nearMissCount = 0;
    this.powerupCount = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.lastMilestone = 0;
    this.shieldActive = false;
    this.invulnTimer = 0;
    this.magnetTimer = 0;
    this.scoreX2Timer = 0;
    this.slowmoTimer = 0;
    this.usedShield = false;
    this.missionDone = false;
    this.shake = 0;
    this.hitFlash = 0;
    this.powerFlash = 0;
    this.runClock = 0;
    this.accumulator = 0;
    this.lastStageIndex = 0;
    this.stageBanner = "";
    this.stageBannerTimer = 0;
    this.nextObstacleDist = DESIGN.width * 0.9;
    this.nextCoinDist = DESIGN.width * 1.3;
    this.nextPowerupDist = DESIGN.width * 3.4;
    this.vy = 0;
    this.onGround = true;
    this.jumpsUsed = 0;
    this.duckHeld = false;
    this.jumpBufferTimer = 0;
    this.coyoteTimer = PHYSICS.coyoteTime;
    this.py = this.groundTop() - PLAYER.height;
    this.prevPy = this.py;
  }

  private groundTop(): number {
    return DESIGN.height - DESIGN.groundHeight;
  }

  // ---- input ---------------------------------------------------------------

  requestJump(): void {
    if (this.phase !== "running") return;
    this.jumpBufferTimer = PHYSICS.jumpBuffer;
  }
  setJumpHeld(held: boolean): void {
    if (!held && this.vy < 0) this.vy *= PHYSICS.shortHopFactor;
  }
  setDuck(down: boolean): void {
    this.duckHeld = down;
  }

  // ---- loop ----------------------------------------------------------------

  private frame = (now: number): void => {
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT;
    this.animClock += dt;

    const stepping = this.phase === "running" || this.phase === "menu";
    if (stepping) {
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= FIXED_DT && steps < 6) {
        this.step(FIXED_DT);
        this.accumulator -= FIXED_DT;
        steps++;
      }
      if (steps >= 6) this.accumulator = 0;
    }

    const alpha = this.phase === "running" ? this.accumulator / FIXED_DT : 1;
    this.render(alpha);
    this.rafId = requestAnimationFrame(this.frame);
  };

  // ---- simulation ----------------------------------------------------------

  private step(dt: number): void {
    const menu = this.phase === "menu";
    const baseSpeed = menu ? 230 : this.speed;
    const slow = this.slowmoTimer > 0 && !menu ? POWERUPS.slowmoFactor : 1;
    const worldSpeed = baseSpeed * slow;

    this.prevOffMesa = this.offMesa;
    this.prevOffFar = this.offFar;
    this.prevOffDune = this.offDune;
    this.prevOffGround = this.offGround;
    this.offMesa -= worldSpeed * 0.08 * dt;
    this.offFar -= worldSpeed * 0.18 * dt;
    this.offDune -= worldSpeed * 0.45 * dt;
    this.offGround -= worldSpeed * dt;

    this.updateAmbient(dt, worldSpeed);

    if (menu) {
      this.py = this.groundTop() - PLAYER.height + Math.sin(this.animClock * 2) * 4;
      this.prevPy = this.py;
      this.updateParticles(dt, worldSpeed);
      return;
    }

    this.runClock += dt;
    this.distance += worldSpeed * dt;
    this.speed = Math.min(SPEED.max, this.speed + SPEED.accelPerSecond * dt);

    const x2 = this.scoreX2Timer > 0 ? 2 : 1;
    this.scoreAccum += ((worldSpeed * dt) / SCORING.distancePerPoint) * x2;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;
    if (this.scoreX2Timer > 0) this.scoreX2Timer -= dt;
    if (this.slowmoTimer > 0) this.slowmoTimer -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 60);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 2);
    if (this.powerFlash > 0) this.powerFlash = Math.max(0, this.powerFlash - dt * 2.5);
    if (this.stageBannerTimer > 0) this.stageBannerTimer -= dt;

    this.updatePlayer(dt);

    // combo aura: rising embers at high combo
    if (this.comboCount >= 3 && !this.reducedMotion && Math.random() < 0.25) {
      this.particles.push({
        x: this.px + rand(12, PLAYER.width - 12),
        y: this.py + rand(20, PLAYER.height),
        vx: rand(-90, -30),
        vy: rand(-120, -40),
        life: rand(0.3, 0.5),
        maxLife: 0.5,
        size: rand(2, 4),
        color: this.comboCount >= 8 ? "#ffd27a" : "#e8783c",
        gravity: -120,
      });
    }

    if (this.distance >= this.nextObstacleDist) this.spawnObstacle();
    if (this.distance >= this.nextCoinDist) this.spawnCoinGroup();
    if (this.distance >= this.nextPowerupDist) this.spawnPowerUp();

    const playerBox = this.playerHitbox();

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.prevX = o.x;
      const factor = o.kind === "boulder" ? 1.18 : 1;
      o.x -= worldSpeed * factor * dt;
      if (o.kind === "drone") o.bobPhase += dt * 3;
      if (o.kind === "boulder") o.spin += dt * (worldSpeed / 70);
      if (this.invulnTimer <= 0 && this.intersects(playerBox, this.obstacleHitbox(o))) {
        if (this.shieldActive) this.breakShield(o);
        else {
          this.die();
          return;
        }
      }
      if (!o.scored && o.x + o.width < playerBox.x) {
        o.scored = true;
        const dodging = !this.onGround || (this.duckHeld && this.onGround);
        if (dodging) this.awardNearMiss();
      }
      if (o.x + o.width < -80) this.obstacles.splice(i, 1);
    }

    const magnet = this.magnetTimer > 0;
    const pcx = this.px + PLAYER.width / 2;
    const pcy = this.py + PLAYER.height / 2;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.prevX = c.x;
      c.x -= worldSpeed * dt;
      c.spin += dt * 6;
      c.floatPhase += dt * 2.5;
      c.y = c.baseY + Math.sin(c.floatPhase) * 6;
      if (magnet) {
        const dx = pcx - (c.x + c.width / 2);
        const dy = pcy - (c.y + c.height / 2);
        const d = Math.hypot(dx, dy);
        if (d < POWERUPS.magnetRadius && d > 1) {
          const pull = (POWERUPS.magnetPull * dt) / Math.max(40, d);
          c.x += dx * pull;
          c.y += dy * pull;
          c.baseY = c.y;
        }
      }
      if (!c.collected && this.intersects(playerBox, this.coinHitbox(c))) {
        this.collectCoin(c);
      }
      if (c.collected || c.x + c.width < -80) this.coins.splice(i, 1);
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.prevX = p.x;
      p.x -= worldSpeed * dt;
      p.floatPhase += dt * 2;
      if (!p.collected && this.intersects(playerBox, p)) this.collectPowerUp(p);
      if (p.collected || p.x + p.width < -80) this.powerups.splice(i, 1);
    }

    this.updateParticles(dt, worldSpeed);
    this.updatePopups(dt);

    const total = Math.floor(this.scoreAccum);
    if (total - this.lastMilestone >= 500) {
      this.lastMilestone = Math.floor(total / 500) * 500;
      this.audio.play("milestone");
      this.hitFlash = Math.max(this.hitFlash, 0.18);
    }

    const stageIdx = Math.floor(this.scoreAccum / STAGE_LENGTH);
    if (stageIdx !== this.lastStageIndex) {
      this.lastStageIndex = stageIdx;
      this.stageBanner = STAGES[stageIdx % STAGES.length].name;
      this.stageBannerTimer = 2.4;
    }

    this.checkMission();
  }

  private updatePlayer(dt: number): void {
    this.prevPy = this.py;
    const groundY = this.groundTop() - PLAYER.height;

    if (this.onGround) this.coyoteTimer = PHYSICS.coyoteTime;
    else this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
      if (this.jumpsUsed === 0 && this.coyoteTimer > 0) {
        this.vy = PHYSICS.jumpVelocity;
        this.jumpsUsed = 1;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.audio.play("jump");
        this.spawnDust(this.px + PLAYER.width * 0.4, this.groundTop(), 7);
      } else if (this.jumpsUsed === 1) {
        this.vy = PHYSICS.doubleJumpVelocity;
        this.jumpsUsed = 2;
        this.jumpBufferTimer = 0;
        this.audio.play("doubleJump");
        this.spawnBurst(this.px + PLAYER.width / 2, this.py + PLAYER.height, "#fff3df", 8);
      }
    }

    let g = this.vy < 0 ? PHYSICS.gravityRise : PHYSICS.gravityFall;
    if (this.duckHeld && !this.onGround) g += PHYSICS.fastFallBonus;
    this.vy = Math.min(PHYSICS.maxFallSpeed, this.vy + g * dt);
    this.py += this.vy * dt;

    if (this.py >= groundY) {
      const wasAir = !this.onGround;
      this.py = groundY;
      this.vy = 0;
      this.onGround = true;
      this.jumpsUsed = 0;
      if (wasAir) this.spawnDust(this.px + PLAYER.width * 0.4, this.groundTop(), 6);
    }

    if (this.onGround && Math.random() < 0.18) {
      this.spawnDust(this.px + 6, this.groundTop(), 1);
    }
  }

  private updateAmbient(dt: number, worldSpeed: number): void {
    // birds drifting across the sky
    if (this.birds.length < 3 && Math.random() < 0.004) {
      this.birds.push({
        x: DESIGN.width + 40,
        y: rand(60, DESIGN.height * 0.42),
        phase: Math.random() * Math.PI * 2,
        speed: rand(70, 130),
      });
    }
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const b = this.birds[i];
      b.x -= (b.speed + worldSpeed * 0.08) * dt;
      b.phase += dt * 8;
      if (b.x < -60) this.birds.splice(i, 1);
    }
    // tumbleweeds rolling along the ground
    if (this.tumbleweeds.length < 2 && Math.random() < 0.0007) {
      const r = rand(16, 26);
      this.tumbleweeds.push({
        x: DESIGN.width + 40,
        y: this.groundTop() - r + 4,
        spin: 0,
        r,
      });
    }
    for (let i = this.tumbleweeds.length - 1; i >= 0; i--) {
      const t = this.tumbleweeds[i];
      t.x -= (worldSpeed * 1.1 + 120) * dt;
      t.spin += dt * 7;
      if (t.x < -60) this.tumbleweeds.splice(i, 1);
    }
  }

  private updateParticles(dt: number, worldSpeed: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.x -= worldSpeed * dt * 0.6;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
  private updatePopups(dt: number): void {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
  }

  // ---- mission -------------------------------------------------------------

  private missionValue(): number {
    if (!this.mission) return 0;
    switch (this.mission.kind) {
      case "coins":
        return this.coinCount;
      case "score":
        return this.totalScore();
      case "nearMiss":
        return this.nearMissCount;
      case "powerups":
        return this.powerupCount;
      case "distance":
        return Math.floor(this.distance / 10);
      case "golden":
        return this.goldenCount;
      default:
        return 0;
    }
  }
  private checkMission(): void {
    if (!this.mission || this.missionDone) return;
    if (this.missionValue() >= this.mission.target) {
      this.missionDone = true;
      this.scoreAccum += this.mission.reward;
      this.audio.play("mission");
      this.powerFlash = 0.6;
      this.addPopup(
        this.px + PLAYER.width / 2,
        this.py - 20,
        `Mission erfüllt! +${this.mission.reward}`,
        "#7fe08a",
        24,
      );
    }
  }

  // ---- scoring / hitboxes --------------------------------------------------

  private totalScore(): number {
    return Math.floor(this.scoreAccum);
  }
  private multiplier(): number {
    return clamp(1 + Math.max(0, this.comboCount - 1) * SCORING.comboStep, 1, SCORING.comboMax);
  }
  private playerHitbox(): Box {
    const ducking = this.duckHeld && this.onGround;
    const h = ducking ? PLAYER.duckHeight : PLAYER.height;
    const bottomY = ducking ? this.groundTop() : this.py + PLAYER.height;
    const topY = bottomY - h;
    const cx = this.px + PLAYER.width / 2;
    return {
      x: cx - PLAYER.hitWidth / 2,
      y: topY + PLAYER.hitTopInset,
      width: PLAYER.hitWidth,
      height: h - PLAYER.hitTopInset - PLAYER.hitBottomInset,
    };
  }
  private obstacleHitbox(o: Obstacle): Box {
    const inset = o.kind === "boulder" ? 6 : 5;
    return { x: o.x + inset, y: o.y + inset, width: o.width - inset * 2, height: o.height - inset * 2 };
  }
  private coinHitbox(c: Coin): Box {
    return { x: c.x + 4, y: c.y + 4, width: c.width - 8, height: c.height - 8 };
  }
  private intersects(a: Box, b: Box): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  // ---- spawning ------------------------------------------------------------

  private difficulty(): number {
    return clamp(this.totalScore() / SPAWN.difficultyRampPoints, 0, 1);
  }

  private spawnObstacle(): void {
    const gt = this.groundTop();
    const diff = this.difficulty();
    const pool: ObstacleKind[] = ["rock", "cactus"];
    if (diff > 0.2) pool.push("cactus", "drone");
    if (diff > 0.45) pool.push("cactusDouble", "boulder", "wall");
    if (diff > 0.65) pool.push("drone", "boulder", "wall");
    const kind = pool[Math.floor(Math.random() * pool.length)];

    let o: Obstacle;
    if (kind === "rock") o = this.mkObstacle(52, 50, gt - 50, kind);
    else if (kind === "cactus") o = this.mkObstacle(56, 92, gt - 92, kind);
    else if (kind === "cactusDouble") o = this.mkObstacle(104, 92, gt - 92, kind);
    else if (kind === "boulder") o = this.mkObstacle(64, 64, gt - 64, kind);
    else if (kind === "wall") o = this.mkObstacle(150, 56, gt - 56, kind);
    else o = this.mkObstacle(72, 44, gt - 104, kind);
    this.obstacles.push(o);

    const maxGap = lerp(SPAWN.maxGapSeconds, SPAWN.gapDifficultyFloor + 0.45, diff);
    const minGap = lerp(SPAWN.minGapSeconds, SPAWN.gapDifficultyFloor, diff);
    this.nextObstacleDist = this.distance + rand(minGap, maxGap) * this.speed;
  }

  private mkObstacle(width: number, height: number, y: number, kind: ObstacleKind): Obstacle {
    const x = DESIGN.width + 60;
    return { x, prevX: x, y, width, height, kind, bobPhase: 0, spin: 0, scored: false };
  }

  private spawnCoinGroup(): void {
    const gt = this.groundTop();
    // rare "coin rain" arc reward
    if (this.difficulty() > 0.25 && Math.random() < 0.16) {
      const startX = DESIGN.width + 80;
      const n = 8;
      const baseLane = gt - 90;
      for (let i = 0; i < n; i++) {
        const x = startX + i * 52;
        const baseY = baseLane - Math.sin((i / (n - 1)) * Math.PI) * 150;
        this.coins.push({
          x,
          prevX: x,
          y: baseY,
          baseY,
          width: 34,
          height: 34,
          collected: false,
          spin: Math.random() * Math.PI,
          floatPhase: Math.random() * Math.PI * 2,
          golden: false,
        });
      }
      this.nextCoinDist = this.distance + (n * 52 + 260) + SPAWN.coinGapSeconds * this.speed;
      return;
    }
    const count = 1 + Math.floor(Math.random() * 3);
    const lanes = [gt - 60, gt - 150, gt - 230];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const startX = DESIGN.width + 80;
    const golden = Math.random() < SPAWN.goldenChance;
    const goldenIdx = Math.floor(Math.random() * count);
    for (let i = 0; i < count; i++) {
      const baseY = lane + Math.sin(i * 0.9) * 26;
      const x = startX + i * 56;
      const isGold = golden && i === goldenIdx;
      this.coins.push({
        x,
        prevX: x,
        y: baseY,
        baseY,
        width: isGold ? 42 : 34,
        height: isGold ? 42 : 34,
        collected: false,
        spin: Math.random() * Math.PI,
        floatPhase: Math.random() * Math.PI * 2,
        golden: isGold,
      });
    }
    this.nextCoinDist = this.distance + SPAWN.coinGapSeconds * this.speed + rand(0, 220);
  }

  private spawnPowerUp(): void {
    const gt = this.groundTop();
    const kinds: PowerUpKind[] = ["shield", "magnet", "scoreX2", "slowmo"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const x = DESIGN.width + 100;
    const y = gt - rand(120, 210);
    this.powerups.push({
      x,
      prevX: x,
      y,
      width: 44,
      height: 44,
      kind,
      floatPhase: Math.random() * Math.PI * 2,
      collected: false,
    });
    this.nextPowerupDist =
      this.distance + rand(SPAWN.powerupEveryMinSeconds, SPAWN.powerupEveryMaxSeconds) * this.speed;
  }

  // ---- collection ----------------------------------------------------------

  private collectCoin(c: Coin): void {
    c.collected = true;
    this.coinCount++;
    if (c.golden) this.goldenCount++;
    this.comboCount++;
    if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
    this.comboTimer = SCORING.comboDecay;
    const x2 = this.scoreX2Timer > 0 ? 2 : 1;
    const goldMul = c.golden ? SCORING.goldenMultiplier : 1;
    const gained = Math.round(SCORING.coinValue * this.multiplier() * x2 * goldMul);
    this.scoreAccum += gained;
    if (c.golden) this.audio.play("golden");
    else this.audio.coinPitched(this.comboCount);
    const color = c.golden ? PALETTE.golden : PALETTE.coin;
    this.spawnBurst(c.x + c.width / 2, c.y + c.height / 2, color, c.golden ? 16 : 9);
    this.addPopup(c.x + c.width / 2, c.y, `+${gained}`, color, c.golden ? 26 : 22);
  }

  private collectPowerUp(p: PowerUp): void {
    p.collected = true;
    this.powerupCount++;
    this.audio.play("powerup");
    this.powerFlash = 0.7;
    const cx = p.x + p.width / 2;
    if (p.kind === "shield") {
      if (this.shieldActive) {
        this.scoreAccum += 100;
        this.addPopup(cx, p.y, "+100", PALETTE.shield, 24);
      } else {
        this.shieldActive = true;
        this.addPopup(cx, p.y, "SCHILD", PALETTE.shield, 24);
      }
      this.spawnBurst(cx, p.y + 20, PALETTE.shield, 16);
    } else if (p.kind === "magnet") {
      this.magnetTimer = POWERUPS.magnetDuration;
      this.addPopup(cx, p.y, "MAGNET", PALETTE.magnet, 24);
      this.spawnBurst(cx, p.y + 20, PALETTE.magnet, 16);
    } else if (p.kind === "scoreX2") {
      this.scoreX2Timer = POWERUPS.scoreX2Duration;
      this.addPopup(cx, p.y, "2X PUNKTE", PALETTE.scoreX2, 24);
      this.spawnBurst(cx, p.y + 20, PALETTE.scoreX2, 16);
    } else {
      this.slowmoTimer = POWERUPS.slowmoDuration;
      this.addPopup(cx, p.y, "ZEITLUPE", PALETTE.slowmo, 24);
      this.spawnBurst(cx, p.y + 20, PALETTE.slowmo, 16);
    }
  }

  private awardNearMiss(): void {
    this.nearMissCount++;
    const x2 = this.scoreX2Timer > 0 ? 2 : 1;
    const bonus = SCORING.nearMissBonus * x2;
    this.scoreAccum += bonus;
    this.audio.play("nearMiss");
    this.addPopup(this.px + PLAYER.width / 2, this.py - 10, `Knapp! +${bonus}`, "#ffe08a", 20);
  }

  private breakShield(_o: Obstacle): void {
    this.shieldActive = false;
    this.usedShield = true;
    this.invulnTimer = POWERUPS.shieldInvulnAfterBreak;
    this.audio.play("shieldBreak");
    this.shake = this.reducedMotion ? 6 : 16;
    this.spawnBurst(this.px + PLAYER.width / 2, this.py + PLAYER.height / 2, PALETTE.shield, 20);
    this.addPopup(this.px + PLAYER.width / 2, this.py, "Schild zerbrochen!", PALETTE.shield, 20);
  }

  private spawnDust(x: number, y: number, n: number): void {
    if (this.reducedMotion) n = Math.min(n, 2);
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + rand(-6, 6),
        y: y - rand(0, 6),
        vx: rand(-60, 10),
        vy: rand(-120, -20),
        life: rand(0.25, 0.5),
        maxLife: 0.5,
        size: rand(2, 5),
        color: "#d9b483",
        gravity: 420,
      });
    }
  }
  private spawnBurst(x: number, y: number, color: string, n: number): void {
    if (this.reducedMotion) n = Math.min(n, 6);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + rand(-0.3, 0.3);
      const sp = rand(120, 320);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: rand(0.35, 0.7),
        maxLife: 0.7,
        size: rand(3, 6),
        color,
        gravity: 520,
      });
    }
  }
  private addPopup(x: number, y: number, text: string, color: string, size: number): void {
    this.popups.push({ x, y, vy: -90, life: 0.9, maxLife: 0.9, text, color, size });
  }

  private die(): void {
    this.audio.play("hit");
    this.audio.stopMusic();
    this.shake = this.reducedMotion ? 8 : 22;
    this.hitFlash = 1;
    this.deathStart = this.animClock;
    this.spawnBurst(this.px + PLAYER.width / 2, this.py + PLAYER.height / 2, "#e8783c", 22);
    this.spawnBurst(this.px + PLAYER.width / 2, this.py + PLAYER.height / 2, "#fff3df", 14);

    const score = this.totalScore();
    const isNewBest = score > this.best;
    if (isNewBest) {
      this.best = score;
      writeBest(score);
      this.events.onBestChange?.(this.best);
    }
    const stats: RunStats = {
      score,
      coins: this.coinCount,
      goldenCoins: this.goldenCount,
      distance: Math.floor(this.distance / 10),
      maxCombo: this.maxCombo,
      nearMisses: this.nearMissCount,
      usedShield: this.usedShield,
      stageReached: STAGES[this.lastStageIndex % STAGES.length].name,
      missionLabel: this.mission?.label ?? "",
      missionCompleted: this.missionDone,
    };
    this.setPhase("dead");
    this.events.onRunEnd?.(stats, isNewBest);
  }

  // ---- rendering -----------------------------------------------------------

  private stageColors(): StageColors {
    const progress = this.scoreAccum / STAGE_LENGTH;
    const idx = Math.floor(progress) % STAGES.length;
    const frac = progress - Math.floor(progress);
    const cur = STAGES[idx];
    const next = STAGES[(idx + 1) % STAGES.length];
    const t = clamp((frac - 0.8) / 0.2, 0, 1);
    return {
      skyTop: mixHex(cur.skyTop, next.skyTop, t),
      skyBottom: mixHex(cur.skyBottom, next.skyBottom, t),
      duneFar: mixHex(cur.duneFar, next.duneFar, t),
      duneNear: mixHex(cur.duneNear, next.duneNear, t),
      ground: mixHex(cur.ground, next.ground, t),
      nightAmount: lerp(cur.night ? 1 : 0, next.night ? 1 : 0, t),
      stormAmount: lerp(cur.storm ? 1 : 0, next.storm ? 1 : 0, t),
      name: cur.name,
      index: idx,
    };
  }

  private menuStageColors(): StageColors {
    const s = STAGES[0];
    return {
      skyTop: s.skyTop,
      skyBottom: s.skyBottom,
      duneFar: s.duneFar,
      duneNear: s.duneNear,
      ground: s.ground,
      nightAmount: 0,
      stormAmount: 0,
      name: s.name,
      index: 0,
    };
  }

  private render(alpha: number): void {
    const ctx = this.ctx;
    const W = DESIGN.width;
    const H = DESIGN.height;
    ctx.imageSmoothingEnabled = false;
    const sc = this.phase === "menu" ? this.menuStageColors() : this.stageColors();

    ctx.save();
    if (this.shake > 0 && !this.reducedMotion) {
      ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
    }

    this.drawSky(ctx, W, H, sc);
    this.drawFar(ctx, W, H, alpha, sc);
    this.drawMesas(ctx, W, H, alpha, sc);
    this.drawBirds(ctx, sc);
    this.drawDunes(ctx, W, H, alpha, sc);
    this.drawGround(ctx, W, H, alpha, sc);
    this.drawTumbleweeds(ctx);
    if (this.speed > SPEED.lineThreshold && this.phase === "running") {
      this.drawSpeedLines(ctx, W, H);
    }
    this.drawPowerUps(ctx, alpha);
    this.drawCoins(ctx, alpha);
    this.drawObstacles(ctx, alpha);
    this.drawPlayer(ctx, alpha);
    this.drawParticles(ctx);
    if (sc.stormAmount > 0.02) this.drawStorm(ctx, W, H, sc.stormAmount);
    this.drawPopups(ctx);

    ctx.restore();

    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,0,0,${0.18 + sc.nightAmount * 0.18})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (this.slowmoTimer > 0) {
      ctx.fillStyle = `rgba(82,214,196,${0.1 + 0.05 * Math.sin(this.animClock * 8)})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (this.phase !== "menu") this.drawHud(ctx, W, sc);
    if (this.stageBannerTimer > 0) this.drawStageBanner(ctx, W, sc);

    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.hitFlash * 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.powerFlash > 0) {
      ctx.fillStyle = `rgba(155,89,255,${this.powerFlash * 0.18})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawSky(ctx: CanvasRenderingContext2D, W: number, H: number, sc: StageColors): void {
    const grad = ctx.createLinearGradient(0, 0, 0, H - DESIGN.groundHeight);
    grad.addColorStop(0, sc.skyTop);
    grad.addColorStop(1, sc.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (sc.nightAmount > 0.02) {
      for (const st of this.stars) {
        const tw = 0.5 + 0.5 * Math.sin(this.animClock * 2 + st.phase);
        ctx.globalAlpha = sc.nightAmount * tw;
        ctx.fillStyle = "#fff7e0";
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const sunX = W * 0.78;
    const sunY = H * 0.26;
    if (sc.nightAmount < 0.98) {
      ctx.globalAlpha = 1 - sc.nightAmount;
      const sg = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 80);
      sg.addColorStop(0, "rgba(255,236,179,0.95)");
      sg.addColorStop(1, "rgba(255,210,122,0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (sc.nightAmount > 0.02) {
      ctx.globalAlpha = sc.nightAmount;
      ctx.fillStyle = "#f2eccf";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sc.skyTop;
      ctx.beginPath();
      ctx.arc(sunX + 16, sunY - 10, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = 0.5 * (1 - sc.nightAmount) * (1 - sc.stormAmount);
    ctx.fillStyle = "#ffffff";
    const cloudOff = (this.offFar * 0.5) % (W + 300);
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 460 + cloudOff) % (W + 300)) - 150;
      this.cloud(ctx, cx, 90 + i * 46, 1 + (i % 2) * 0.3);
    }
    ctx.globalAlpha = 1;
  }
  private cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    ctx.beginPath();
    ctx.ellipse(x, y, 46 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 40 * s, y + 6 * s, 34 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 38 * s, y + 8 * s, 30 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFar(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number, sc: StageColors): void {
    const img = this.assets.ready("background");
    const skyH = H - DESIGN.groundHeight;
    if (!img) return;
    const scale = skyH / img.naturalHeight;
    const sw = img.naturalWidth * scale;
    const off = (lerp(this.prevOffFar, this.offFar, alpha) % sw) - sw;
    ctx.globalAlpha = 0.8 * (1 - sc.nightAmount * 0.6) * (1 - sc.stormAmount * 0.7);
    for (let x = off; x < W + sw; x += sw) {
      ctx.drawImage(img, x, 0, sw, skyH);
    }
    ctx.globalAlpha = 1;
  }

  private drawMesas(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number, sc: StageColors): void {
    const base = H - DESIGN.groundHeight + 16;
    const off = lerp(this.prevOffMesa, this.offMesa, alpha);
    ctx.fillStyle = mixHex(sc.duneFar, sc.skyTop, 0.4);
    ctx.globalAlpha = 0.55 * (1 - sc.stormAmount * 0.6);
    const period = 360;
    const baseIndex = Math.floor(-off / period);
    const count = Math.ceil(W / period) + 2;
    for (let i = -1; i <= count; i++) {
      const idx = baseIndex + i;
      const x = idx * period + off;
      const hgt = 92 + (((idx * 53) % 70) + 70) % 70;
      const wdt = 160 + (((idx * 31) % 90) + 90) % 90;
      const top = base - hgt;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x + 16, top + 12);
      ctx.lineTo(x + 16, top);
      ctx.lineTo(x + wdt - 16, top);
      ctx.lineTo(x + wdt - 16, top + 12);
      ctx.lineTo(x + wdt, base);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawDunes(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number, sc: StageColors): void {
    const base = H - DESIGN.groundHeight;
    const off = lerp(this.prevOffDune, this.offDune, alpha);
    this.dune(ctx, W, base + 28, off, 46, 150, sc.duneFar);
    this.dune(ctx, W, base + 56, off * 1.4, 34, 90, sc.duneNear);
  }
  private dune(ctx: CanvasRenderingContext2D, W: number, baseY: number, off: number, amp: number, wl: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, baseY + amp);
    for (let x = 0; x <= W; x += 16) {
      ctx.lineTo(x, baseY - Math.sin((x - off) / wl) * amp);
    }
    ctx.lineTo(W, baseY + amp + 200);
    ctx.lineTo(0, baseY + amp + 200);
    ctx.closePath();
    ctx.fill();
  }

  private drawGround(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number, sc: StageColors): void {
    const gy = H - DESIGN.groundHeight;
    const img = this.assets.ready("ground");
    const off = lerp(this.prevOffGround, this.offGround, alpha);
    if (img) {
      const scale = DESIGN.groundHeight / img.naturalHeight;
      const sw = img.naturalWidth * scale;
      const start = (off % sw) - sw;
      for (let x = start; x < W + sw; x += sw) {
        ctx.drawImage(img, x, gy, sw, DESIGN.groundHeight);
      }
      if (sc.nightAmount > 0.02) {
        ctx.fillStyle = `rgba(20,16,40,${sc.nightAmount * 0.5})`;
        ctx.fillRect(0, gy, W, DESIGN.groundHeight);
      }
    } else {
      ctx.fillStyle = sc.ground;
      ctx.fillRect(0, gy, W, DESIGN.groundHeight);
    }
    ctx.fillStyle = "rgba(92,58,30,0.5)";
    ctx.fillRect(0, gy, W, 4);
  }

  private drawStorm(ctx: CanvasRenderingContext2D, W: number, H: number, amount: number): void {
    ctx.fillStyle = `rgba(214,164,91,${0.22 * amount})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(245,222,179,${0.35 * amount})`;
    ctx.lineWidth = 2;
    for (const w of this.wind) {
      const x = ((W + 300 - ((this.animClock * w.speed + w.phase) % (W + 300))) + 0) - 150;
      ctx.globalAlpha = amount;
      ctx.beginPath();
      ctx.moveTo(x, w.y);
      ctx.lineTo(x + w.len, w.y + 6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawBirds(ctx: CanvasRenderingContext2D, sc: StageColors): void {
    if (this.birds.length === 0) return;
    ctx.strokeStyle = `rgba(60,44,30,${0.55 * (1 - sc.nightAmount * 0.5)})`;
    ctx.lineWidth = 2.5;
    for (const b of this.birds) {
      const flap = Math.sin(b.phase) * 6;
      ctx.beginPath();
      ctx.moveTo(b.x - 10, b.y);
      ctx.lineTo(b.x, b.y - flap);
      ctx.lineTo(b.x + 10, b.y);
      ctx.stroke();
    }
  }

  private drawTumbleweeds(ctx: CanvasRenderingContext2D): void {
    for (const t of this.tumbleweeds) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.spin);
      ctx.strokeStyle = "rgba(150,110,60,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, t.r, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * t.r, Math.sin(a) * t.r);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawSpeedLines(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const intensity = clamp((this.speed - SPEED.lineThreshold) / (SPEED.max - SPEED.lineThreshold), 0, 1);
    ctx.strokeStyle = `rgba(255,255,255,${0.12 * intensity})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = (((this.offGround * 2 + i * 130) % H) + H) % H;
      const len = 80 + (i % 3) * 50;
      ctx.beginPath();
      ctx.moveTo(W - 40 - i * 30, y);
      ctx.lineTo(W - 40 - i * 30 - len, y);
      ctx.stroke();
    }
  }

  private shadow(ctx: CanvasRenderingContext2D, cx: number, w: number, alphaMul: number): void {
    const gy = this.groundTop() + 8;
    ctx.fillStyle = `rgba(60,40,20,${0.22 * alphaMul})`;
    ctx.beginPath();
    ctx.ellipse(cx, gy, w / 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawObstacles(ctx: CanvasRenderingContext2D, alpha: number): void {
    for (const o of this.obstacles) {
      const x = lerp(o.prevX, o.x, alpha);
      const base = o.y + o.height; // ground line for this obstacle
      if (o.kind === "drone") {
        this.shadow(ctx, x + o.width / 2, o.width, 0.5);
        this.drawDrone(ctx, x, o.y + Math.sin(o.bobPhase) * 6, o.width, o.height);
        continue;
      }
      this.shadow(ctx, x + o.width / 2, o.width, 1);
      if (o.kind === "boulder") {
        this.drawBoulder(ctx, x + o.width / 2, base - o.height / 2, o.height / 2, o.spin);
        continue;
      }
      if (o.kind === "wall") {
        this.drawWall(ctx, x, o.y, o.width, o.height);
        continue;
      }
      if (o.kind === "cactusDouble") {
        const img = this.assets.ready("cactus");
        if (img) {
          this.drawSpriteGrounded(ctx, img, x + o.width * 0.3, base, o.height);
          this.drawSpriteGrounded(ctx, img, x + o.width * 0.72, base, o.height * 0.86);
        } else this.fallbackRect(ctx, x, o.y, o.width, o.height, "#2d5016");
        continue;
      }
      if (o.kind === "rock") {
        this.drawRock(ctx, x + o.width / 2, base, o.width, o.height);
        continue;
      }
      const img = this.assets.ready("cactus");
      if (img) {
        this.drawSpriteGrounded(ctx, img, x + o.width / 2, base, o.height);
      } else {
        this.fallbackRect(ctx, x, o.y, o.width, o.height, "#2d5016");
      }
    }
  }

  // Draws an image preserving aspect ratio, anchored bottom-centre on the
  // ground line so sprites never appear to float regardless of frame padding.
  private drawSpriteGrounded(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    centerX: number,
    bottomY: number,
    targetH: number,
  ): void {
    const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
    const w = targetH * aspect;
    ctx.drawImage(img, centerX - w / 2, bottomY - targetH, w, targetH);
  }

  private drawDrone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.save();
    // spinning rotors on top
    const blur = 0.5 + 0.5 * Math.sin(this.animClock * 40);
    ctx.strokeStyle = "rgba(60,44,34,0.7)";
    ctx.lineWidth = 2;
    for (const rx of [x + 8, x + w - 8]) {
      ctx.beginPath();
      ctx.moveTo(rx, y - 2);
      ctx.lineTo(rx, y + 4);
      ctx.stroke();
      ctx.fillStyle = `rgba(120,120,130,${0.3 + 0.3 * blur})`;
      ctx.beginPath();
      ctx.ellipse(rx, y - 3, 9, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // body
    ctx.fillStyle = "#46342a";
    ctx.strokeStyle = "#e8783c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // scanning eye
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 13);
    g.addColorStop(0, "#ffd27a");
    g.addColorStop(1, "rgba(232,120,60,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff3df";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    // downward sensor beam
    ctx.fillStyle = "rgba(255,210,122,0.18)";
    ctx.beginPath();
    ctx.moveTo(cx - 6, y + h - 2);
    ctx.lineTo(cx + 6, y + h - 2);
    ctx.lineTo(cx + 14, y + h + 22);
    ctx.lineTo(cx - 14, y + h + 22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // A proper round rolling boulder (procedural) so it reads clearly as a hazard.
  private drawBoulder(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, spin: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    g.addColorStop(0, "#9a8270");
    g.addColorStop(1, "#5f4a38");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a3829";
    ctx.lineWidth = 2;
    ctx.stroke();
    // craters that rotate to show rolling motion
    ctx.rotate(spin);
    ctx.fillStyle = "rgba(74,56,41,0.6)";
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 * i) / 4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // A natural rounded rock sitting on the ground (clearly a hazard, not loot).
  private drawRock(ctx: CanvasRenderingContext2D, cx: number, base: number, w: number, h: number): void {
    ctx.save();
    ctx.translate(cx, base);
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, "#a89274");
    g.addColorStop(1, "#6e573f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.quadraticCurveTo(-w / 2, -h * 0.95, -w * 0.1, -h);
    ctx.quadraticCurveTo(w * 0.35, -h, w / 2, -h * 0.45);
    ctx.quadraticCurveTo(w / 2, 0, w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#4a3829";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(74,56,41,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.18, -h * 0.62);
    ctx.lineTo(w * 0.08, -h * 0.12);
    ctx.stroke();
    ctx.restore();
  }

  private drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = "#8a5a36";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#6e4527";
    const bh = h / 3;
    for (let row = 0; row < 3; row++) {
      const off = row % 2 === 0 ? 0 : 18;
      for (let bx = x - off; bx < x + w; bx += 36) {
        ctx.strokeStyle = "#5a3820";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, y + row * bh, 36, bh);
      }
    }
    ctx.fillStyle = "#a06a40";
    ctx.fillRect(x, y, w, 6);
  }
  private fallbackRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  private drawCoins(ctx: CanvasRenderingContext2D, alpha: number): void {
    const img = this.assets.ready("coin");
    for (const c of this.coins) {
      if (c.collected) continue;
      const x = lerp(c.prevX, c.x, alpha);
      const squash = Math.abs(Math.cos(c.spin));
      const w = c.width * (0.35 + 0.65 * squash);
      const drawX = x + (c.width - w) / 2;
      if (c.golden) {
        const cx = x + c.width / 2;
        const cy = c.y + c.height / 2;
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, c.width);
        g.addColorStop(0, "rgba(255,215,0,0.7)");
        g.addColorStop(1, "rgba(255,215,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, c.width, 0, Math.PI * 2);
        ctx.fill();
      }
      if (img) {
        ctx.save();
        if (c.golden) ctx.filter = "saturate(1.6) brightness(1.25)";
        ctx.drawImage(img, drawX, c.y, w, c.height);
        ctx.restore();
      } else {
        ctx.fillStyle = c.golden ? PALETTE.golden : PALETTE.coin;
        ctx.beginPath();
        ctx.ellipse(x + c.width / 2, c.y + c.height / 2, w / 2, c.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawPowerUps(ctx: CanvasRenderingContext2D, alpha: number): void {
    for (const p of this.powerups) {
      if (p.collected) continue;
      const x = lerp(p.prevX, p.x, alpha);
      const y = p.y + Math.sin(p.floatPhase) * 6;
      const cx = x + p.width / 2;
      const cy = y + p.height / 2;
      const color = this.powerColor(p.kind);
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, p.width);
      glow.addColorStop(0, color);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, p.width, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, p.width / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = "bold 22px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.powerGlyph(p.kind), cx, cy + 1);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }
  private powerColor(k: PowerUpKind): string {
    return k === "shield"
      ? PALETTE.shield
      : k === "magnet"
        ? PALETTE.magnet
        : k === "scoreX2"
          ? PALETTE.scoreX2
          : PALETTE.slowmo;
  }
  private powerGlyph(k: PowerUpKind): string {
    return k === "shield" ? "🛡" : k === "magnet" ? "🧲" : k === "scoreX2" ? "2×" : "⏱";
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, alpha: number): void {
    const y = lerp(this.prevPy, this.py, alpha);
    const ducking = this.duckHeld && this.onGround && this.phase === "running";
    const h = ducking ? PLAYER.duckHeight : PLAYER.height;
    // ground line the dino stands on (feet)
    let baseY = ducking ? this.groundTop() : y + PLAYER.height;

    // death tumble
    let rot = 0;
    if (this.phase === "dead") {
      const t = this.animClock - this.deathStart;
      rot = t * 6;
      baseY = y + PLAYER.height - (260 * t - 520 * t * t);
    }

    if (this.phase !== "dead") {
      this.shadow(ctx, this.px + PLAYER.width / 2, PLAYER.width * 0.8, this.onGround ? 1 : 0.5);
    }

    const blink = this.invulnTimer > 0 && Math.floor(this.animClock * 14) % 2 === 0;
    // always use the dino run frames (never the idle figure)
    const frame = this.onGround && this.phase === "running"
      ? Math.floor(this.runClock / 0.1) % 2
      : 0;
    const img =
      this.assets.ready(frame === 0 ? "playerRun1" : "playerRun2") ??
      this.assets.ready("playerRun1");

    const centerX = this.px + PLAYER.width / 2;
    const dh = h;
    const dw = PLAYER.drawWidth * (h / PLAYER.height);

    if (!blink) {
      ctx.save();
      if (rot !== 0) {
        ctx.translate(centerX, baseY - dh / 2);
        ctx.rotate(rot);
        ctx.translate(-centerX, -(baseY - dh / 2));
      }
      if (this.phase === "running" && !this.onGround && !ducking) {
        const k = clamp(this.vy / 1400, -1, 1);
        const sy = 1 - k * 0.12;
        const sx = 1 + k * 0.1;
        ctx.translate(centerX, baseY);
        ctx.scale(sx, sy);
        ctx.translate(-centerX, -baseY);
      }
      if (this.skinHue !== 0) ctx.filter = `hue-rotate(${this.skinHue}deg)`;
      if (img) ctx.drawImage(img, centerX - dw / 2, baseY - dh, dw, dh);
      else {
        ctx.fillStyle = "#d2691e";
        ctx.fillRect(centerX - dw / 2, baseY - dh, dw, dh);
      }
      ctx.restore();
    }

    if (this.shieldActive && this.phase !== "dead") {
      ctx.strokeStyle = PALETTE.shield;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.animClock * 6);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, baseY - dh / 2, dw * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPopups(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = "center";
    for (const p of this.popups) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `bold ${p.size}px ui-monospace, monospace`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.fillStyle = p.color;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  private drawHud(ctx: CanvasRenderingContext2D, W: number, sc: StageColors): void {
    const night = sc.nightAmount > 0.5;
    const textC = night ? PALETTE.hudTextNight : PALETTE.hudText;
    const shadowC = night ? PALETTE.hudShadowNight : PALETTE.hudShadow;
    ctx.textBaseline = "top";
    ctx.lineWidth = 4;

    const score = this.totalScore();
    ctx.font = "bold 44px ui-monospace, 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.strokeStyle = shadowC;
    ctx.fillStyle = textC;
    ctx.strokeText(String(score), W - 28, 22);
    ctx.fillText(String(score), W - 28, 22);
    ctx.font = "bold 20px ui-monospace, 'Courier New', monospace";
    ctx.strokeText(`BEST ${this.best}`, W - 28, 74);
    ctx.fillText(`BEST ${this.best}`, W - 28, 74);
    ctx.font = "bold 16px ui-monospace, 'Courier New', monospace";
    ctx.strokeText(`${Math.floor(this.distance / 10)} m`, W - 28, 100);
    ctx.fillText(`${Math.floor(this.distance / 10)} m`, W - 28, 100);

    ctx.textAlign = "left";
    ctx.font = "bold 32px ui-monospace, 'Courier New', monospace";
    ctx.fillStyle = PALETTE.coin;
    ctx.beginPath();
    ctx.arc(44, 40, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shadowC;
    ctx.fillStyle = textC;
    ctx.strokeText(String(this.coinCount), 68, 24);
    ctx.fillText(String(this.coinCount), 68, 24);

    const mult = this.multiplier();
    if (mult > 1) {
      ctx.font = "bold 26px ui-monospace, 'Courier New', monospace";
      ctx.fillStyle = PALETTE.combo;
      ctx.strokeStyle = shadowC;
      const label = `x${mult.toFixed(2).replace(/\.?0+$/, "")}`;
      ctx.strokeText(label, 28, 66);
      ctx.fillText(label, 28, 66);
      const frac = clamp(this.comboTimer / SCORING.comboDecay, 0, 1);
      ctx.fillStyle = "rgba(120,80,40,0.3)";
      ctx.fillRect(28, 100, 120, 8);
      ctx.fillStyle = PALETTE.combo;
      ctx.fillRect(28, 100, 120 * frac, 8);
    }

    // mission
    if (this.mission) {
      const val = Math.min(this.missionValue(), this.mission.target);
      ctx.font = "bold 16px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = this.missionDone ? "#7fe08a" : textC;
      ctx.strokeStyle = shadowC;
      const txt = this.missionDone
        ? `✓ ${this.mission.label}`
        : `${this.mission.label}  ${val}/${this.mission.target}`;
      ctx.strokeText(txt, 28, 124);
      ctx.fillText(txt, 28, 124);
    }

    const active: Array<{ c: string; t: number; max: number; g: string }> = [];
    if (this.shieldActive) active.push({ c: PALETTE.shield, t: 1, max: 1, g: "🛡" });
    if (this.magnetTimer > 0) active.push({ c: PALETTE.magnet, t: this.magnetTimer, max: POWERUPS.magnetDuration, g: "🧲" });
    if (this.scoreX2Timer > 0) active.push({ c: PALETTE.scoreX2, t: this.scoreX2Timer, max: POWERUPS.scoreX2Duration, g: "2×" });
    if (this.slowmoTimer > 0) active.push({ c: PALETTE.slowmo, t: this.slowmoTimer, max: POWERUPS.slowmoDuration, g: "⏱" });
    let ix = W / 2 - (active.length * 60) / 2;
    for (const a of active) {
      this.drawTimerBadge(ctx, ix + 26, 40, a.c, a.t / a.max, a.g);
      ix += 60;
    }
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
  }

  private drawTimerBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, frac: number, glyph: string): void {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(frac, 0, 1));
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, cx, cy + 1);
  }

  private drawStageBanner(ctx: CanvasRenderingContext2D, W: number, sc: StageColors): void {
    const a = clamp(this.stageBannerTimer / 0.6, 0, 1);
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.font = "bold 40px ui-monospace, monospace";
    ctx.lineWidth = 5;
    ctx.strokeStyle = sc.nightAmount > 0.5 ? PALETTE.hudShadowNight : PALETTE.hudShadow;
    ctx.fillStyle = sc.nightAmount > 0.5 ? PALETTE.hudTextNight : PALETTE.hudText;
    ctx.strokeText(this.stageBanner, W / 2, 150);
    ctx.fillText(this.stageBanner, W / 2, 150);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}
