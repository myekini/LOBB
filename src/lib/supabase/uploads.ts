import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  folder = "avatars"
) {
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${folder}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from("coach-media").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("coach-media").getPublicUrl(path);
  return data.publicUrl;
}
