-- Auth hardening: password + passkey support
--
-- LOBB auth model: one-time OTP verification at signup, then a long-lived session.
-- Returning users re-authenticate with a password or a passkey (WebAuthn) — never
-- another OTP — so SMS/email delivery is a one-time cost per account.
--
-- These flags are UI hints only. The source of truth for credentials is Supabase
-- Auth (auth.users.encrypted_password and the WebAuthn factor tables). We mirror
-- "does this account have a password / passkey" here so the client can nudge users
-- who have neither, without a round-trip to the Auth admin API.

alter table public.profiles
  add column if not exists has_password boolean not null default false,
  add column if not exists has_passkey  boolean not null default false;

comment on column public.profiles.has_password is
  'UI hint: user has set a login password (mirrors auth.users.encrypted_password). Set by POST /api/auth/set-password.';
comment on column public.profiles.has_passkey is
  'UI hint: user has registered at least one passkey. Maintained by the passkey enrollment flow.';
