# Bonus Icon Prompts

This document maps icon prompts to the **currently implemented bonuses** in the game.

## Implemented Bonus Mapping

### 1) `palette-color` bonus (cost: 3)
- Effect: changes ball color to one of palette colors from config.
- Current palette:
  - `#FF1744` (Red)
  - `#F57C00` (Orange)
  - `#FBC02D` (Yellow)
  - `#388E3C` (Green)
  - `#0277BD` (Blue)

### 2) `white-color` bonus (cost: 5)
- Effect: changes ball color to white `#FFFFFF`.

---

## Required Visual Style (append to every prompt)
- 1980s retro-futuristic / synthwave arcade aesthetics.
- Smooth gradients, glossy reflections, neon glow, airbrushed highlights.
- **No pixel art, no pixelation, no dithering, no chunky low-res look.**
- Clean silhouette, centered composition, transparent background.
- No text, no letters, no numbers, no logos.
- Square format `1024x1024`.

---

## Prompts — Exact Mapping to Existing Bonuses

## A. Color-specific icons for `palette-color`
Use one base composition and swap only the glow/core color.

### A1. `palette-color` -> Red (`#FF1744`)
"Arcade bonus icon in 1980s synthwave style: glossy spherical energy core with chrome ring frame, strong neon bloom and smooth airbrush highlights, dominant emissive color #FF1744, transparent background, centered, high contrast, no text, no pixelation."

### A2. `palette-color` -> Orange (`#F57C00`)
"Arcade bonus icon in 1980s synthwave style: glossy spherical energy core with chrome ring frame, strong neon bloom and smooth airbrush highlights, dominant emissive color #F57C00, transparent background, centered, high contrast, no text, no pixelation."

### A3. `palette-color` -> Yellow (`#FBC02D`)
"Arcade bonus icon in 1980s synthwave style: glossy spherical energy core with chrome ring frame, strong neon bloom and smooth airbrush highlights, dominant emissive color #FBC02D, transparent background, centered, high contrast, no text, no pixelation."

### A4. `palette-color` -> Green (`#388E3C`)
"Arcade bonus icon in 1980s synthwave style: glossy spherical energy core with chrome ring frame, strong neon bloom and smooth airbrush highlights, dominant emissive color #388E3C, transparent background, centered, high contrast, no text, no pixelation."

### A5. `palette-color` -> Blue (`#0277BD`)
"Arcade bonus icon in 1980s synthwave style: glossy spherical energy core with chrome ring frame, strong neon bloom and smooth airbrush highlights, dominant emissive color #0277BD, transparent background, centered, high contrast, no text, no pixelation."

## B. Icon for `white-color`
### B1. `white-color` -> White (`#FFFFFF`)
"Arcade wildcard bonus icon in 1980s synthwave style: bright white crystal orb with starburst rays, chrome outer ring, subtle rainbow prismatic refraction, smooth glossy shading, transparent background, centered, high contrast, no text, no pixelation."

---

## Paint.NET-friendly Recolorable Variant (for `palette-color`)
Use this if you want one master icon and fast recolor in editor.

### C1. Recolorable master icon prompt
"Create a clean arcade bonus icon in 1980s synthwave style with two clearly separable parts: (1) neutral grayscale chrome shell and reflections, (2) single-color emissive inner core on a flat color layer. Keep shell strictly gray/silver and keep only inner core colored. Transparent background, centered, smooth gradients, no text, no pixelation."

### C2. Recolor workflow (paint.net)
1. Keep shell/metal part unchanged.
2. Select only the emissive core layer.
3. Recolor core to one target color (`#FF1744`, `#F57C00`, `#FBC02D`, `#388E3C`, `#0277BD`).
4. Export PNG.

This keeps the icon identity identical while changing only bonus target color.

---

## Optional Negative Prompt
"no text, no letters, no numbers, no watermark, no logo, no characters, no UI mockup, no pixel art, no blocky pixels"
