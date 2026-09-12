# LOBB design system

LOBB should feel like a calm, trustworthy operations product: warm enough to feel human, restrained enough to make booking and money movement easy to scan.

## Foundations

### Tokens

`src/styles/tokens.css` defines scales. `src/app/globals.css` owns light and dark values. Shadcn aliases (`--background`, `--card`, `--primary`, and related tokens) map directly to LOBB tokens; do not introduce a parallel palette.

| System | Allowed values |
| --- | --- |
| Control height | 32px, 40px, 48px |
| Radius | 6px, 10px, 14px |
| Spacing | 4px base scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px |
| Weight | 400 body, 500–600 UI, 700 headings and essential emphasis |
| Elevation | Floating navigation, popovers, modals, and active elevation only |

### Colour roles

- Clay is the sole brand/action accent: primary calls to action, active selection, and small emphasis.
- Charcoal is for neutral high-confidence actions and inverse surfaces.
- Warm paper surfaces are for pages, cards, and fields.
- Green, amber, and red are semantic only: success, warning, and error. Never use them as decorative accents.
- Pills are reserved for status and removable filters. Use the 6px radius for ordinary metadata labels.

## Component contract

All new product UI must use the shared components below — never a
one-off styled native control. Two locations, two different jobs:

- `src/components/ui` — plain primitives (inputs, buttons, cards). No LOBB
  branding baked in beyond the design tokens.
- `src/components/common` — LOBB-specific composites built on those
  primitives (skeletons, empty/error states, the verified badge). Import
  from here when the primitive alone isn't the whole UI pattern.

| Component | Where | Use | States included |
| --- | --- | --- | --- |
| `Button` / icon sizes | `ui/button` | Clay primary, dark, quiet secondary, ghost, destructive actions | Hover, pressed, focus, disabled, invalid |
| `Input`, `Textarea`, `Field` | `ui/input`, `ui/textarea`, `ui/field` | Every ordinary form control and its label, hint, or error | Focus, invalid, disabled |
| `Select`, `SearchableSelect`, `SearchInput` | `ui/select`, `ui/searchable-select`, `ui/search-input` | Controlled options, long searchable lists, and free-text search | Hover, focus, open, invalid, disabled, empty |
| `Checkbox`, `ConsentCheckbox` | `ui/checkbox`, `ui/consent-checkbox` | Boolean preferences; `ConsentCheckbox` specifically for legal/consent copy — see FLOWS.md's Checkboxes & consent section for when to add a new one | Hover, checked, focus, disabled |
| `StatusBadge` | `ui/status-badge` | Semantic status only | Success, warning, error, neutral |
| `LobbVerifiedBadge` | `common/lobb-badge` | Coach verification only | Verified / not |
| `Tabs` | `ui/tabs` | Segmented view switching | Selected, hover, keyboard focus |
| `Card` | `ui/card` | `surface`, `outlined`, `interactive`, or `inset` content containers | Hover for interactive cards only |
| `Avatar`, `AvatarGroup`, `CoachAvatarGroup` | `ui/avatar`, `ui/coach-avatar-group` | User profile avatars, stacked groups, and hover preview cards | Sizes, image fallback, overflow count, hover popover |
| `FormAlert` | `ui/form-alert` | Inline success, information, warning, and error feedback | Accessible `alert`/`status` roles |
| `SkeletonBlock` + friends, `LobbBrandLoader`, `InlineActionLoader` | `common/lobb-skeleton` | Content and page loading | Motion honours reduced-motion preferences |
| `LobbEmptyState` | `common/lobb-empty-state` | No-results / nothing-here states | Optional action support |
| `LobbErrorBanner`, `LobbEmptyErrorState`, `LobbFieldError` | `common/lobb-error` | Failure and recovery flows | Optional retry/action support |

Existing native controls should migrate to these as their containing screen
is touched — not as a standalone sweep.

## Surface rules

- `surface`: elevated paper, no automatic border or shadow.
- `outlined`: surface plus quiet border.
- `interactive`: outlined card with a quiet hover surface shift.
- `inset`: secondary warm background for grouping inside another surface.
- Do not nest cards merely to make spacing. Use stack spacing and dividers first.

## Accessibility and interaction

- Keep controls at least 40px high; prefer 48px for form and mobile actions.
- Every interactive element has a visible clay focus ring.
- Error states pair colour with text and an icon where necessary.
- Use `disabled` only when the user can understand how to re-enable an action.
- Keep transitions to 150–200ms and use transform/opacity for motion.

## Brand assets

See `Brand Kit/README.md` for the full system (usage rules, clear space, minimum sizes).

- Mark: `Brand Kit/mark/`
- Wordmark: `Brand Kit/wordmark/`
- Combined lockups: `Brand Kit/lockups/`
- Favicons / app icons: `Brand Kit/favicon/`
- Verified badge: `Brand Kit/badge/`
- Color / type tokens: `Brand Kit/colors.json`, `Brand Kit/typography.json`

The product promise is: **Book a coach. Not a favor.**
