import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string | null | undefined) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/**
 * Avatar + name (+ optional secondary line / trailing node). The standard way to
 * render a person inside a table row or list across admin and dashboard.
 */
export function PersonCell({
  name,
  imageUrl,
  secondary,
  trailing,
  size = "sm",
  className,
}: {
  name: string | null | undefined;
  imageUrl?: string | null;
  secondary?: React.ReactNode;
  trailing?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Avatar size={size} className="shrink-0">
        {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
        <AvatarFallback className="text-[11px] font-semibold text-[var(--lobb-clay)]">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-[var(--lobb-text-primary)]">
          {name ?? <span className="text-[var(--lobb-text-tertiary)]">Unknown</span>}
          {trailing}
        </p>
        {secondary != null && (
          <p className="mt-0.5 truncate text-xs font-medium text-[var(--lobb-text-secondary)]">{secondary}</p>
        )}
      </div>
    </div>
  );
}
