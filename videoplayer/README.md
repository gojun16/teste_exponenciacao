# MP4-following Cinematic Director update

This iteration is deliberately based on the project's actual analyzer and camera behavior, not external cinematography references.

## Why the prior version felt non-cinematic
- It planned a 9.5+ second path from telemetry sampled at the transition and then mostly played that path unchanged.
- The look target only received a very small live composition correction, so it could wander around while failing to follow a changing salient region in the MP4.
- Decisions were mostly timer-driven, rather than reacting to changes in the image or audio.
- Motion could be slow and camera-led instead of content-led.

## Changes
- Live salient-centroid follow in Auto mode: target and camera position are corrected continuously from `centroidX/Y`, `focusX/Y`, motion, depth, and dominant color position.
- New `trackFocus` intent: a dynamic follow/tracking trajectory derived from current subject estimate and motion vectors, not a stored pose.
- Audio-driven camera action: beat accents add a small forward impulse; continuous audio energy influences dolly intensity, FOV, roll and camera response.
- Visual-event-aware director: evaluates filtered visual change, flash change, focus shift, motion changes, beat accents and audio energy; can re-plan after a minimum hold instead of waiting only for the timer.
- Analyzer now tracks RGB change as well as luminance change, so same-brightness color transitions can register as visual movement/events.
- Added sparse block-matching optical flow on a 160x120 analysis grid: estimates directional frame-to-frame movement, smoothed flow magnitude and positive acceleration.
- Auto camera motion now physically follows estimated flow direction, and flow intensity proportionally tightens framing (dolly + FOV), with stronger response/velocity during motion bursts.
- Director scoring now favors push-in/lateral tracking/focus-follow when directional motion or acceleration is strong; calm scoring accounts for flow, not only pixel-change activity.
- Shorter trajectories (6.4–10.8s) and stronger early movement/easing; follow target spring responds faster while remaining damped.
- Fixed a malformed `grazing` camera position assignment from the previous code.

## Files
- `cinematicCamera.js`
- `cinematicDirectorBrain.js`
- `cinematicTrajectory.js`
- `cinematicComposition.js`
- `videoFrameAnalyzer.js`
- `videoDirector.js` (integration kept intact)
- `cinematicEnvironment.js` (kept intact)
- `videoAudioEngine.js` (kept intact)

## Honest limitations
- Optical flow is sparse block matching, not semantic object tracking. It estimates dominant local movement and may be ambiguous in low-texture, fast-cut, or highly noisy footage. Saliency remains an image-based centroid heuristic, not identification of people/objects by meaning.
- The browser/Three.js visual runtime was not available for an end-to-end playback test. Syntax checks and a mocked camera simulation were run.

## Tests performed
- JavaScript syntax checks on modified modules.
- 60-second synthetic camera simulation with finite camera output and intent variation.
- Focus-follow simulation: changing salient centroid from screen center to right side caused the camera target to follow (`x=0.00` to `x=1.15` in the test setup).
- Optical-flow unit simulation with a textured object shifted 3 pixels right reported positive horizontal flow (`flowX ≈ 0.32`) and near-zero vertical flow (`flowY ≈ 0.01`); the response is filtered, so this is not the raw displacement. Browser playback/visual feel still requires testing in the actual app.
- ZIP integrity test after packaging.
