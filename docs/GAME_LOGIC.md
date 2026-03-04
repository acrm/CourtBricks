# Game Logic

## Scope
- The application contains a browser-based hybrid game combining Pong, Arkanoid, and Tetris mechanics.

## Orientation & Playfield
- The game runs in forced landscape mode.
- In portrait device orientation, the canvas is rotated to keep gameplay horizontal.
- On mobile devices, fullscreen mode is automatically requested on first touch.
- The playfield includes a top panel (score and settings button) and side margins.
- No bottom panel; all space below the top panel is used for gameplay.
- Side margins provide visual separation between paddles and screen edges (no panels).
- All gameplay physics happen inside the central playfield between these margins.

## Core Layout
- The field is split into three zones:
  - Left paddle zone
  - Center Tetris zone (6 columns × 12 rows)
  - Right paddle zone
- The center Tetris zone is visually highlighted during gameplay.

## Controls
- Left paddle: `Q` up, `A` down.
- Right paddle: `]` up, `'` down.
- Touch: tap directly on a paddle (with +50% height tolerance) to control it.
- Touch controls are properly inverted for real mobile devices in portrait orientation.
- UI buttons: tap music, sounds, settings, or finish buttons in top panel.
- Debug bonus purchase: `Space` buys currently visible bonus offer.
- Debug mouse mode: hold left mouse button and move mouse vertically to move both paddles synchronously.

## Paddle & Ball Rules
- Paddle height is controlled by `paddleHeightRatio` from config.
- Left paddle is magenta (`#FF00FF`), right paddle is cyan (`#00FFFF`).
- Ball speed is controlled by `initialBallSpeedRatio` from config.
- Ball starts white and keeps constant speed (no acceleration).
- Ball bounces off top and bottom playfield borders.

## Block System

### Grid and Colors
- Grid size: 6 columns × 12 rows.
- Blocks are strictly square.
- Square size is derived from playable field height (`height / tetrisGridRows`), and zone width is `tetrisGridCols * blockSize`.
- Block palette has 5 colors and excludes white/black.

### Spawn and Fall
- First tetromino appears after the first paddle hit.
- Only one tetromino is active (falling) at a time.
- The active tetromino falls one row on each paddle hit (time-independent step).
- When any block of the active tetromino hits the bottom or another static block below, the entire tetromino freezes in place.
- After a tetromino freezes, a new one spawns at the top.
- All blocks inside one spawned tetromino have the same color.
- Settled tetrominoes are treated as figures via `pieceId`; unsupported settled figures can fall by one row on the next step.
- Falling checks propagate naturally to figures above on subsequent steps.

### Ball Trail
- The ball leaves a fading trail of its current color behind it.
- Trail is brightest near the ball and fades toward the older tail.
- Trail length and opacity parameters are configurable.

### Collision Physics
- Ball-block collision detection uses circle-rectangle distance.
- On non-matching hit, ball reflects and is pushed away from the block to prevent sticking.
- Push direction (horizontal or vertical) depends on which component of the collision vector is larger.
- Only one block collision response is applied per frame to reduce multi-hit jitter.

## Bonus Shop
- A bonus widget may appear no more often than once per 10 seconds.
- The widget always 10 seconds with a countdown ring.
- Widget is square with size `33%` of screen height and centered vertically in its side zone.
- The widget is shown only if the ball stays in one side zone for at least 3 seconds.
- The widget is shown only when current score is enough to buy the current offer.
- A one-tap purchase is supported on touch devices.
- The widget displays icon, price (points), effect duration, and a decreasing ring timer.
- Bonus offers never propose the same color the ball currently has
- The widget displays icon, price (points), effect duration, and a decreasing ring timer.

### Current Assortment
- Random color bonus: costs 3 points, instantly changes ball color to a palette color.
- White color bonus: costs 5 points, instantly changes ball color to white.
- Both current bonuses are instant effects (`duration = 0s`).

### Ball-Block Interaction
- White ball matches any block color.
- Colored ball destroys only matching-color blocks.
- On matching hit: only the collided block is removed, ball changes to a random different palette color.
- On non-matching hit: block stays, ball bounces.

## Single-Player Scoring
- One shared score is used for the player controlling both paddles.
- Score +1 when the ball successfully crosses from one side of the center zone to the opposite side.
- Score gain is animated as green `+1`.
- Score spending in bonus shop is animated as red `-N`.
- Total score accumulates across game sessions when using the Finish feature.
- Finish button saves current session score and displays total accumulated score across all sessions.

## UI Elements
- Top panel background is gold (`#FFD700`).
- Top panel contains:
  - Left sid (3 seconds with audio ticks).
2. Active play with paddles, blocks, scoring, and bonuses.
3. Game over on ball miss (automatic).
4. Finished state (manual via Finish button) showing session and total scores.
5. Restart on `Enter` or tap to begin new sessionighted and available only during active gameplay.

## Audio System
- Background music plays continuously, cycling through available tracks in `public/audio`.
- Music tracks: `cartoonish.mp3`, `russian.mp3`.
- Sound effects play on game events:
  - Paddle hit: `mixkit-golf-ball-hit-2105.wav`
  - Wall hit: `mixkit-hitting-golf-ball-2080.wav`
  - Block hit (non-matching): `mixkit-hitting-golf-ball-2080.wav`
  - Block destroy (matching): `mixkit-arcade-score-interface-217.wav`
  - Score gain: `mixkit-arcade-score-interface-217.wav`
  - Countdown tick: `mixkit-arcade-player-select-2036.wav`
  - Game over: `mixkit-arcade-retro-game-over-213.wav`
  - Bonus appear: `mixkit-arcade-bonus-alert-767.wav`
  - Bonus expire: `mixkit-quick-lock-sound-2854.wav`
  - Bonus purchase: `mixkit-magic-sweep-game-trophy-257.wav`
- Music and sounds can be toggled independently via UI buttons.

## Audio Assets
- Game audio assets should be placed in `public/audio`.
- Music files: MP3 format.
- Sound effects: WAV format for low latency
- Game audio assets should be placed in `public/audio`.

## Phase Flow
1. Countdown.
2. Active play with paddles, blocks, and scoring.
3. Game over on miss.
4. Restart on `Enter` or tap.

## Configuration Policy
- All gameplay constants must be defined in `src/config/gameConfig.ts`.
- Component logic should read values from config instead of hardcoded numbers.

## Sync Policy
- Update this file in the same task when gameplay behavior, controls, physics, scoring, visual zones, or state transitions change.
