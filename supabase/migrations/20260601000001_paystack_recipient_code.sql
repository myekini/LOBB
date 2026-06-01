-- Switch from subaccount-split to Transfer API escrow model.
-- paystack_recipient_code is the Paystack transfer recipient code (RCPT_xxx)
-- created once per coach during bank onboarding.
alter table coaches
  add column if not exists paystack_recipient_code text;
