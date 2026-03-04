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
- Touch: left/right half of the screen controls the corresponding paddle.
- Touch controls are properly inverted for real mobile devices in portrait orientation.
- Debug mouse mode: hold left mouse button and move mouse vertically to move both paddles synchronously.

## Paddle & Ball Rules
- Paddle height is controlled by `paddleHeightRatio` from config.
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
- The widget always stays on the side opposite to the current ball side and jumps instantly when the ball crosses.
- Offer lifetime is 5 seconds.
- Widget is square with size `33%` of screen height and centered vertically in its side zone.
- A one-tap purchase is supported on touch devices.
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
- If the ball leaves the playfield through left or right border, game over is triggered.
- Score is reset to 0 only when a new game starts (restart), so final game-over score remains visible.

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
