"use client";

import { Input as LobbInput } from "@/components/ui/input";
export function ImageUpload({ onChange }: { onChange: (file: File) => void }) {
  return <LobbInput type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onChange(event.target.files[0])} className="block w-full text-sm font-medium" />;
}
