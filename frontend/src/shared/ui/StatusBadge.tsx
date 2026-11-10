import { Badge } from "@mantine/core";
import { STATUS_LABELS } from "@/shared/lib/labels";

const COLORS: Record<string, string> = {
  PUBLISHED: "teal",
  AUTO_GRADED: "teal",
  REVIEWED: "teal",
  ACTIVE: "teal",
  DRAFT: "iba",
  IN_PROGRESS: "iba",
  SUBMITTED: "iba",
  NEEDS_REVIEW: "yellow",
  SCHEDULED: "yellow",
  OPEN: "teal",
  CLOSED: "gray",
  BLOCKED: "red",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge variant="light" color={COLORS[status] ?? "gray"} size="md" fz={11}>
      {label ?? STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
