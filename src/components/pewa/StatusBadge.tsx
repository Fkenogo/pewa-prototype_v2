import type { MenuStatus } from "@/lib/pewa/types";
import { cn } from "@/lib/utils";

const styles: Record<MenuStatus, string> = {
  draft: "bg-status-draft/15 text-status-draft",
  published: "bg-status-published/15 text-status-published",
  hidden: "bg-status-hidden/15 text-status-hidden",
  archived: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: MenuStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        styles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
