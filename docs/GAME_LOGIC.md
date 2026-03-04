# Game Logic

## Scope
- The application is a browser-based hybrid game combining Pong, Arkanoid, and Tetris mechanics.

## Orientation & Playfield
- The game runs in forced landscape mode.
- In portrait orientation, the canvas is rotated so gameplay remains horizontal.
- On touch devices, fullscreen is requested on the first user interaction (subject to browser policy).
- The layout includes a top panel and side margins; there is no bottom panel.
- Side margin is never smaller than one paddle width.
- Distance from each paddle to the nearest screen edge is at least one paddle width.
- No artificial bottom gameplay strip is reserved; the playfield uses full available canvas height.

## Core Layout
- The field has three zones:
  - Left paddle zone
  - Center Tetris zone (`6 x 12`)
  - Right paddle zone
- The center zone is visually highlighted.

## Controls
- Left paddle: `Q` up, `A` down.
- Right paddle: `]` up, `'` down.
- Mouse debug mode: hold left mouse button and move vertically to move both paddles together.
- On mobile, touching either side zone controls that side and synchronizes both paddles.
- Debug purchase: `Space` buys the currently visible bonus offer.

## Pause Behavior
- When the browser tab loses focus (`visibilitychange`), gameplay pauses immediately.
- On mobile/touch devices with auto-pause enabled in settings, gameplay pauses after `0.1s` without active touch input.
- Auto-pause is disabled by default and can be changed in settings.
- Pause exits on tap/click and resumes through countdown.
- Countdown tick is `500ms` (2x faster than the original `1000ms`).

## Top Panel UI
- Top panel color is gold.
- Left side: score label.
- Endless mode: `Finish` button appears during gameplay.
- Timed modes (`1:00`, `3:00`, `5:00`): countdown timer is shown instead of `Finish`.
- Score, `Finish`, and timer are laid out to avoid overlap with score values up to three digits.
- Right side: `Music`, `Sounds`, `Settings` circular buttons.
- Buttons are clickable on both desktop and mobile.
- In canvas, Font Awesome icons are rendered from local SVG assets.

## Settings
- Opened from the `Settings` button in the top panel.
- Includes:
  - Music volume (`0-100%`)
  - Sounds volume (`0-100%`)
  - Music on/off
  - Sounds on/off
  - Auto-pause on/off
  - Language selector (`ru` / `en`)
- Settings are preserved on round restart.
- Settings controls are interactive in both desktop and mobile versions (mouse/touch).
- Tapping/clicking outside the modal closes it.

## Localization
- UI strings are localized through `i18next`.
- Default language is Russian (`ru`) with English fallback (`en`).

## Paddle & Ball Rules
- Left paddle color: magenta.
- Right paddle color: cyan.
- Ball starts white.
- Ball bounces from top and bottom playfield boundaries.
- Missing left/right boundary ends the round (`gameover`).

## Tetromino System
- A tetromino can spawn after paddle hits.
- Active tetromino falls by one cell per paddle-hit step.
- Frozen tetromino blocks are stored as settled blocks.
- Unsupported settled pieces can fall as full figures by one step.

## Block Collision Rules
- White ball matches any block color.
- Colored ball destroys only same-color blocks.
- On matching hit: block is removed and ball color changes to another palette color.
- On non-matching hit: block remains and ball reflects.

## Bonus Shop
- Offer duration: `10s`.
- Time between offers: `10s`.
- Offer appears only if:
  - Ball stayed on one side for at least `5s`.
  - Current score is enough to buy the offer.
- Offer appears on the side opposite to current ball side.
- Offered color is never equal to current ball color.
- Purchase is one tap inside the bonus widget.

## Scoring
- Score `+1` when ball crosses from one outer side of center zone to the opposite side.
- `+1` animation appears near the ball and is larger than normal score text.
- Bonus purchase shows red `-N` animation.
- Round score resets on new round.
- Total score is cumulative, persisted in local storage, and does not reset on defeat.

## Session Finish
- `Finish` finalizes current round score and moves to finished screen.
- Finished screen shows:
  - Round score
  - Total cumulative score
- Finished screen has action buttons:
  - `New Game`
  - `Main Menu`
- `Enter` starts a new round with the current selected mode.

## Audio
- Audio files are loaded from `public/audio` using `BASE_URL`-aware paths.
- Music tracks play in sequence.
- On tab focus loss, all music tracks are stopped and reset.
- During in-game pause/settings, current music track is paused and resumed.
- Music and sound volumes are controlled independently.
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
- Component logic consumes config values instead of hardcoded constants.