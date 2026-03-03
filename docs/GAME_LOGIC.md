# Game Logic

## Scope
- The application contains a browser-based hybrid game combining Pong, Arkanoid, and Tetris mechanics.

## Orientation & Playfield
- The game runs in forced landscape mode.
- In portrait device orientation, the canvas is rotated to keep gameplay horizontal.
- The playfield has a thick border (finger-width on mobile) and all gameplay physics happen inside it.

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
- Block palette has 5 colors and excludes white/black.

### Spawn and Fall
- First block appears after the first paddle hit.
- On each paddle hit, blocks fall by one row where space is available.
- Additional blocks continue spawning over time at the top row.

### Ball-Block Interaction
- White ball matches any block color.
- Colored ball destroys only matching-color blocks.
- On matching hit: block is removed, ball changes to a random different palette color.
- On non-matching hit: block stays, ball bounces.

## Single-Player Scoring
- One shared score is used for the player controlling both paddles.
- Score +1 when the ball successfully crosses from one side of the center zone to the opposite side.
- If the ball leaves the playfield through left or right border, game over is triggered and score resets to 0.

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
