# Game Logic

## Scope
- The application contains a browser-based hybrid game combining Pong, Arkanoid, and Tetris mechanics.

## Orientation & Playfield
- The game runs in forced landscape mode.
- In portrait device orientation, the canvas is rotated to keep gameplay horizontal.
- The playfield includes top, bottom, and side panels (at least 10% of screen dimension).
- Top panel displays the current score.
- Bottom panel contains a settings button placeholder.
- Side panels create margins between paddles and the screen edges.
- All gameplay physics happen inside the central playfield between these panels.

## Core Layout
- The field is split into three zones:
  - Left paddle zone
  - Center Tetris zone (10 columns × 20 rows)
  - Right paddle zone
- The center Tetris zone is visually highlighted during gameplay.

## Controls
- Left paddle: `Q` up, `A` down.
- Right paddle: `]` up, `'` down.
- Touch: left/right half of the screen controls the corresponding paddle.
- Debug mouse mode: hold left mouse button and move mouse vertically to move both paddles synchronously.

## Paddle & Ball Rules
- Paddle height is 66% of playable field height.
- Ball speed is reduced by 2× compared to previous tuning.
- Ball starts white and keeps constant speed (no acceleration).
- Ball bounces off top and bottom playfield borders.

## Block System

### Grid and Colors
- Grid size: 10 columns × 20 rows.
- Blocks are strictly square.
- Square size is derived from playable field height (`height / 20`), and zone width is `10 * blockSize`.
- Block palette has 5 colors and excludes white/black.

### Spawn and Fall
- First tetromino appears after the first paddle hit.
- Only one tetromino is active (falling) at a time.
- The active tetromino falls one row down at regular intervals (configurable in gameConfig).
- When any block of the active tetromino hits the bottom or another static block below, the entire tetromino freezes in place.
- After a tetromino freezes, a new one spawns at the top.
- All blocks inside one spawned tetromino have the same color.

### Ball Trail
- The ball leaves a fading trail of its current color behind it.
- Trail opacity gradually decreases from front to back.
- Trail length and opacity parameters are configurable.

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
