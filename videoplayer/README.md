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
- Saliency is still an image-based centroid heuristic, not object detection or semantic tracking. It can follow a salient mass, but it cannot identify a person/character/object by meaning.
- The browser/Three.js visual runtime was not available for an end-to-end playback test. Syntax checks and a mocked camera simulation were run.

## Tests performed
- JavaScript syntax checks on modified modules.
- 60-second synthetic camera simulation with finite camera output and intent variation.
- Focus-follow simulation: changing salient centroid from screen center to right side caused the camera target to follow (`x=0.00` to `x=1.15` in the test setup).
- ZIP integrity test after packaging.
