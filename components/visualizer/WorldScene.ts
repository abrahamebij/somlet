/* eslint-disable @typescript-eslint/no-explicit-any */
import type PhaserType from "phaser";
import {
  TILE, S,
  WORLD_W, WORLD_H, FENCE_INSET,
  WP_C1, WP_C2, WP_R1, WP_R2,
  V_MID, H_MID,
  CHICK_FRAME_W, CHICK_FRAME_H, CHICK_DISPLAY, CHICK_ANIMS,
  FENCE_TILES, FE,
  WATER_CENTER_X, WATER_CENTER_Y, WATER_RADIUS,
  WATER2_CENTER_X, WATER2_CENTER_Y,
  WP2_C1, WP2_C2, WP2_R1, WP2_R2,
  CHORUS_INTERVAL, CHORUS_FRACTION, CHORUS_WALK_SPEED,
  MORSE_DOT, MORSE_DASH, MORSE_GAP, MORSE_WORD_GAP,
  buildGroundLayer, buildDecorations,
} from "@/config/worldConfig";
import { useWorldStore, type Chick } from "@/store/useWorldStore";
import { useSomletStore } from "@/store/useSomletStore";

// ── Constants ─────────────────────────────────────────────────────────────────

const WALK_SPEED     = 40;
const IDLE_DURATION  = () => 800  + Math.random() * 1600;
const WALK_DURATION  = () => 1000 + Math.random() * 2000;
const DRINK_DURATION = 3000;
const WATER_APPROACH = WATER_RADIUS * 1.8;

// ── ChorusOrchestrator ────────────────────────────────────────────────────────
// Manages the 60s gathering cycle entirely outside the per-frame update loop.

type SpriteMap = Map<string, PhaserType.GameObjects.Sprite>;

class ChorusOrchestrator {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private scene: any; // Phaser scene ref

  constructor(scene: any) {
    this.scene = scene;
  }

