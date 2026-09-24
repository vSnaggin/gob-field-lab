# Gob Field Lab

Private, mobile-oriented Three.js cutaway of one illustrative gob well and an
advancing longwall. The scene shows immediate-roof caving, bending and separation
of upper beds, methane pathways, and water accumulation at the completion.

The cinematic update includes locally bundled procedural sedimentary materials,
angular rubble, detailed supports, reflective casing and water, warm work lights,
cool fill light, a film grading pass, and guided camera views. Auto quality caps
device pixel ratio at 2, limits rendering to 30 fps, and reduces resolution under
load. Cinematic and Smooth modes provide explicit quality choices.

Recorded HeyGen narration uses Orson — Firm & Measured, with three synchronized
audio tracks for the dry, seep, and water-loaded scenarios. Sentence captions
follow the same timeline. Playback starts from a user gesture; pause, mute,
scrubbing, and scenario changes preserve the current explanation position.
The simulation clock never waits for audio. All runtime assets are same-origin;
no API key, speech provider connection, or device speech synthesizer is needed.

## Model basis and limits

This is a deterministic kinematic illustration, not a geomechanical or production
forecasting solver. Fractures, deformation, trajectories, and timing are
prescribed. Gas output is normalized and water behavior is illustrative, not
calibrated against Warrior Met Coal Gas or Black Warrior Methane production data.
The information dialog cites the Alabama 2019 hearing results (Order 2019-09)
and EPA/430/R-94/007 for public company and conventional gob-well context.

The previously supplied completion report establishes casing depths of 633 ft
and 784 ft and total depth of 1350 ft. Mary Lee is the user-confirmed mined seam;
its depth and lower completion are unknown. The scene therefore makes no claimed
depth-scale or site-specific failure prediction. Rock textures are original
procedural artwork, not geological core photographs.

## Development and validation

- `npm run dev -- --port 4173` serves the managed development preview.
- `npm start` serves the static public directory on port 4173.
- `npm test` checks model bounds, deterministic scrubbing, scene geometry, audio
  synchronization, and rapid playback changes.
- `npm run build` copies the complete static application to `dist`.

`scripts/bake-materials.py` reproduces the rock material maps.
`scripts/build-narration.py` builds the bundled MP3 tracks and sentence captions
from HeyGen speech metadata. The production site needs neither script.

Automated model and narration checks and JavaScript syntax validation passed.
The available preview browser has WebGL disabled, so actual GPU rendering and
iPhone audio playback could not be verified in this environment.

Preserve the existing Sites project and owner-only audience in
`.openai/hosting.json`.
