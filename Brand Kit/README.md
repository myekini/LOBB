# LOBB Brand Kit

## Structure
- `mark/` — the swoosh+ball mark alone, transparent SVG, one flat fill each in rust/ink/paper. Includes a 512px PNG for platforms that need a raster.
- `wordmark/` — "LOBB" alone, system bold sans, transparent SVG in ink/paper/rust.
- `lockups/` — mark + wordmark combined, in three arrangements (horizontal, stacked, tagline), each built for placement on light or dark surfaces. The mark is always rust — only the wordmark switches to ink or paper depending on the surface.
- `favicon/` — favicon and app-icon art (heavier stroke, tuned for tiny sizes), exported as SVG plus PNGs at the standard sizes browsers/OSes ask for (16, 32, 180, 512px).
- `badge/` — the circular "Verified" badge for coach profiles.
- `colors.json`, `typography.json` — the palette and type spec as machine-readable tokens.

## Color
Two-color system: rust (`#C4622D`) is the only accent, used for the mark and CTAs. Ink (`#0D0D0D`) and paper (`#FAFAF8`) are the two surfaces/text colors. Nothing else. See `colors.json`.

## Type
Wordmark: system bold sans (Arial/Helvetica, weight 800, letter-spacing -2px on the 222×60 grid). No licensed or embedded font — renders identically on every device, no fallback risk.
UI/body copy: system sans-serif stack, regular/medium/bold. See `typography.json`.

## Rules
- Every logo file is transparent — never place a lockup on a baked-in background rectangle. Use the light or dark variant that matches the surface instead.
- The mark is always rust. Never recolor the mark itself to ink or paper — only the wordmark text changes color across surfaces.
- Minimum size for the mark alone: 16px (favicon/tab icon).
- Minimum width for the horizontal lockup: 100px — below that, drop to mark-only.
- Clear space around any lockup: at least 0.5× the mark's height, on all sides.
- Never rebuild the wordmark in a different typeface or add letter effects (bevels, outlines, drop shadows).
- Never stretch or skew the mark or wordmark.
