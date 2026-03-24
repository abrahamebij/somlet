# Somlets

![Somlets Cover](https://i.ibb.co/Vpv6V4Px/cover.png)

> *"Every chicken is a soul. Every soul is a transaction."*

Somlets is a real-time blockchain visualiser for the [Somnia](https://somnia.network) network. Every event emitted by Somnia's reactive WebSocket becomes a living creature — a **Somlet** — wandering a pixel-art world. Watch them hatch, replicate, drink, gather, and die. Click one to read the blockchain event it carries.

Inspired by the [Black Mirror](https://www.imdb.com/title/tt2085059/) episode - *[Plaything](https://www.imdb.com/title/tt31215636/)*.

---

## Demo

**[https://somlets.vercel.app](https://somlets.vercel.app)**

![2026032417341-ezgif com-optimize](https://github.com/user-attachments/assets/aa0cbe8a-7676-4d7a-80bc-43dc151bc7ea)


---

## What It Does

Somnia's network fires thousands of events per second. Most of them are invisible. Somlets makes them visible.

- Every **40 events** received, one Somlet is spawned into the world
- The **first Somlet** hatches from an egg — it cracks twice before the chick emerges
- Every subsequent Somlet is born by **replication** — a random existing chick jumps and splits into two
- Each chick **wanders independently**, occasionally drinks from one of two water ponds, and dies naturally after **30 seconds**
- Every **60 seconds**, roughly a third of all living chicks gather at a random point, face the screen, and transmit a **random morse code sequence** using synchronised cluck sounds
- You can **drop fire** anywhere in the world to cull chicks manually
- **Click any chick** to inspect the blockchain event it represents in the sidebar

---

## Stack

| Layer         | Technology           |
| ------------- | -------------------- |
| Framework     | Next.js (App Router) |
| Language      | TypeScript           |
| Styling       | Tailwind CSS v4      |
| Components    | shadcn/ui            |
| Game engine   | Phaser 3             |
| State         | Zustand              |
| Notifications | Sonner               |
| Data source   | Somnia WebSocket SDK |

---

## Getting Started

**Prerequisites:** Node.js 18+, npm

```bash
# Clone the repo
git clone https://github.com/abrahamebij/somlet.git
cd somlet

# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

> Use npm if you don't have pnpm installed, just make sure you delete the lockfile first.

Open [http://localhost:3000](http://localhost:3000) in your browser.

The landing page introduces the concept. Click **ENTER THE WORLD** to open the visualiser at `/visualizer`.

---

## How the World Works

### Spawning

Events from the Somnia WebSocket are buffered. Every 40th event triggers a spawn. The first spawn is delayed by 4 seconds after the world loads to give the egg hatch animation time to play.

- **First chick** — an egg appears at world center, wobbles, cracks twice, then hatches
- **All subsequent chicks** — a random living chick jumps slightly and a new chick fades in beside it

### Chick behaviour

Each chick runs an independent state machine:

| State    | Description                                                          |
| -------- | -------------------------------------------------------------------- |
| `idle`   | Stands still for 0.8–2.4 seconds                                     |
| `walk`   | Moves in a random direction for 1–3 seconds, bounces off fence walls |
| `drink`  | Walks toward the nearest water pond and drinks for 3 seconds         |
| `gather` | Controlled by the chorus orchestrator                                |
| `death`  | Plays death animation, fades out, removed from world and store       |

### The Gathering

Every 60 seconds, roughly one third of alive chicks are selected for a gathering:

1. They interrupt whatever they're doing and walk to a random point in the world
2. Once assembled, they all face the screen
3. They perform a synchronised morse code sequence — short and long clucks in a random pattern, with pitch-shifted audio variants layered 80ms and 160ms apart for a reverberating effect
4. They scatter back to independent wandering

### Fire Mode

Toggle fire mode from the toolbar. In fire mode:

- The selection glow and hover highlight are disabled
- Clicking anywhere in the world drops animated fire at that point
- Any chick within range plays its death animation and is removed

---

## Project Structure

```bash
app/
  page.tsx                        # Landing page (/)
  visualizer/
    page.tsx                      # Visualizer page (/visualizer)

components/
  visualizer/
    SomletGame.tsx                # React wrapper — boots Phaser, syncs events
    WorldScene.ts                 # Phaser scene — world rendering + chicken AI
    SomletSidebar.tsx             # Inspector sidebar — live feed + event details

store/
  useSomletStore.ts               # Events, somlets, sidebar selection, gameReady flag
  useWorldStore.ts                # Chicks, fire mode, audio unlock, pending spawn queue

config/
  worldConfig.ts                  # All world constants, tile indices, map builders

public/
  assets/
    Set_1_2.png                   # Ground tileset
    fences_and_ladders_etc.png    # Fence tileset
    chick_spritesheet_clean.png   # Chick sprite (4 animation rows)
    egg_hatch.png                 # Egg hatch animation (8 frames)
    fire_spritesheet.png          # Fire animation (8 frames)
    cluck-dot.mp3                 # Short cluck — morse dot
    cluck-dash.mp3                # Long cluck — morse dash
    cluck-dot-hi.mp3              # Pitch-shifted reverb layers
    cluck-dot-lo.mp3
    cluck-dash-hi.mp3
    cluck-dash-lo.mp3
    cover.png                     # Project cover image
    favicon.ico                   # Project favicon
```

---

## Acknowledgements

- Tileset assets from [itch.io](https://itch.io)
- Chick sprite generated with Nano Banana Pro
- Egg hatch and fire spritesheets generated programmatically
- Audio sourced from the Black Mirror episode *Plaything* (Series 7)
- Concept inspired by *[Plaything](https://www.imdb.com/title/tt31215636/)* — Black Mirror, Series 7
