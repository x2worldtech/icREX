# Design Brief — IC-Rex

**Concept.** A polished endless desert runner (a T-Rex / Chrome-dino homage) for
the Internet Computer. The player auto-runs across a stylised desert, jumping
and ducking past obstacles while collecting ICP coins. High scores are stored
on-chain in the backend canister.

**Tone & differentiation.** Warm, sun-baked, premium-casual. Pixel-art sprites
on smooth procedural parallax (sky gradient with a slow day→dusk cycle, drifting
clouds, layered sine dunes, scrolling ground). Game feel is the differentiator:
framerate-independent physics, coyote time, jump buffering, variable jump
height, a double jump, ducking, and a coin-combo multiplier.

**Palette.** Desert tokens defined in `index.css` (sand, warm, sun, accent,
ground, sky, dark) in OKLCH. Canvas art uses matching warm hex tones.

**Structure.** A single screen: header (brand + mute/fullscreen), a 16:9 game
stage with on-canvas HUD and React overlays (menu / pause / game-over), and a
sidebar with the on-chain leaderboard and a short how-to-play card.

**Motion.** All gameplay motion lives on the canvas at a fixed 120 Hz timestep
with render interpolation, so it is identical on 60 Hz and 144 Hz displays.
React is used only for rarely-changing UI to avoid per-frame re-renders.

**Constraints.** No external audio/font assets — sound is fully synthesised via
the Web Audio API. Fullscreen is optional (never forced). Mobile gets on-screen
jump/duck controls; desktop gets keyboard play.
