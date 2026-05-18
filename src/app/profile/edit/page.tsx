"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("Tunde Adeyemi");
  const [saved, setSaved] = useState(false);

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-10 pt-5 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <header className="mb-8 flex items-center gap-3">
          <button onClick={() => router.back()} className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]" aria-label="Go back">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-black">Edit Profile</h1>
        </header>

        {saved && <p className="mb-5 rounded-[18px] bg-[#e8f4ed] px-4 py-3 text-sm font-black text-[var(--lobb-success)]">Profile saved.</p>}

        <div className="flex flex-col items-center rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-6">
          <div className="flex size-24 items-center justify-center rounded-full bg-[var(--lobb-black)] text-2xl font-black text-white">TA</div>
          <button className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--lobb-clay)]">
            <Camera className="size-4" />
            Change photo
          </button>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-black">Full name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 font-semibold outline-none focus:border-[var(--lobb-black)]" />
        </label>

        <button onClick={() => setSaved(true)} className="mt-8 h-14 w-full rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white">
          Save Changes
        </button>
      </section>
    </main>
  );
}
