# LOBB documentation

The documentation is intentionally flat. Each file is a canonical source of truth:

- [Product](PRODUCT.md) — purpose, users, principles, and inclusion
- [Design](DESIGN.md) — tokens, components, accessibility, and brand usage
- [Flows](FLOWS.md) — authentication, booking, availability, payments, KYC, referrals, and disputes
- [Operations](OPERATIONS.md) — environments, deployments, jobs, monitoring, and recovery
- [Security](SECURITY.md) — authorization, sensitive data, money movement, and known gaps
- [Setup](SETUP.md) — Supabase dashboard and environment setup

Historical feature dumps and exploratory research are intentionally not retained as parallel documentation sources.

## Cleanup manifest

| Classification | Location | Decision |
| --- | --- | --- |
| Keep | `src/app/api`, `supabase/migrations`, `legal/`, `brand/` | Runtime, compliance, and product assets |
| Merge | Shared UI controls and state components | Migrate to `src/components/ui` and `src/components/feedback` |
| Archive | Historical product exploration | Removed after extracting relevant flow and design decisions |
| Delete | `.claude/skills`, duplicate design/feature documents | Removed; no runtime references were found |
