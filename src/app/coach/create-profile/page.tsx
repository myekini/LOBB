"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload } from "lucide-react";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { uploadProfilePhoto } from "@/lib/supabase/uploads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  headline: z.string().min(4, "Headline is required").max(90, "Keep this under 90 characters"),
  bio: z.string().min(40, "Bio must be at least 40 characters"),
  hourlyRateNgn: z.coerce.number().int().min(1000, "Minimum rate is NGN 1,000"),
  experienceYears: z.coerce.number().int().min(0, "Experience years cannot be negative"),
  primaryLocation: z.string().min(2, "Primary location is required"),
  serviceAreas: z.string().min(2, "Add at least one service area"),
  certifications: z.string().optional(),
  demoVideoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProfileFormInput = z.input<typeof profileSchema>;
type ProfileFormValues = z.output<typeof profileSchema>;

const skillLevelOptions = ["Beginner", "Intermediate", "Advanced", "Junior players"];

function splitList(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CreateCoachProfile() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [skillLevels, setSkillLevels] = useState<string[]>(["Beginner", "Intermediate"]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      hourlyRateNgn: 15000,
      experienceYears: 3,
      primaryLocation: "Ikoyi",
    },
  });

  const toggleSkillLevel = (level: string) => {
    setSkillLevels((current) =>
      current.includes(level)
        ? current.filter((item) => item !== level)
        : [...current, level]
    );
  };

  const onSubmit = async (data: ProfileFormValues) => {
    setSubmitError(null);

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error("Sign in before creating a coach profile");
      }

      if (skillLevels.length === 0) {
        throw new Error("Choose at least one player level you coach");
      }

      const userId = userData.user.id;
      const profilePhotoUrl = photo
        ? await uploadProfilePhoto(supabase, userId, photo, "coach-profile")
        : null;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          role: "coach",
          full_name: data.fullName,
          ...(profilePhotoUrl ? { avatar_url: profilePhotoUrl } : {}),
        })
        .eq("id", userId);

      if (profileError) {
        throw profileError;
      }

      const { error: coachError } = await supabase.from("coaches").upsert({
        id: userId,
        full_name: data.fullName,
        headline: data.headline,
        bio: data.bio,
        hourly_rate_ngn: data.hourlyRateNgn,
        experience_years: data.experienceYears,
        primary_location: data.primaryLocation,
        service_areas: splitList(data.serviceAreas),
        skill_levels: skillLevels,
        certifications: splitList(data.certifications),
        demo_video_url: data.demoVideoUrl || null,
        ...(profilePhotoUrl ? { profile_photo_url: profilePhotoUrl } : {}),
          status: "pending_review",
        });

      if (coachError) {
        throw coachError;
      }

      router.push("/coach/dashboard");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred while saving your profile.");
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:grid lg:grid-cols-[0.85fr_1.4fr]">
        <section className="pt-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">LOBB for coaches</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-stone-950">Create your coach profile</h1>
          <p className="mt-4 max-w-md text-base text-stone-600">
            Book a coach. Not a favor. Give Lagos players enough signal to choose you with confidence.
          </p>
        </section>

        <Card className="border-stone-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight text-stone-950">Coach details</CardTitle>
            <CardDescription>This goes into review before it appears in search.</CardDescription>
          </CardHeader>
          <CardContent>
            {submitError && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" placeholder="Tunde Bello" {...register("fullName")} />
                  {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryLocation">Primary Location</Label>
                  <Input id="primaryLocation" placeholder="Ikoyi Club" {...register("primaryLocation")} />
                  {errors.primaryLocation && <p className="text-sm text-red-600">{errors.primaryLocation.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input id="headline" placeholder="Technical coach for adult beginners and juniors" {...register("headline")} />
                {errors.headline && <p className="text-sm text-red-600">{errors.headline.message}</p>}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRateNgn">Hourly Rate (NGN)</Label>
                  <Input id="hourlyRateNgn" type="number" min={1000} step={500} {...register("hourlyRateNgn")} />
                  {errors.hourlyRateNgn && <p className="text-sm text-red-600">{errors.hourlyRateNgn.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceYears">Years of Experience</Label>
                  <Input id="experienceYears" type="number" min={0} {...register("experienceYears")} />
                  {errors.experienceYears && <p className="text-sm text-red-600">{errors.experienceYears.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Player Levels</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {skillLevelOptions.map((level) => (
                    <label
                      key={level}
                      className="flex h-10 items-center gap-3 rounded-lg border border-stone-200 px-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={skillLevels.includes(level)}
                        onChange={() => toggleSkillLevel(level)}
                        className="size-4 accent-emerald-950"
                      />
                      {level}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceAreas">Service Areas</Label>
                <Input id="serviceAreas" placeholder="Ikoyi, Lekki Phase 1, Victoria Island" {...register("serviceAreas")} />
                {errors.serviceAreas && <p className="text-sm text-red-600">{errors.serviceAreas.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Share your coaching style, where you train, and who you work best with."
                  className="min-h-32"
                  {...register("bio")}
                />
                {errors.bio && <p className="text-sm text-red-600">{errors.bio.message}</p>}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="certifications">Certifications</Label>
                  <Input id="certifications" placeholder="PTR, ITF Level 1" {...register("certifications")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demoVideoUrl">Demo Video URL</Label>
                  <Input id="demoVideoUrl" placeholder="https://youtube.com/watch?v=..." {...register("demoVideoUrl")} />
                  {errors.demoVideoUrl && <p className="text-sm text-red-600">{errors.demoVideoUrl.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profilePhoto">Profile Photo</Label>
                <label className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-stone-300 bg-white px-4 text-sm text-stone-600 hover:border-stone-500">
                  <Upload className="size-4" />
                  <span>{photo ? photo.name : "Upload JPG, PNG, or WebP"}</span>
                  <Input
                    id="profilePhoto"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => setPhoto(event.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <Button type="submit" className="h-10 w-full bg-emerald-950 hover:bg-emerald-900" disabled={isSubmitting}>
                {isSubmitting ? "Saving profile" : "Submit for review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
