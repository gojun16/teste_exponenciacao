# Cinematic Director — Composition + Intent + Trajectory

This update refactors the Auto Director into a modular cinematic system. It is designed for arbitrary videos, not for one specific clip.

## Architecture

- `cinematicComposition.js` — continuously estimates visual focus, chromatic influence, crowding, and negative-space framing bias from analyzer telemetry.
- `cinematicDirectorBrain.js` — selects a cinematic **intent** (push-in, pull-out, arc, lateral track, crane reveal, reveal, or hold) using weighted context and repeat avoidance. These are movement goals, not camera pose presets.
- `cinematicTrajectory.js` — creates a fresh Catmull-Rom path from the live camera position, live look target, stage geometry context, composition, motion, color, depth, and audio. Each path has an entry, development, and resolution phase using cinematic easing (a linear/eased blend to avoid sluggish starts), typically lasting 9.5–14.5 seconds.
- `cinematicCamera.js` — follows the generated path with critically damped springs, applies restrained lens/FOV and roll, and retains manual camera modes.
- `cinematicEnvironment.js` — lightweight layered atmospheric particles and low-contrast spatial arcs, color-adaptive and motion-reactive, designed to remain inexpensive.
- `videoDirector.js` — integrates the new modules into the player and updates the atmospheric layer each frame.

## What changes visually

- Auto mode is no longer a list of preset positions or a switch between shot poses.
- A new path is generated per intent from the current camera state; endpoint and control points depend on the current telemetry.
- Composition is not always center-locked: focus and color cues create a restrained target offset and negative-space bias.
- A single dominant movement is used per trajectory to avoid stacking orbit, zoom, roll, crane, and tracking at once.
- Movement is phased and eased; the camera settles at the end rather than oscillating forever.
- Atmospheric particles and arcs add three depth layers of parallax without replacing the existing portal, dome, stage lighting, rings, grid, or monoliths.
- The analyzer's color contribution is area/confidence weighted so a small accent cannot hijack framing.

## Performance considerations

The environment uses one small `THREE.Points` object (112 points by default) and three low-opacity line arcs. It does not add new post-processing passes or full-screen shaders. This avoids introducing an EffectComposer dependency into the existing renderer.

## Validation status

- `node --check` on every JavaScript module: passed.
- ZIP integrity test: passed.
- Browser/Three.js runtime and visual test: **not performed in this environment**. The project's actual browser runtime is required to confirm trajectory scale, camera framing, and GPU performance.

## Research notes

- Three.js `CatmullRomCurve3` supports continuous paths through generated world-space waypoints; the paths here are generated from the current camera and live telemetry, not a stored pose catalog.
- Official Three.js post-processing docs explain EffectComposer/Pass chains and why they require replacing the current render loop. This update intentionally avoids adding a composer until the project's renderer integration is available for a tested change.

References:
- https://threejs.org/docs/index.html?q=CatmullRomCurve3
- https://threejs.org/docs/pages/EffectComposer
- https://threejs.org/manual/pages/how-to-use-post-processing.html
