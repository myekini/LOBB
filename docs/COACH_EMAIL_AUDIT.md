# Coach Email Audit

## Current Coach Emails

| Coach operation | Status | Trigger | Template |
|---|---:|---|---|
| Booking confirmed | Implemented | Payment verify/webhook | `bookingConfirmedCoachEmail` |
| 24h session reminder | Implemented | Scheduled notification job | `bookingReminderEmail(..., "coach")` |
| Booking cancelled | Implemented | Booking cancel API | `bookingCancelledEmail(..., "coach")` |
| Coach profile approved | Implemented | Admin coach decision | `coachDecisionEmail("approve")` |
| Coach profile rejected | Implemented | Admin coach decision | `coachDecisionEmail("reject")` |
| Payout processed | Implemented | Admin payout trigger | `payoutProcessedEmail` |

## Recommended Coach Emails Next

| Coach operation | Priority | Why |
|---|---:|---|
| Profile submitted for review | High | Confirms submission and sets review-time expectations. |
| Availability saved/changed | Medium | Useful after major schedule edits, but should be throttled to avoid noisy emails. |
| Bank account connected/changed | High | Security-sensitive payout destination change. |
| Booking rescheduled | Future | Needed when rescheduling exists. |
| Payout failed | High | Coach needs to fix bank details quickly. |
| Weekly coach performance digest | Medium | Helps coaches track bookings, earnings, reviews, and missing availability. |
| New review received | Medium | Reinforces quality loop and coach engagement. |
| Coach account suspended/reactivated | High | Operationally important account state change. |

## Template Direction

- Premium warm light mode: cream background, white card, black CTA, burnt-orange accents.
- Short operational copy: one clear reason for the email, one clear action.
- Details are shown as a compact label/value table.
- Footer includes LOBB brand, support email, and social links.
- Coach emails should point to coach surfaces: bookings, availability, earnings, or profile edit.

## In-App Notification Standard

Use the shared `showLobbToast` helper for all web and PWA feedback.

| Type | Use for | Tone |
|---|---|---|
| `success` | Saved changes, completed actions, confirmed submissions | Calm confirmation, no over-celebration |
| `error` | Failed saves, failed loads, invalid actions | Clear next step, avoid technical wording when possible |
| `warning` | Expiring holds, risky actions, time-sensitive reminders | Urgent but not alarming |
| `info` | Neutral system updates, cache/hold notices | Helpful context |

Guidelines:
- Keep messages under one sentence where possible.
- Put operational detail in the screen, not the toast.
- Use success/error toasts after mutations; avoid noisy toasts for normal navigation.
- Mobile/PWA toasts appear above bottom navigation; desktop toasts appear top-right.
