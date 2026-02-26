# IC Rex

## Overview
A simple 2D game similar to Chrome Dino runner where the player controls a dinosaur character that automatically runs from left to right and must jump to avoid obstacles. The game features a bright, sunny desert world aesthetic with animated background elements and collectible ICP coins. The entire application uses a premium desert-style theme with high-quality visual design optimized for cross-platform support on both mobile and desktop devices.

## Cross-Platform Support
- Full playability on both mobile and desktop devices
- Mobile: landscape orientation only with automatic fullscreen mode activation
- Desktop: responsive fullscreen scaling with proper keyboard and click controls
- Dynamic canvas and UI overlay resizing to maintain visual balance across all devices
- Touch controls for mobile jumping, keyboard (spacebar) and click controls for desktop
- Consistent desert theme and T-Rex design elements across all responsive layouts

## Website UI Design
- Premium desert aesthetic with bold and vibrant color palette: rich sand beige, bright sun gold, warm terracotta, deep sky blue
- Soft shadows and depth layering with background gradients and foreground highlights
- Smooth hover and click animations on all interactive elements
- T-Rex illustrations and silhouettes integrated into background elements and section transitions
- Premium typography that complements the desert theme
- Harmonious responsive layout for both desktop and mobile devices
- All UI text in German language
- Professional, cohesive design that reinforces the desert/dinosaur theme across all pages and components
- Dynamic resizing of UI elements to maintain visual balance on different screen sizes
- **Completely clean interface with NO gameplay information, control instructions, tips, icons, or text describing game mechanics displayed anywhere on the website or game interface**
- **All instructional content, gameplay tips, control explanations, and mechanic descriptions completely removed from all UI elements**
- **Layout automatically adjusted to eliminate any empty spaces or gaps where instructional content was previously displayed**
- **Focus exclusively on the game canvas with premium, visually balanced design**
- Browser zoom disabled via viewport meta and CSS properties
- Text and object selection disabled across the entire website for native game feel
- **Footer area maintains layout stability without T-Rex header image, preserving background styling and visual consistency**

## Game Interface
- Central "Spiel starten" button overlay positioned on the game canvas
- Play button triggers smooth transition to start the game and activate fullscreen mode automatically
- On mobile: automatic fullscreen mode activation when tapping "Spiel starten"
- On desktop: responsive fullscreen scaling with proper aspect ratio maintenance
- Game interface maintains premium desert theme consistency with the rest of the application
- Landscape-only gameplay orientation enforced on all devices
- Seamless integration between website UI and game interface
- Dynamic canvas and UI overlay resizing for optimal display across devices
- **No instructional overlays, control hints, or gameplay guidance displayed on the game interface**

## Visual Design
- Bright, sunny desert world with bold and vibrant color palette (rich beige, bright yellow, warm orange tones)
- Animated parallax background with slowly moving mountains and sun gradient
- Brown ground layer with desert-appropriate texturing
- Soft, atmospheric background with depth layering that matches the premium desert theme
- Pixel-art style graphics consistent with desert aesthetic
- Responsive visual scaling to maintain quality across different screen sizes

## Core Gameplay
- Dinosaur character runs automatically from left to right across the screen
- Cross-platform jump controls: spacebar and click for desktop, touch for mobile
- Only cactus obstacles appear from the right side of the screen, styled as true 2D pixel graphics with transparent backgrounds and clean edges
- ICP coins spawn regularly along the track for collection
- Game ends immediately when character collides with any cactus obstacle
- Score increases continuously based on time survived/distance traveled plus collected coins
- Game speed gradually increases over time to increase difficulty

## Game Features
- Smooth jumping animation with realistic physics (gravity effect)
- Desert-themed pixel-art style graphics for character and obstacles
- Animated background elements (moving mountains, sun effects) for a "living" world
- Visible score counter displayed on screen
- ICP coin collection with visual feedback (sparkle effect or similar)
- Game over screen with final score
- "Neu starten" (Restart) button to play again after game over
- Progressive difficulty through speed increase

## Audio System
- **Satisfying coin collection sound effect** that plays each time the player collects an ICP coin
- **Short, crisp, and clear** coin sound similar to classic game coin sounds, providing immediate sense of reward
- Audio file "coin-pickup.wav" loaded as game asset
- Sound triggers on coin collision events with proper volume and timing
- **Optimized playback timing** to prevent awkward overlapping when multiple coins are collected in quick succession
- Compatible with both desktop and mobile devices (touch and click interactions)
- Audio system works across different browsers and platforms
- **Cross-platform audio compatibility** ensuring consistent sound experience on all devices

