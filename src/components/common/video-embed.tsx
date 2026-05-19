export function VideoEmbed({ url, title = "Coach video" }: { url: string; title?: string }) {
  return <iframe src={url} title={title} className="aspect-video w-full rounded-[18px] border border-[var(--lobb-border)]" allowFullScreen />;
}
