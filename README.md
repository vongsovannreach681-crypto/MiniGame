# Island Ops — Rules of Survival 3D Browser Battle Royale

A full-featured, single-player 3D Battle Royale game built with **React, Three.js, and Web Audio API**, inspired by the tactical gameplay of Rules of Survival (ROS).

---

## 🎮 Features & Real Game Mechanics

### 1. Parachute & Ingress Drop System
- **Cargo Transport Plane Ingress**: The match starts at 220m altitude aboard the cargo plane flying across the island.
- **Altitude & Speed Telemetry**: Live altimeter gauge and speedometer with auto-deploy safety line.
- **Freefall & Glide**: Press `[F]` to eject, dive with mouse steering, and press `[Space]` to deploy your parachute canopy (or auto-deploys at 45m).
- **All 29 Bots Parachute Down**: Bots scatter across the island's major hotspots to scavenge loot.

### 2. Arsenal & Real Gunplay
- **Fists**: Melee close-combat starting attack.
- **M4A1 Carbine**: Full-auto 5.56 assault rifle with balanced damage and range.
- **Thompson SMG**: Rapid-fire .45 ACP submachine gun for close-quarters skirmishes.
- **M870 Pump Shotgun**: 8-pellet buckshot spread for lethal close-range encounters.
- **AWM Sniper Rifle**: Bolt-action sniper with **8x Scope Reticle Overlay** (Aim Down Sights with Right Click!) and instant 1-shot headshot capability.
- **ADS (Aim Down Sights)**: Right-click hold zooms camera over shoulder, reduces spread, and activates high-power optics.
- **Dynamic Recoil & Crosshair**: Crosshair widens when sprinting or firing, tightens when crouching `[C]` or aiming down sights.
- **Hitmarkers & Headshot Feedback**: Real-time hitmarkers (`X`), floating damage indicators, critical headshot pings, and hit sounds.

### 3. Equipment & Survival Gear
- **Tactical Helmets (Lv. 1, 2, 3)**: Visibly equipped on your 3D character, reducing headshot damage by 25% / 40% / 55%.
- **Plate Carrier Vests (Lv. 1, 2, 3)**: Adds 50 / 75 / 100 shield points with separate shield bar.
- **Healing & Boost Items**: First Aid Kit (`[H]`), Bandages, and Energy Drinks (providing health regen and sprint speed boosts).

### 4. Driveable 4x4 Buggy Vehicles
- Driveable off-road buggies parked at roads and garages.
- Real vehicle physics with acceleration, reverse, drifting friction, and spinning wheels.
- Procedural pitch-shifting engine audio.
- Run over bots for instant roadkill eliminations.
- Speedometer HUD with vehicle durability gauge.

### 5. Multi-Stage Electric Blue Storm
- Realistic 4-phase Battle Royale circle with warning sirens, shrinking electric cylinder wall, and increasing storm damage.
- Both player and bots take damage outside the zone, forcing players into frantic end-game firefights.

### 6. Airdrop Supply Crates
- Cargo planes fly over the island during the match, dropping airdrop crates with parachutes.
- Landing crates emit a visible red smoke flare column visible from across the island.
- Contains legendary loot: AWM Sniper, Level 3 Armor & Helmet, and First Aid.

### 7. Living AI Bots & Live Kill Feed
- 29 autonomous bots with distinct tactical behaviors: Parachuting, scavenging buildings, engaging the player, and **fighting each other** in dynamic bot-vs-bot firefights!
- Real-time Kill Feed in the top-right corner with weapon badges and headshot icons.
- Bots drop glowing green Death Crates upon elimination containing all their gear.

### 8. Radar Minimap & Full Tactical Map
- **Circular Radar Minimap**: Displays player direction cone, safe circle (white), storm circle (blue), vehicle icons, and **red gunfire sound blips** when shots are fired nearby.
- **Compass Header**: 360-degree tactical compass tape.
- **Tactical Map (`[M]`)**: Full-screen satellite map with coordinate grid (A1-F6) and labeled sectors (Central Town, Naval Harbor, Radar Base, Wind Farms, Lumber Depot).

### 9. 100% Procedural Web Audio Engine
- Zero external audio files or downloads required.
- Synthesizes unique audio procedurally via Web Audio API:
  - Punchy weapon gunshots, shotgun blasts, and sniper cracks
  - Distant spatial gunshots with 3D stereo panning
  - Reload click-clack mechanical sequence
  - Hitmarker ticks & metallic headshot pings
  - Player hurt audio
  - Footsteps (grass, road)
  - Vehicle engine revs & horn
  - Parachute wind rushing & deploy snaps
  - Storm warning sirens & airdrop horns
  - Victory fanfare & defeat themes

---

## 🕹️ Controls

| Key | Action |
| --- | --- |
| **W, A, S, D** | Move Character / Drive Buggy |
| **Mouse** | Look / Aim Camera |
| **Left Click** | Fire Weapon / Attack (Click to lock cursor) |
| **Right Click (Hold)** | Aim Down Sights (ADS) / 8x Sniper Scope |
| **Shift** | Sprint |
| **Space** | Jump / Open Parachute |
| **C** | Crouch (reduces recoil & spread) |
| **R** | Reload Magazine |
| **F** | Interact / Loot Item / Drive Buggy / Eject from Plane |
| **1, 2, 3** | Switch Weapon Slots |
| **H** | Use First Aid / Medkit |
| **M** | Toggle Full Tactical Island Map |
| **Esc** | Pause Match / Release Cursor |

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Production build
npm run build
npm run preview
```
Open `http://localhost:5173` in any modern desktop browser (Chrome, Edge, Firefox, Brave, Safari).
