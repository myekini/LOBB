import type { SupabaseClient } from "@supabase/supabase-js";

// Bucket must be one of the two created in 20260624000003_views_rls.sql:
// "avatars" (any authenticated user, RLS scoped to their own uid folder) or
// "coach-photos" (same scoping, plus requires a public.coaches row for that
// uid). Passing anything else 404s with "Bucket not found" — there's no
// third bucket, so don't invent one without a matching migration.
export async function uploadProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  folder = "avatars",
  bucket: "avatars" | "coach-photos" = "coach-photos"
) {
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${folder}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
