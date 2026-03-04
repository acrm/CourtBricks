# Game Logic

## Scope
- The application is a browser-based hybrid game combining Pong, Arkanoid, and Tetris mechanics.

## Orientation & Playfield
- The game runs in forced landscape mode.
- In portrait orientation, the canvas is rotated to keep gameplay horizontal.
- On touch devices, fullscreen is requested on the first touch.
- The layout includes a top panel and side margins; there is no bottom panel.
- Side margin is never smaller than one paddle width.
- Distance from each paddle to the corresponding screen edge is at least one paddle width.
- On mobile devices, there is an additional bottom margin of `60px` to prevent touch detection issues at the screen edge.

## Core Layout
- The field has three zones:
  - Left paddle zone
  - Center Tetris zone (`6 x 12`)
  - Right paddle zone
- The center zone is highlighted.

## Controls
- Left paddle: `Q` up, `A` down.
- Right paddle: `]` up, `'` down.
- Touch paddle control: touch must start on the paddle body with `+50%` vertical tolerance.
- On mobile devices: moving one paddle automatically synchronizes the other paddle to the same position.
- Debug purchase: `Space` buys the currently visible bonus offer.
- Mouse debug mode: hold left mouse button and move vertically to move both paddles together.
- For desktop non-mobile debugging, pressed left mouse button is treated as tap-like active input for pause logic.

## Pause Behavior
- When the browser tab loses focus (visibility change), the game automatically pauses.
- On mobile/touch devices with auto-pause enabled in settings: if there is no active paddle touch for more than `0.1s`, gameplay pauses automatically.
- Auto-pause is disabled by default; it can be enabled in settings.
- Pause is exited by tap or mouse click.
- On resume, countdown runs again (`500ms` per tick, 2x faster than original `1000ms`) before gameplay is unfrozen.
display.
- Right side (from left to right): round `Finish` button (only during gameplay), `Music`, `Sounds`, and `Settings` buttons.
- Buttons use Font Awesome icons.
- Buttons are clickable on both desktop and mobile.
- In canvas, Font Awesome buttons are rendered from local SVG assets (npm package), not via HTML icon fonts.
- Top panel content uses horizontal safe padding equal to gameplay side padding.

## Settings
- Accessible via the `Settings` button in the top panel.
- Settings modal displays:
  - Music volume slider (`0-100%`)
  - Sounds volume slider (`0-100%`)
  - Music on/off toggle
  - Sounds on/off toggle
  - Auto-pause on/off toggle (default: off)
  - Language selector (Russian/English)
- Settings are preserved when restarting the game.
- Close settings by tapping the `Settings` button again
- Buttons use Font Awesome icons.
- In canvas, Font Awesome buttons are rendered from local SVG assets (npm package), not via HTML icon fonts.
- Top panel content uses horizontal safe padding equal to gameplay side padding.

## Localization (i18n)
- UI strings are localized via `i18next`.
- Default language is Russian (`ru`).
- English fallback is available.

## Paddle & Ball Rules
- Left paddle color: magenta.
- Right paddle color: cyan.
- Ball starts white.
- Ball bounces off top and bottom boundaries.
- On side miss, phase changes to game over.

## Tetromino System
- A tetromino can spawn after paddle hits.
- One active tetromino falls by one cell per paddle hit.
- Frozen tetromino blocks are stored as settled blocks.
- Settled unsupported pieces can fall as figures by one step.

## Block Collision Rules
- White ball matches any block color.
- Colored ball destroys only matching-color blocks.
- On matching hit: block is removed, ball changes to a different palette color.
- On non-matching hit: block remains, ball reflects.

## Bonus Shop
- Offer duration: `10s`.
- Time between offers: `10s`.
- Offer appears only if:
  - Ball stayed on one side for at least `3s`.
  - Current score is enough to buy the offer.
- Offer is shown on the side opposite to the current ball side.
- Offered color is never the same as the current ball color.
- Purchase is one tap inside the bonus widget.

## Scoring
- Score `+1` when ball crosses from one side of the center zone to the opposite side.
- Music pauses when the game is paused (including on tab visibility loss) and resumes from the same position when unpaused.
- Music and sound volume are controlled independently via settings.
- `+1` animation is shown near the ball and rendered larger than normal score text.
- Bonus purchase shows red `-N` animation.

## Session Finish
- `Finish` stores current round score and moves to finished screen.
- Finished screen shows:
  - Round score
  - Accumulated total score
- Tap or `Enter` starts a new round.

## Audio
- Audio files are loaded from `public/audio` using `BASE_URL`-aware paths (works in localhost and GitHub Pages subpath deployments).
- Music tracks play in sequence on loop.
- Sound effects are mapped to gameplay events:
  - Paddle hit
  - Wall hit
  - Block hit (non-matching)
  - Block destroy (matching)
  - Score gain
  - Countdown tick
  - Game over
  - Bonus offer appear
  - Bonus offer expire
  - Bonus purchase

## Configuration Policy
- Gameplay constants are centralized in `src/config/gameConfig.ts`.
- Component logic should consume config values instead of hardcoding constants.
