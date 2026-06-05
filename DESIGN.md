# Design

## Visual Theme
The visual theme is **Saturday Morning Court**, a warm-neutral athletic theme inspired by tennis clay, paper textures, and premium sports editorial layouts. It supports a full responsive Dark Mode.

## Typography
- **Font Stack**: Clean, geometric sans-serif stack (system defaults paired with `lucide-react` icons).
- **Scale**: Fixed rem scales. No fluid clamp sizing for in-app views (headers, sidebars, dashboard metrics).
- **Letter Spacing**: Display headings use tight tracking (`tracking-tight` or `-0.02em` to `-0.04em`). No tracking tighter than `-0.04em`.

## Color Palette
Using a curated, high-contrast, warm-neutral athletic palette:

### Light Mode ("Saturday Morning Court")
- `--lobb-bg-primary`: `#FAF8F5` (warm clay-tinted off-white)
- `--lobb-bg-secondary`: `#F2EFE9` (darker panel wash)
- `--lobb-bg-elevated`: `#FFFFFF` (pure white sheet cards)
- `--lobb-bg-inverse`: `#0D0D0D` (deep charcoal black)
- `--lobb-clay`: `#C4622D` (primary clay orange brand color)
- `--lobb-clay-light`: `#F5E6DC` (soft clay highlight)
- `--lobb-clay-dark`: `#A3501F` (deep active clay hover)
- `--lobb-text-primary`: `#1A1714` (ink black body)
- `--lobb-text-secondary`: `#6B6560` (readable neutral text)
- `--lobb-text-tertiary`: `#A09890` (quiet text/labels)
- `--lobb-border-subtle`: `#E8E3DC` (fine borders)

### Dark Mode
- `--lobb-bg-primary`: `#0D0D0D` (deep pitch)
- `--lobb-bg-secondary`: `#1A1714` (dark panel charcoal)
- `--lobb-bg-elevated`: `#242018` (warm charcoal elevated card)
- `--lobb-bg-inverse`: `#FAF8F5` (warm paper text)
- `--lobb-clay-light`: `rgba(196, 98, 45, 0.15)`
- `--lobb-clay-dark`: `#E2824C`
- `--lobb-text-primary`: `#FAF8F5`
- `--lobb-text-secondary`: `#A09890`
- `--lobb-text-tertiary`: `#6B6560`
- `--lobb-border-subtle`: `#2E2924`

## Layout and Spacing
- **Grids**: Responsive layout grids using `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- **Card Borders**: Crisp `border border-border` with max `rounded-[12px]` to `rounded-[14px]` (no oversized roundness).
- **Navigation Controls**:
  - PWA/Mobile: Rounded floating bottom nav menu (`lobb-bottom-nav`) with blur overlays.
  - Desktop: Top header header-centered navigation panels.

## Key CSS Classes
- `.lobb-landing`: Standard marketing backdrop styles.
- `.lobb-app-card`: Premium dashboard sheet container styling.
- `.lobb-bottom-nav`: Translucent glass-filtered mobile navigation bar.
- `.lobb-onboarding`: Container styling with subtle athletic court grid gridlines.
