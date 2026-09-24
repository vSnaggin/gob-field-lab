# Visual pass — Mark / Cutaway (first pass)

Local edits only. No commit/push. Process math untouched (`public/process-model.js`).

## Files touched
- `public/index.html` — Cutaway graphics path only (materials, lights, rubble, methane trails, water look, cinema framing).
- `VISUAL-PASS.md` — this note.

## Not touched
- `public/process-model.js` — MODEL constants (`driveKPa: 14`, √-head law, dry/seep/wet inflow, L/min rates).
- `public/audio/chapters.json` — Alfred narration copy.
- Texture paths remain `/textures/${kind}-*.jpg`.

## Changes

### 1. Rubble / caving
- InstancedMesh count **480 → 720**.
- Instance tint mixes **shale cool-gray** and **coal dark** (still one shale-mapped InstancedMesh for draw-call cost).
- Reveal window widened `smooth(4.8,7.3,…)` → `smooth(3.0,9.4,…)` so cave-in grows more progressively behind the face; drop offset slightly varied per fragment.

### 2. Methane streams
- Trails: **16→20** paths, **5→6** segments (still LineSegments; mobile-reasonable).
- Brighter pale tint `0xc8d7cd` → `0xe6f2ea`; higher base/runtime opacity.
- Head motion slightly faster (`×.28` → `×.34`) with a longer readable trail (`0.038/0.0076` → `0.048/0.008`).
- Guide lines slightly brighter/more opaque when gas is flowing.

### 3. Water
- Pool: clearer cyan, opacity **.63→.70**, lower roughness, stronger clearcoat.
- Surface: opacity **.89→.93**, clearcoatRoughness, brighter tint.
- Meniscus: thicker torus (`.008→.012`), brighter, opacity **.65→.82**.
- Ripple amplitude / frequency nudged up for readability. **No fluid rate / level math changes.**

### 4. Lighting / cutaway
- Soft rim **1.7→2.15**, fill **1.25→1.48**, soft fill **.42→.55**, hemi slightly cooler.
- FogExp2 denser/darker (`0x0c1822/.006` → `0x0a141c/.0072`) for bed separation without crushing rock textures.
- Environment intensity **.6→.55**.

### 5. Camera (light touch)
- Cinema shots at t≈67 and t≈82 nudged toward the well (closer target / slightly tighter distance) for the water chapter.
- OrbitControls free-look / scrub path unchanged.

## Intent
Illustrative teaching clarity — not fake calibrated CFD.

## Pass 2 (second graphic polish)

Local edits only. No commit/push. Process math / Alfred audio untouched.

### Files touched
- `public/index.html` — Cutaway graphics only.
- `VISUAL-PASS.md` — this Pass 2 note.

### Not touched
- `public/process-model.js` — fluid rates, √-head law, MODEL constants.
- `public/audio/chapters.json` and MP3s.

### 1. Fracture planes / bed separation
- Immediate-roof Voronoi cells: wider joint aperture (`.995→.985`), deeper bevel, darker joint-face vertex tint, cool “emissive” catch on bevel edges.
- Main-roof `bendingBed` separation amplitude raised (`.055*index` → `.045+.12*index`) with slightly earlier onset.
- Stacking gap between main-roof slabs `.035→.055` so bed planes read more clearly as the face advances.
- Still kinematic / teaching — not fake CFD.

### 2. Methane trails
- Path control points funnel tighter into the slotted inlet (`intakeY`), then rise in casing.
- Static guide density `i%3→i%4`; lower guide opacity.
- Trail comet shortened (`.048/.008` → `.038/.0065`); vertex color gain steeper toward the head so overlapping paths stay readable (less “particle soup”).
- Count stays **20 × 6** segments (mobile-reasonable).

### 3. Soft contact darkening
- Cheap radial `DataTexture` blobs under gob rubble and well base (`makeContactBlob`) — no SSAO, no DOM canvas (Node-test safe).
- Key light `shadow.radius` **3→4.5** for slightly softer PCF contact.

### 4. Cinema framing (optional, Alfred-synced)
- Kept shot times **t≈67 / t≈82** (caption sync).
- t≈67: target slightly lower/closer toward inlet; distance **17.5→16.2**.
- t≈82: tighter on pool/meniscus; distance **11→10.2**.

### Intent
Illustrative teaching clarity — not calibrated CFD.
