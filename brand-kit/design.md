# LOBB Design System

Private internal reference for the LOBB product interface and brand expression.

Rendered preview:

```txt
brand-kit/brand-preview.html
```

Core assets:

```txt
brand-kit/logos/
brand-kit/badges/
brand-kit/favicons/
```

## Brand Position

LOBB is a premium but practical sports marketplace. The interface should feel like a high-trust operations tool for serious players, verified coaches, and platform admins.

The brand promise is:

> Book a coach. Not a favor.

## Design Principles

| Principle | Meaning |
| --- | --- |
| Premium restraint | Use strong hierarchy, whitespace, and material discipline instead of decorative effects. |
| Operational clarity | Booking, schedule, payout, and admin tasks should scan quickly and work repeatedly. |
| Human warmth | Clay accents and warm surfaces keep the product from feeling cold or overly corporate. |
| Trust first | Every payment, coach approval, booking, and cancellation state should feel explicit and calm. |
| Mobile native | Player and coach flows are mobile-first. Admin screens are desktop-first but must work on mobile. |

## Color Tokens

| Token | Hex | Role |
| --- | --- | --- |
| `--lobb-black` | `#0D0D0D` | Primary text, active tabs, dark hero cards, high-confidence actions |
| `--lobb-clay` | `#C4622D` | Primary CTA, active booking state, brand emphasis |
| `--lobb-bg` | `#F2F1EF` | Warm page background and large surface bands |
| `--lobb-surface` | `#FAFAFA` | Cards, forms, list rows, modals |
| `--lobb-border` | `#E5E3DF` | Thin dividers and quiet borders |
| `--lobb-muted` | `#8A8A8A` | Helper text, captions, inactive nav |
| `--lobb-success` | `#2D6A4F` | Confirmed, approved, paid, success |
| `--lobb-error` | `#BA1A1A` | Cancel, reject, failed payment |
| `--lobb-warning` | `#F4A228` | Review pending, ratings, attention states |

Avoid one-note palettes. Black, clay, warm off-white, and muted grey should share the page. Do not let the UI become all clay, all slate, or all beige.

## Typography

Primary font:

```txt
Hanken Grotesk
```

Currency/data font:

```txt
JetBrains Mono
```

| Style | Size | Weight | Line height | Use |
| --- | --- | --- | --- | --- |
| Headline XL | 48px | 700 | 1.1 | Rare desktop hero or major metric |
| Headline LG | 32px | 700 | 1.2 | Desktop page title |
| Headline Mobile | 28px | 700 | 1.2 | Mobile page title |
| Headline MD | 24px | 600 | 1.3 | Section title, card title |
| Body LG | 18px | 400 | 1.6 | Larger descriptions |
| Body MD | 16px | 400 | 1.5 | Primary body text |
| Label MD | 14px | 500 | 1.4 | Buttons, field labels, nav labels |
| Label SM | 12px | 600 | 1.2 | Captions, badges, metadata |
| Currency | 16px | 500 | 1 | Prices, GMV, fees, payouts |

Keep letter spacing at `0` for normal text. Use uppercase tracking only for tiny labels where it improves scanning.

## Spacing

Base unit:

```txt
4px
```

| Token | Value | Use |
| --- | --- | --- |
| `unit` | 4px | Small alignment increments |
| `stack-sm` | 8px | Tight vertical grouping |
| `stack-md` | 16px | Default internal spacing |
| `stack-lg` | 32px | Section grouping |
| `gutter` | 24px | Desktop grid gap |
| `margin-mobile` | 16px | Mobile page side margin |
| `container-max` | 1280px | Desktop content width |
| `section-gap` | 80px | Large editorial separation |

Cards should use predictable padding. If the card padding is `24px`, internal stack spacing should usually be `12px` to `16px`.

## Radius

| Element | Radius |
| --- | --- |
| Cards | 8px to 16px depending on density |
| Buttons | 14px |
| Inputs | 12px |
| Badges/chips | 9999px |
| Avatars | 9999px |