  start() {
    this.scheduleNext();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private scheduleNext() {
    this.timer = setTimeout(() => this.runGathering(), CHORUS_INTERVAL);
  }

  private async runGathering() {
    if (this.active) { this.scheduleNext(); return; }
    this.active = true;

    const store = useWorldStore.getState();
    const sprites = this.scene.sprites as SpriteMap;

    // Pick ~1/3 of alive, non-dying chicks
    const eligible = [...store.chicks.values()].filter(
      (c) => c.state !== "death" && sprites.has(c.id),
    );
    const count = Math.max(1, Math.floor(eligible.length * CHORUS_FRACTION));
    const chosen = eligible.sort(() => Math.random() - 0.5).slice(0, count);
    if (chosen.length === 0) { this.active = false; this.scheduleNext(); return; }

    // Random gather point — away from water and fence edges
    const gx = FENCE_INSET * 2 + Math.random() * (WORLD_W - FENCE_INSET * 4);
    const gy = FENCE_INSET * 2 + Math.random() * (WORLD_H - FENCE_INSET * 4);

    // ── Phase 1: walk to gather point ──────────────────────────────────────
    chosen.forEach((chick) => {
      store.updateChick(chick.id, { state: "gather", isGathering: true, vx: 0, vy: 0 });
      const sprite = sprites.get(chick.id)!;
      const body = (sprite as any).body as PhaserType.Physics.Arcade.Body;
      const angle = Math.atan2(gy - sprite.y, gx - sprite.x);
      const vx = Math.cos(angle) * CHORUS_WALK_SPEED;
      const vy = Math.sin(angle) * CHORUS_WALK_SPEED;
      body?.setVelocity(vx, vy);
      sprite.play("chick-walk", true);
      sprite.setFlipX(vx < 0);
    });

    // Wait until they're close enough OR timeout after 6s
    await this.waitUntilArrived(chosen, gx, gy, sprites, 6000);

    // ── Phase 2: stop, face screen, pause ──────────────────────────────────
    chosen.forEach((chick) => {
      const sprite = sprites.get(chick.id);
      if (!sprite) return;
      const body = (sprite as any).body as PhaserType.Physics.Arcade.Body;
      body?.setVelocity(0, 0);
      sprite.setFlipX(false);
      sprite.play("chick-idle", true);
    });

    await this.wait(400); // brief pause before clucking

    // ── Phase 3: morse cluck sequence ──────────────────────────────────────
    // Generate a random morse pattern: 2–4 "words" of 2–4 symbols each
    const pattern = this.generateMorse();
    await this.playMorse(pattern, chosen, sprites);

    // ── Phase 4: scatter back to wandering ─────────────────────────────────
    chosen.forEach((chick) => {
      const sprite = sprites.get(chick.id);
      if (!sprite) return;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * WALK_SPEED;
      const vy = Math.sin(angle) * WALK_SPEED;
      const body = (sprite as any).body as PhaserType.Physics.Arcade.Body;
      body?.setVelocity(vx, vy);
      sprite.play("chick-walk", true);
      sprite.setFlipX(vx < 0);
      store.updateChick(chick.id, {
        state: "walk",
        stateTimer: WALK_DURATION(),
        isGathering: false,
        vx, vy,
        facingLeft: vx < 0,
      });
    });

    this.active = false;
    this.scheduleNext();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private wait(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }

  private waitUntilArrived(
    chicks: Chick[],
    gx: number,
    gy: number,
    sprites: SpriteMap,
    timeout: number,
  ): Promise<void> {
    return new Promise((res) => {
      const ARRIVE_DIST = S * 3;
      const start = Date.now();
      const check = () => {
        if (Date.now() - start > timeout) { res(); return; }
        const allClose = chicks.every((c) => {
          const sp = sprites.get(c.id);
          if (!sp) return true;
          return Math.hypot(sp.x - gx, sp.y - gy) < ARRIVE_DIST;
        });
        if (allClose) res();
        else setTimeout(check, 80);
      };
      check();
    });
  }

  private generateMorse(): ("dot" | "dash")[][] {
    // 2–4 words, each with 2–4 symbols
    const wordCount = 2 + Math.floor(Math.random() * 3);
    return Array.from({ length: wordCount }, () => {
      const symCount = 2 + Math.floor(Math.random() * 3);
      return Array.from({ length: symCount }, () =>
        Math.random() < 0.5 ? "dot" : "dash",
      );
    });
  }

  private async playMorse(
    pattern: ("dot" | "dash")[][],
    chicks: Chick[],
    sprites: SpriteMap,
  ) {
    for (const word of pattern) {
      for (const sym of word) {
        const duration = sym === "dot" ? MORSE_DOT : MORSE_DASH;

        // Visual pulse — scale up slightly + tint warm white
        chicks.forEach((chick) => {
          const sprite = sprites.get(chick.id);
          if (!sprite) return;
          const d = CHICK_DISPLAY;
          this.scene.tweens.add({
            targets: sprite,
            displayWidth: d * 1.35,
            displayHeight: d * 1.35,
            duration: 80,
            yoyo: true,
            onStart: () => sprite.setTint(0xfffbe6),
            onComplete: () => sprite.clearTint(),
          });
        });

        // Audio — base + two pitch-shifted echoes for reverb effect
        // sound.add() creates a fresh instance each call so sounds overlap freely
        const base = sym === "dot" ? "cluck-dot" : "cluck-dash";
        const hi = sym === "dot" ? "cluck-dot-hi" : "cluck-dash-hi";
        const lo = sym === "dot" ? "cluck-dot-lo" : "cluck-dash-lo";

        const playOnce = (key: string, volume: number) => {
          const snd = this.scene.sound.add(key, { volume });
          snd.once("complete", () => snd.destroy());
          snd.play();
        };

        playOnce(base, 0.9);
        setTimeout(() => playOnce(hi, 0.45), 80);
        setTimeout(() => playOnce(lo, 0.28), 160);

        await this.wait(duration + MORSE_GAP);
      }
      await this.wait(MORSE_WORD_GAP);
    }
  }
}

// ── WorldScene ────────────────────────────────────────────────────────────────

export class WorldScene extends (globalThis.Phaser?.Scene ?? class {}) {
  private sprites = new Map<string, PhaserType.GameObjects.Sprite>();
  private pendingRemoval = new Set<string>();
  private selectionGlow!: PhaserType.GameObjects.Graphics;
  private chorus!: ChorusOrchestrator;
  private firstChickHatched = false;

  constructor() { super({ key: "WorldScene" }); }

  shutdown(this: PhaserType.Scene & WorldScene) {
    this.chorus?.stop();
  }

  // ── Preload ──────────────────────────────────────────────────────────────────
  preload(this: PhaserType.Scene & WorldScene) {
    this.load.spritesheet("tiles",  "/assets/Set_1_2.png",                  { frameWidth: TILE,          frameHeight: TILE          });
    this.load.spritesheet("fences", "/assets/fences_and_ladders_etc.png",   { frameWidth: TILE,          frameHeight: TILE          });
    this.load.spritesheet("chick",  "/assets/chick_spritesheet_clean.png",  { frameWidth: CHICK_FRAME_W, frameHeight: CHICK_FRAME_H });
    this.load.spritesheet("fire", "/assets/fire_spritesheet.png", { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet("egg", "/assets/egg_hatch.png", { frameWidth: 48, frameHeight: 48 });
    this.load.audio("cluck-dot", "/assets/cluck-dot.mp3");
    this.load.audio("cluck-dash", "/assets/cluck-dash.mp3");
    this.load.audio("cluck-dot-hi", "/assets/cluck-dot-hi.mp3");
    this.load.audio("cluck-dot-lo", "/assets/cluck-dot-lo.mp3");
    this.load.audio("cluck-dash-hi", "/assets/cluck-dash-hi.mp3");
    this.load.audio("cluck-dash-lo", "/assets/cluck-dash-lo.mp3");
  }

  // ── Create ───────────────────────────────────────────────────────────────────
  create(this: PhaserType.Scene & WorldScene) {
    this.drawGround();
    this.drawWater();
    this.drawDecorations();
    this.drawFences();
    this.createAnimations();

    this.input.on("pointerdown", (ptr: PhaserType.Input.Pointer) => {
      if (useWorldStore.getState().fireModeActive) {
        this.handleFireClick(ptr.worldX, ptr.worldY);
      }
    });

    (this.physics as PhaserType.Physics.Arcade.ArcadePhysics)
      .world.setBounds(FENCE_INSET, FENCE_INSET, WORLD_W - FENCE_INSET * 2, WORLD_H - FENCE_INSET * 2);

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.centerOn(WORLD_W / 2, WORLD_H / 2);
    this.cameras.main.setBackgroundColor("#0a1a0a");

    // Selection indicator — drawn above ground, below chicks
    this.selectionGlow = this.add.graphics().setDepth(1);

    // Start the gathering chorus cycle
    this.chorus = new ChorusOrchestrator(this);
    this.chorus.start();

    // Continuous ambient cluck loop — starts only after user unlocks audio
    this.startAmbientClucks();

    // Signal to Visualizer that the game is ready to receive events
    useSomletStore.getState().setGameReady(true);
  }

  // ── Update ───────────────────────────────────────────────────────────────────
  update(this: PhaserType.Scene & WorldScene, _time: number, delta: number) {
    const store = useWorldStore.getState();

    // ── Drain one pending spawn per frame ─────────────────────────────────
    const pending = store.drainSpawn();
    if (pending) {
      const aliveSprites = [...this.sprites.values()].filter((s) => s.active);

      if (aliveSprites.length === 0 || !this.firstChickHatched) {
        // No alive chicks — egg hatch at world center
        store.spawnChick(pending.event, pending.id, WORLD_W / 2, WORLD_H / 2);
      } else {
        // Pick a random alive parent → replicate from it
        const parent = aliveSprites[Math.floor(Math.random() * aliveSprites.length)];
        store.spawnChick(pending.event, pending.id, parent.x, parent.y);
        this.replicateChick(parent);
      }
    }

    // Spawn sprites for new chicks that were just added to the store
    store.chicks.forEach((chick) => {
      if (!this.sprites.has(chick.id)) this.spawnSprite(chick);
    });

    // ── Selection glow — hidden during fire mode ──────────────────────────
    this.selectionGlow.clear();
    const fireModeActive = store.fireModeActive;
    const selectedId = store.selectedChickId;
    if (selectedId && !fireModeActive) {
      const selectedSprite = this.sprites.get(selectedId);
      if (selectedSprite && selectedSprite.active) {
        const r = CHICK_DISPLAY * 0.55;
        // Outer soft ring
        this.selectionGlow.lineStyle(3, 0xc8f03a, 0.6);
        this.selectionGlow.strokeCircle(selectedSprite.x, selectedSprite.y, r);
        // Inner fill pulse — static alpha, animation handled by tween below
        this.selectionGlow.fillStyle(0xc8f03a, 0.12);
        this.selectionGlow.fillCircle(selectedSprite.x, selectedSprite.y, r);
      }
    }

    // Tick each sprite
    this.sprites.forEach((sprite, id) => {
      const chick = store.chicks.get(id);
      if (!chick) {
        // Removed from store after death fade — clean up Phaser side
        sprite.destroy();
        this.sprites.delete(id);
        this.pendingRemoval.delete(id);
        return;
      }
      this.tickChick(chick, sprite, delta, store);
    });
  }

  // ── Spawn sprite ─────────────────────────────────────────────────────────────
  private spawnSprite(this: PhaserType.Scene & WorldScene, chick: Chick) {
    const sprite = (this.physics as PhaserType.Physics.Arcade.ArcadePhysics)
      .add.sprite(chick.spawnX, chick.spawnY, "chick", CHICK_ANIMS.idle.frames[0])
      .setDisplaySize(CHICK_DISPLAY, CHICK_DISPLAY)
      .setOrigin(0.5, 0.5)
      .setCollideWorldBounds(true)
      .setBounce(0.4)
      .setDepth(2); // above selectionGlow (depth 1)

    sprite.setInteractive();

    sprite.on("pointerdown", () => {
      useWorldStore.getState().selectChick(chick.id);
      useSomletStore.getState().selectSomlet(chick.id);
    });

    sprite.on("pointerover", () => {
      if (useWorldStore.getState().fireModeActive) return; // fire mode — no highlight
      sprite.setTint(0xff2222);
      (this as any).input.setDefaultCursor("pointer");
    });
    sprite.on("pointerout", () => {
      sprite.clearTint();
      if (!useWorldStore.getState().fireModeActive) {
        (this as any).input.setDefaultCursor("default");
      }
    });

    sprite.play("chick-idle");

    // First chick ever gets the egg hatch intro
    if (!this.firstChickHatched) {
      this.firstChickHatched = true;
      this.playEggHatch(sprite, chick.spawnX, chick.spawnY);
    }

    this.sprites.set(chick.id, sprite);
  }

  // ── AI tick ──────────────────────────────────────────────────────────────────
  private tickChick(
    chick: Chick,
    sprite: PhaserType.GameObjects.Sprite,
    delta: number,
    store: ReturnType<typeof useWorldStore.getState>,
  ) {
    const body = (sprite as any).body as PhaserType.Physics.Arcade.Body;

    // ── #7 Death guard — must be first, no fallthrough ───────────────────────
    if (chick.state === "death") {
      if (!this.pendingRemoval.has(chick.id)) {
        this.pendingRemoval.add(chick.id);
        body?.setVelocity(0, 0);
        sprite.play("chick-death");
        sprite.once("animationcomplete-chick-death", () => {
          (this as any).tweens.add({
            targets: sprite,
            alpha: 0,
            duration: 400,
            onComplete: () => {
              const s = useWorldStore.getState();
              const next = new Map(s.chicks);
              next.delete(chick.id);
              useWorldStore.setState({ chicks: next });
            },
          });
        });
      }
      return; // nothing else runs while dying
    }

    // ── Gathering guard — chorus orchestrator owns these chicks ─────────────
    if (chick.state === "gather") {
      // Still tick lifespan so they can die naturally mid-gathering
      const newLifespan = chick.lifespanTimer - delta;
      if (newLifespan <= 0) { store.killChick(chick.id); return; }
      store.updateChick(chick.id, { lifespanTimer: newLifespan });
      return;
    }

    // ── #7 Lifespan — checked AFTER death guard ──────────────────────────────
    const newLifespan = chick.lifespanTimer - delta;
    if (newLifespan <= 0) {
      store.killChick(chick.id);
      return;
    }

    // ── Near water → drink ───────────────────────────────────────────────────
    const distToWater1 = Math.hypot(sprite.x - WATER_CENTER_X, sprite.y - WATER_CENTER_Y);
    const distToWater2 = Math.hypot(sprite.x - WATER2_CENTER_X, sprite.y - WATER2_CENTER_Y);
    const distToWater = Math.min(distToWater1, distToWater2);
    const nearestWaterX = distToWater1 < distToWater2 ? WATER_CENTER_X : WATER2_CENTER_X;
    const nearestWaterY = distToWater1 < distToWater2 ? WATER_CENTER_Y : WATER2_CENTER_Y;
    if (chick.state !== "drink" && distToWater < WATER_RADIUS + 8) {
      body?.setVelocity(0, 0);
      sprite.play("chick-drink", true);
      // ── #2 Single batched update — no x/y, just state machine ───────────
      store.updateChick(chick.id, {
        state: "drink", stateTimer: DRINK_DURATION,
        lifespanTimer: newLifespan,
        vx: 0, vy: 0,
      });
      return;
    }

    // ── State timer ──────────────────────────────────────────────────────────
    const newTimer = chick.stateTimer - delta;

    if (newTimer <= 0) {
      if (chick.state === "idle") {
        const walkToWater = distToWater < WATER_APPROACH && Math.random() < 0.25;
        let vx: number, vy: number;
        if (walkToWater) {
          const angle = Math.atan2(nearestWaterY - sprite.y, nearestWaterX - sprite.x);
          vx = Math.cos(angle) * WALK_SPEED;
          vy = Math.sin(angle) * WALK_SPEED;
        } else {
          const angle = Math.random() * Math.PI * 2;
          vx = Math.cos(angle) * WALK_SPEED;
          vy = Math.sin(angle) * WALK_SPEED;
        }
        body?.setVelocity(vx, vy);
        sprite.play("chick-walk", true);
        sprite.setFlipX(vx < 0);
        // ── #2 One update call per transition ───────────────────────────────
        store.updateChick(chick.id, {
          state: "walk", stateTimer: WALK_DURATION(),
          lifespanTimer: newLifespan,
          vx, vy, facingLeft: vx < 0,
        });
      } else {
        // walk or drink → idle
        body?.setVelocity(0, 0);
        sprite.play("chick-idle", true);
        store.updateChick(chick.id, {
          state: "idle", stateTimer: IDLE_DURATION(),
          lifespanTimer: newLifespan,
          vx: 0, vy: 0,
        });
      }
    } else {
      // ── #9 Bounce — re-randomise direction instead of perfect reflect ────
      let newVx = chick.vx;
      let newVy = chick.vy;
      let bounced = false;

      if (body && (body.blocked.left || body.blocked.right)) {
        newVx = -chick.vx + (Math.random() - 0.5) * 10; // slight wobble
        sprite.setFlipX(newVx < 0);
        bounced = true;
      }
      if (body && (body.blocked.up || body.blocked.down)) {
        newVy = -chick.vy + (Math.random() - 0.5) * 10;
        bounced = true;
      }

      if (bounced) {
        body?.setVelocity(newVx, newVy);
        // ── #2 Single batched update including lifespan ──────────────────
        store.updateChick(chick.id, {
          vx: newVx, vy: newVy,
          facingLeft: newVx < 0,
          lifespanTimer: newLifespan,
          stateTimer: newTimer,
        });
      } else {
        // ── #2 Only update timers — NO x/y write ────────────────────────
        store.updateChick(chick.id, {
          stateTimer: newTimer,
          lifespanTimer: newLifespan,
        });
      }
    }
  }

  private startAmbientClucks(this: PhaserType.Scene & WorldScene) {
    const playOnce = (key: string, volume: number) => {
      const snd = (this.sound as any).add(key, { volume });
      snd.once("complete", () => snd.destroy());
      snd.play();
    };

    const scheduleNext = () => {
      // Only cluck if audio is unlocked and there are alive chicks
      const { audioUnlocked, chicks } = useWorldStore.getState();
      if (!audioUnlocked) {
        // Poll until unlocked
        setTimeout(scheduleNext, 300);
        return;
      }

      // Resume Phaser's Web Audio context (in case browser suspended it)
      const soundManager = this.sound as any;
      if (soundManager.context?.state === "suspended") {
        soundManager.context.resume();
      }

      if (chicks.size > 0) {
        const variants = ["cluck-dot", "cluck-dot-hi", "cluck-dot-lo", "cluck-dash", "cluck-dash-hi", "cluck-dash-lo"];
        const key = variants[Math.floor(Math.random() * variants.length)];
        const volume = 0.2 + Math.random() * 0.4;
        playOnce(key, volume);

        if (Math.random() < 0.4) {
          const key2 = variants[Math.floor(Math.random() * variants.length)];
          setTimeout(() => playOnce(key2, 0.15 + Math.random() * 0.2), 60 + Math.random() * 100);
        }
      }

      const nextDelay = 300 + Math.random() * 600;
      setTimeout(scheduleNext, nextDelay);
    };

    setTimeout(scheduleNext, 800);
  }

  private replicateChick(this: PhaserType.Scene & WorldScene, parent: PhaserType.GameObjects.Sprite) {
    const origY = parent.y;
    const origX = parent.x;

    // Parent jumps up slightly then lands
    (this as any).tweens.add({
      targets: parent,
      y: origY - 18,
      duration: 130,
      ease: "Quad.easeOut",
      yoyo: true,
      onComplete: () => {
        // Flash white on landing
        parent.setTint(0xffffff);
        (this as any).time.delayedCall(80, () => parent.clearTint());
      },
    });

    // Brief particle-like flash at jump point
    const flash = this.add.graphics().setDepth(4);
    flash.fillStyle(0xfffbe6, 0.7);
    flash.fillCircle(origX, origY - 10, 10);
    (this as any).tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  private playEggHatch(this: PhaserType.Scene & WorldScene, chickSprite: PhaserType.GameObjects.Sprite, x: number, y: number) {
    // Hide the chick until the egg hatches
    chickSprite.setAlpha(0);

    // Egg sprite sits on top, same position
    const egg = this.add.sprite(x, y, "egg", 0)
      .setDisplaySize(CHICK_DISPLAY * 1.1, CHICK_DISPLAY * 1.1)
      .setOrigin(0.5, 0.5)
      .setDepth(3);

    // Wobble tween before cracking (frames 0-1)
    (this as any).tweens.add({
      targets: egg,
      x: x + 3,
      duration: 120,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // Play full hatch animation
        egg.play("egg-hatch");
        egg.once("animationcomplete-egg-hatch", () => {
          // Fade out egg, fade in chick
          (this as any).tweens.add({
            targets: egg,
            alpha: 0,
            duration: 80,
            onComplete: () => egg.destroy(),
          });
          (this as any).tweens.add({
            targets: chickSprite,
            alpha: 1,
            duration: 80,
          });
        });
      },
    });
  }

  // ── Fire click ───────────────────────────────────────────────────────────────
  private handleFireClick(this: PhaserType.Scene & WorldScene, wx: number, wy: number) {
    const FIRE_RADIUS = S * 2.5;
    const FIRE_DURATION = 2200;
    const FIRE_COUNT = 7;

    for (let i = 0; i < FIRE_COUNT; i++) {
      const angle = (i / FIRE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
      const dist = Math.random() * S * 0.9;          // tighter cluster
      const fx = wx + Math.cos(angle) * dist;
      const fy = wy + Math.sin(angle) * dist;
      const size = (10 + Math.random() * 8) * (S / 32); // tiny: ~10–18px
      const delay = i * 60;

      const flame = this.add.sprite(fx, fy, "fire", 0)
        .setDisplaySize(size, size * 1.3)  // slightly taller than wide
        .setOrigin(0.5, 1)
        .setDepth(5)
        .setAlpha(0);

      (this as any).tweens.add({
        targets: flame,
        alpha: { from: 0, to: 0.88 },
        duration: 120,
        delay,
        onStart: () => flame.play("fire-burn"),
        onComplete: () => {
          (this as any).tweens.add({
            targets: flame,
            alpha: 0,
            duration: 400,
            delay: FIRE_DURATION,
            onComplete: () => flame.destroy(),
          });
        },
      });
    }

    const store = useWorldStore.getState();
    this.sprites.forEach((sprite, id) => {
      if (Math.hypot(sprite.x - wx, sprite.y - wy) < FIRE_RADIUS) {
        store.killChick(id);
      }
    });
  }

  // ── Animations ───────────────────────────────────────────────────────────────
  private createAnimations(this: PhaserType.Scene & WorldScene) {
    const anims = (this as any).anims as PhaserType.Animations.AnimationManager;
    if (anims.exists("chick-idle")) return;

    // Chick animations
    Object.entries(CHICK_ANIMS).forEach(([key, cfg]) => {
      anims.create({
        key:       `chick-${key}`,
        frames: anims.generateFrameNumbers("chick", { frames: cfg.frames as unknown as number[] }),
        frameRate: cfg.frameRate,
        repeat:    cfg.repeat,
      });
    });

    // Fire animation — 8 frames, loops
    anims.create({
      key: "fire-burn",
      frames: anims.generateFrameNumbers("fire", { start: 0, end: 7 }),
      frameRate: 14,
      repeat: -1,
    });

    // Egg hatch — 8 frames, plays once
    anims.create({
      key: "egg-hatch",
      frames: anims.generateFrameNumbers("egg", { start: 0, end: 7 }),
      frameRate: 6,
      repeat: 0,
    });
  }

  // ── Drawing helpers ───────────────────────────────────────────────────────────
  private drawGround(this: PhaserType.Scene & WorldScene) {
    buildGroundLayer().forEach((row, ri) =>
      row.forEach((idx, ci) => {
        if (idx === -1) return;
        this.add.image(ci * S + S / 2, ri * S + S / 2, "tiles", idx)
          .setDisplaySize(S, S).setOrigin(0.5);
      })
    );
  }

  private drawWater(this: PhaserType.Scene & WorldScene) {
    const g = this.add.graphics();

    const drawPond = (c1: number, c2: number, r1: number, r2: number) => {
      const w = (c2 - c1 + 1) * S;
      const h = (r2 - r1 + 1) * S;
      g.fillStyle(0x5aafd4, 1);
      g.fillRect(c1 * S, r1 * S, w, h);
      g.fillStyle(0x3d8fb5, 1);
      g.fillRect(c1 * S, r1 * S, w, 3);
      g.fillRect(c1 * S, (r2 + 1) * S - 3, w, 3);
      g.fillStyle(0xffffff, 0.18);
      for (let c = c1; c <= c2; c++) {
        const x = c * S;
        g.fillRect(x + 5, r1 * S + 8, S - 10, 2);
        g.fillRect(x + 10, r1 * S + 16, S - 18, 2);
        g.fillRect(x + 4, r1 * S + 26, S - 8, 2);
      }
    };

    drawPond(WP_C1, WP_C2, WP_R1, WP_R2);   // pond 1 — bottom-right
    drawPond(WP2_C1, WP2_C2, WP2_R1, WP2_R2);  // pond 2 — bottom-left

    // Zone dividers
    g.lineStyle(1, 0x000000, 0.06);
    g.moveTo(V_MID * S, 0); g.lineTo(V_MID * S, WORLD_H);
    g.moveTo(0, H_MID * S); g.lineTo(WORLD_W, H_MID * S);
    g.strokePath();
  }

  private drawDecorations(this: PhaserType.Scene & WorldScene) {
    buildDecorations().forEach(([col, row, idx]) =>
      this.add.image(col * S + S / 2, row * S + S / 2, "tiles", idx)
        .setDisplaySize(S, S).setOrigin(0.5)
    );
  }

  private drawFences(this: PhaserType.Scene & WorldScene) {
    const { H_TOP, H_BOT, V, CORNER } = FENCE_TILES;
    const x0 = FE * S,          y0 = FE * S;
    const x1 = WORLD_W - FE * S - S;
    const y1 = WORLD_H - FE * S - S;

    for (let col = FE; col * S <= x1; col++) {
      const x = col * S + S / 2;
      this.add.image(x, y0 + S / 2,     "fences", H_TOP).setDisplaySize(S, S).setOrigin(0.5);
      this.add.image(x, y0 + S + S / 2, "fences", H_BOT).setDisplaySize(S, S).setOrigin(0.5);
      this.add.image(x, y1 - S + S / 2, "fences", H_TOP).setDisplaySize(S, S).setOrigin(0.5);
      this.add.image(x, y1 + S / 2,     "fences", H_BOT).setDisplaySize(S, S).setOrigin(0.5);
    }
    for (let row = FE + 2; row * S < y1 - S; row++) {
      const y = row * S + S / 2;
      this.add.image(x0 + S / 2, y, "fences", V).setDisplaySize(S, S).setOrigin(0.5);
      this.add.image(x1 + S / 2, y, "fences", V).setDisplaySize(S, S).setOrigin(0.5);
    }
    [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach(([cx, cy]) =>
      this.add.image(cx + S / 2, cy + S / 2, "fences", CORNER).setDisplaySize(S, S).setOrigin(0.5)
    );
  }
}