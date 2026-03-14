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

// ── WorldScene ────────────────────────────────────────────────────────────────

export class WorldScene extends (globalThis.Phaser?.Scene ?? class {}) {
  private sprites = new Map<string, PhaserType.GameObjects.Sprite>();
  private pendingRemoval = new Set<string>();
  private selectionGlow!: PhaserType.GameObjects.Graphics; // indicator under selected chick

  constructor() { super({ key: "WorldScene" }); }

  // ── Preload ──────────────────────────────────────────────────────────────────
  preload(this: PhaserType.Scene & WorldScene) {
    this.load.spritesheet("tiles",  "/assets/Set_1_2.png",                  { frameWidth: TILE,          frameHeight: TILE          });
    this.load.spritesheet("fences", "/assets/fences_and_ladders_etc.png",   { frameWidth: TILE,          frameHeight: TILE          });
    this.load.spritesheet("chick",  "/assets/chick_spritesheet_clean.png",  { frameWidth: CHICK_FRAME_W, frameHeight: CHICK_FRAME_H });
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

    // Signal to Visualizer that the game is ready to receive events
    useSomletStore.getState().setGameReady(true);
  }

  // ── Update ───────────────────────────────────────────────────────────────────
  update(this: PhaserType.Scene & WorldScene, _time: number, delta: number) {
    const store = useWorldStore.getState();

    // Spawn sprites for new chicks
    store.chicks.forEach((chick) => {
      if (!this.sprites.has(chick.id)) this.spawnSprite(chick);
    });

    // ── Selection glow — follows selected chick ───────────────────────────
    this.selectionGlow.clear();
    const selectedId = store.selectedChickId;
    if (selectedId) {
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
      sprite.setTint(0xff2222);
      (this as any).input.setDefaultCursor("pointer");
    });
    sprite.on("pointerout", () => {
      sprite.clearTint();
      (this as any).input.setDefaultCursor("default");
    });

    sprite.play("chick-idle");
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

    // ── #7 Lifespan — checked AFTER death guard ──────────────────────────────
    const newLifespan = chick.lifespanTimer - delta;
    if (newLifespan <= 0) {
      store.killChick(chick.id);
      return;
    }

    // ── Near water → drink ───────────────────────────────────────────────────
    const distToWater = Math.hypot(sprite.x - WATER_CENTER_X, sprite.y - WATER_CENTER_Y);
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
          const angle = Math.atan2(WATER_CENTER_Y - sprite.y, WATER_CENTER_X - sprite.x);
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

  // ── Fire click ───────────────────────────────────────────────────────────────
  private handleFireClick(this: PhaserType.Scene & WorldScene, wx: number, wy: number) {
    const FIRE_RADIUS = S * 2;
    const g = this.add.graphics();
    g.fillStyle(0xff4400, 0.7);
    g.fillCircle(wx, wy, FIRE_RADIUS);
    (this as any).tweens.add({
      targets: g, alpha: 0, duration: 600,
      onComplete: () => g.destroy(),
    });

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
    Object.entries(CHICK_ANIMS).forEach(([key, cfg]) => {
      anims.create({
        key:       `chick-${key}`,
        frames: anims.generateFrameNumbers("chick", { frames: cfg.frames as unknown as number[] }),
        frameRate: cfg.frameRate,
        repeat:    cfg.repeat,
      });
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
    const w = (WP_C2 - WP_C1 + 1) * S;
    const h = (WP_R2 - WP_R1 + 1) * S;

    g.fillStyle(0x5aafd4, 1);
    g.fillRect(WP_C1 * S, WP_R1 * S, w, h);
    g.fillStyle(0x3d8fb5, 1);
    g.fillRect(WP_C1 * S, WP_R1 * S, w, 3);
    g.fillRect(WP_C1 * S, (WP_R2 + 1) * S - 3, w, 3);
    g.fillStyle(0xffffff, 0.18);
    for (let c = WP_C1; c <= WP_C2; c++) {
      const x = c * S;
      g.fillRect(x + 5,  WP_R1 * S + 8,  S - 10, 2);
      g.fillRect(x + 10, WP_R1 * S + 16, S - 18, 2);
      g.fillRect(x + 4,  WP_R1 * S + 26, S - 8,  2);
    }
    g.lineStyle(1, 0x000000, 0.06);
    g.moveTo(V_MID * S, 0);      g.lineTo(V_MID * S, WORLD_H);
    g.moveTo(0, H_MID * S);      g.lineTo(WORLD_W, H_MID * S);
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