## Character Animation System
- Animated dinosaur character with running sprite animation featuring at least two running phases for smooth movement
- Character always faces to the right during all animations and states (running, jumping, idle)
- **CRITICAL**: The dinosaur character must remain the same 2D pixel-art dinosaur sprite at all times - no switching to human sprites or alternate character models during any animation state
- Running animation plays continuously while the character is moving on the ground
- **Jump animation must use only the dinosaur's running or idle frames** - never switch to a different character sprite
- Animation stops when the dinosaur is jumping or when the game is paused
- Smooth transition between running and jumping states using only dinosaur sprites
- Use nearest-neighbor rendering to maintain sharp pixel edges without smoothing
- All animations must be based exclusively on the provided transparent pixel dinosaur sprites facing right

## Ground Level Alignment Requirements
- **CRITICAL**: Dinosaur character's feet must sit exactly on the ground surface at all times
- Cactus obstacle bases must align precisely with the desert ground image (`desert-ground.dim_1024x100.png`) with no floating pixels or gaps
- Dinosaur's y-position must remain consistent across all animation states (idle, running, jumping start/end)
- Ground collision detection must be perfectly aligned with visual ground positioning
- Physics system (gravity, floor contact) must maintain consistency after positioning adjustments
- All ground-level elements must scale proportionally while maintaining alignment on different screen sizes
- Cross-platform alignment consistency across mobile and desktop devices

## Obstacle and Collectible System
- Cactus obstacles only: true 2D pixel graphics with transparent backgrounds and clean edges, no rectangular borders or PNG artifacts
- ICP coins spawn at regular intervals along the track
- Collision detection for both cacti (game over) and coins (collection)
- Visual feedback when coins are collected (sparkle, flash, or particle effect)
- **Enhanced audio feedback** when coins are collected with satisfying coin pickup sound effect
- Coins contribute to the total score when collected

## Character Rendering Requirements
- Use transparent background dinosaur character sprites for all animation frames
- Implement nearest-neighbor rendering to maintain sharp pixel edges without smoothing
- Remove any visual PNG borders or drop shadows from the character display
- Ensure clean animation looping and proper scaling for both desktop and mobile resolutions
- Optimize display for fullscreen mode across different screen sizes
- **Maintain consistent dinosaur character appearance across all game states** - no character model switching
- **Ensure precise ground-level positioning across all screen resolutions and orientations**
- Cross-platform rendering optimization for consistent visual quality

## Enhanced Scaling System
- **Significantly larger scale for all game elements** when viewed in fullscreen mode on PC
- **Proportional scaling** of dinosaur character, cacti obstacles, ICP coins, and ground elements
- **Dynamic UI element scaling** that adjusts to the new game element sizes
- **Animation scaling** that maintains smooth movement and timing at larger sizes
- **Collision boundary scaling** that accurately reflects the larger visual elements
- **Visual alignment preservation** ensuring ground level, relative distances, and spacing remain consistent
- **Resolution quality maintenance** using nearest-neighbor scaling to avoid pixel stretching
- **Cross-platform scaling consistency** between mobile and desktop versions
- **Responsive scaling system** that adapts to different screen sizes while maintaining proportional balance

## Technical Requirements
- 2D game implementation
- All game state managed in frontend only
- No backend data persistence required
- Cross-platform responsive controls: keyboard spacebar and mouse click for desktop, touch for mobile
- Smooth 60fps gameplay with parallax background animation
- German language for all UI text
- Pixel-perfect character rendering with nearest-neighbor interpolation
- Collision detection system for obstacles and collectibles
- Sprite animation system for character movement using only dinosaur sprites
- **Enhanced audio system** for sound effects with cross-platform compatibility and optimized timing
- **Precise ground-level alignment system that maintains consistency across all screen sizes**
- **Advanced scaling system** for significantly larger game elements in fullscreen mode
- **Dynamic collision boundary adjustment** to match scaled visual elements
- Automatic fullscreen mode activation through central "Spiel starten" button
- Smooth UI transitions and animations throughout the application
- Dynamic canvas and UI overlay resizing for optimal cross-platform display
- Landscape orientation enforcement on mobile devices
- Responsive fullscreen scaling for desktop devices
- Browser zoom disabled via viewport meta tags and CSS properties
- Text and object selection disabled across the entire website
- **Complete removal of all instructional content with automatic layout adjustment to prevent empty spaces**

## Game States
- Pre-Game: Central "Spiel starten" button overlay on canvas, premium desert-themed UI visible, responsive layout
- Playing: Character running with animation, cactus obstacles spawning, ICP coins spawning, score counting, background animating, **enhanced sound effects playing**, fullscreen mode active, cross-platform controls active, **scaled elements for enhanced visibility**
- Game Over: Display final score (including collected coins) and "Neu starten" option with responsive layout
- Restart: Reset all game variables and return to playing state
