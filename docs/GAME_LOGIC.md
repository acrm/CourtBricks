# Game Logic

## Scope
- The application contains a browser-based hybrid game combining Pong, Arkanoid, and Tetris mechanics.

## Game Overview
The game is a clever blend of three classic games:
- **Pong mechanics**: Two players control paddles on opposite sides to keep the ball in play
- **Arkanoid mechanics**: Blocks appear in the center zone and must be destroyed
- **Tetris mechanics**: Blocks fall down one row for each paddle hit

## Core Field Layout
- **Field divided into three zones**:
  - **Left zone**: Left player's paddle area
  - **Center zone**: Tetris grid (10 blocks wide × 20 blocks high)
  - **Right zone**: Right player's paddle area
- **Ball physics**: Constant velocity (~0.5 seconds to cross half the field), bounces off top/bottom boundaries

## Paddles
- Large paddles (18% of screen height) to make catching the ball manageable
- Controlled via keyboard (Q↑/A↓ for left, ]↑/'↓ for right) or touch

## Block System

### Grid Specifications
- **Width**: 10 blocks
- **Height**: 20 blocks
- **Block colors**: 5 colors (Red, Orange, Yellow, Green, Blue) - no white or black

### Block Spawning & Falling
- **First block spawns**: After the first successful paddle hit (serve)
- **Block fall mechanics**: One block falls one row down with each paddle hit
- **Multiple blocks**: Periodically spawn additional blocks as the rally continues
- **Block placement**: New blocks appear at the top of the center zone in random columns

## Ball Color Mechanics

### Color System
- **Initial state**: Ball starts white
- **After block hit**: Ball changes to a random color from the palette
- **Palette**: Red, Orange, Yellow, Green, Blue

### Color Matching Rules
- **White ball**: Matches any block color (destroys blocks regardless of their color)
- **Colored ball**: Must match block color to destroy it
- **Non-matching collision**: Ball bounces off the block without changing color
- **Matching collision**: Ball destroys block and changes to a new (different) color

### Destruction Logic
- Block destroyed only when ball color matches block color OR ball is white
- On destruction: Ball changes to random different color, block is removed from field
- Bounces off: Non-matching collision reflects ball without color change

## Gameplay Flow
1. **Countdown phase**: 3-second countdown before play starts
2. **Playing phase**: 
   - Ball moves continuously with increasing speed
   - Paddles can be moved freely (before serve)
   - First paddle hit initiates block spawning
   - Each paddle hit causes blocks to fall one row
   - Ball interacts with both paddles and blocks
3. **Scored phase**: 1.5-second delay after ball leaves screen (point awarded)
4. **Gameover phase**: Game ends when a player reaches 7 points

## Scoring
- Point awarded when ball passes opponent's paddle off-screen
- Blocks do not directly affect scoring - they are obstacles for ball interaction
- Win condition: First player to 7 points

## Sync Policy
- Update this file in the same task when gameplay behavior, scoring, controls, block mechanics, color system, or state transitions change.
