"use client";

export function ImageUpload({ onChange }: { onChange: (file: File) => void }) {
  return <input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onChange(event.target.files[0])} className="block w-full text-sm font-semibold" />;
}