Operational surfaces such as dashboards should prefer tighter radii. Do not over-round dense admin UI.

## Elevation

Use tonal layering first. Shadows should be rare and quiet.

```css
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
```

Use elevation for:

- Modals
- Active/hover cards
- Sticky bottom actions
- Floating mobile navigation where needed

Avoid heavy shadows, glow effects, gradient blobs, and decorative orbs.

## Components

### Buttons

| Variant | Styling | Use |
| --- | --- | --- |
| Primary | `--lobb-clay` fill, white text | Main booking/payment/profile action |
| Dark | `--lobb-black` fill, white text | Active tabs, admin actions, strong confirmation |
| Outline | Transparent, black border/text | Secondary action |
| Danger outline | Transparent, red border/text | Cancel, reject |
| Ghost | No border, muted/black text | Low emphasis navigation |

Buttons should include icons when the action is clearer with a familiar symbol.

### Cards

Default cards use `--lobb-surface` or warm surface fills with a thin border only when separation is needed.

Use cards for:

- Coach summaries
- Booking rows
- Payment summaries
- Admin approval items
- Modal content

Avoid nesting cards inside cards.

### Forms

Inputs and textareas:

- 12px radius
- 1px warm border
- `--lobb-surface` background
- Dark border on focus
- No glow

Labels should be short and direct. Helper text belongs below fields and uses `--lobb-muted`.

### Tabs

Tabs should be full width on mobile when switching primary views.

Active:

```txt
--lobb-black background, white text
```

Inactive:

```txt
--lobb-surface background, muted or black text
```

### Status Badges

| Status | Treatment |
| --- | --- |
| Confirmed | Green dot and `--lobb-success` text |
| Completed | Check icon or neutral success badge |
| Pending | Clay or amber accent |
| Cancelled | Red text or red outline |
| Disputed | Warning accent |

## Product-Specific Patterns

### Booking Flow

The booking flow must show exactly what is being booked before payment:

1. Step 1 confirms slot.
2. Step 2 captures session details.
3. Step 3 shows payment summary.
4. Confirmation gives reassurance and booking reference.

Payment copy should be transparent and short. No surprise fees.

### Player Dashboard

Player dashboard screens should be compact and tappable:

- Upcoming and past tabs
- Booking cards with coach mini-row
- Clear review prompts
- Bottom nav with bookings active

### Coach Workspace

Coach screens are operational:

- Metrics first
- Next session prominent
- Bookings, earnings, profile, availability accessible from nav
- Profile completion must be visible until complete

### Admin Workspace

Admin screens are desktop-first:

- Simple shell
- Dense stat cards
- Clear action items
- Compact booking rows
- Decision modals with explicit consequences

Admin must remain usable on mobile, but does not need the same consumer polish as player booking.

## Accessibility

- Preserve visible focus states.
- Do not rely on color alone for status.
- Keep tap targets at least 44px where possible.
- Use semantic links for phone numbers with `tel:`.
- Use clear button labels for destructive actions.

## Implementation Notes

Use the global CSS tokens in `src/app/globals.css` and Tailwind theme extensions in `tailwind.config.ts`.

When adding new screens:

1. Start from existing page shells and nav components.
2. Reuse the existing card, button, input, select, and textarea primitives.
3. Match current route protection behavior.
4. Keep copy short and action-oriented.
5. Verify mobile first, then desktop.

## Do Not Use

- Decorative gradient blobs
- Heavy glassmorphism
- Stock-photo filler where a real product state is needed
- Nested cards
- Large marketing hero layouts inside operational screens
- Hidden fees or ambiguous payment copy

## Asset Usage

Preferred full logo:

```txt
brand-kit/logos/lobb-logo-with-tagline.svg
```

Preferred mark:

```txt
brand-kit/logos/lobb-mark.svg
```

Verified badge:

```txt
brand-kit/badges/lobb-verified.svg
```

Favicons:

```txt
brand-kit/favicons/
```
