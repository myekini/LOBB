-- ── Referral system ───────────────────────────────────────────────────────────
-- 1. referral_code on coaches (unique, generated on approval)
-- 2. referred_by_coach_id + referred_at on profiles (set once at signup)
-- 3. referral_credits table (₦1,500 per first booking by a referred player)

-- ── Step 1: Coach referral codes ──────────────────────────────────────────────
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_coaches_referral_code ON public.coaches(referral_code);

-- Generate codes for existing active coaches who don't have one yet
DO $$
DECLARE
  coach_row RECORD;
  base_code text;
  final_code text;
  suffix    int;
BEGIN
  FOR coach_row IN
    SELECT id, full_name
    FROM public.coaches
    WHERE status = 'active'
      AND referral_code IS NULL
      AND full_name IS NOT NULL
  LOOP
    base_code := lower(regexp_replace(coach_row.full_name, '[^a-zA-Z0-9]', '', 'g'));
    base_code := substring(base_code from 1 for 10);
    IF base_code = '' THEN
      base_code := 'coach';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.coaches WHERE referral_code = base_code) THEN
      UPDATE public.coaches SET referral_code = base_code WHERE id = coach_row.id;
    ELSE
      final_code := base_code;
      WHILE EXISTS (SELECT 1 FROM public.coaches WHERE referral_code = final_code) LOOP
        suffix     := floor(random() * 900 + 100)::int;
        final_code := base_code || suffix::text;
      END LOOP;
      UPDATE public.coaches SET referral_code = final_code WHERE id = coach_row.id;
    END IF;
  END LOOP;
END $$;

-- ── Step 2: Referral attribution on profiles ──────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_coach_id uuid REFERENCES public.coaches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referred_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_coach_id ON public.profiles(referred_by_coach_id);

-- ── Step 3: Referral credits table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_credits (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_coach_id    uuid        NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  referred_user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  triggering_booking_id uuid        NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  amount                integer     NOT NULL DEFAULT 1500,
  status                text        NOT NULL DEFAULT 'pending'
                                      CHECK (status IN ('pending', 'released', 'paid_out')),
  released_at           timestamptz,
  paid_out_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_credits_coach  ON public.referral_credits(referring_coach_id);
CREATE INDEX IF NOT EXISTS idx_referral_credits_user   ON public.referral_credits(referred_user_id);

-- ── Step 4: RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.referral_credits ENABLE ROW LEVEL SECURITY;

-- Coaches can read credits they earned
CREATE POLICY "coaches_read_own_referral_credits"
  ON public.referral_credits FOR SELECT
  USING (referring_coach_id = auth.uid());

-- Admins can manage everything
CREATE POLICY "admins_manage_referral_credits"
  ON public.referral_credits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
