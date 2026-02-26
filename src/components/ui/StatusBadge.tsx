import clsx from "clsx";

type Status = "open" | "closed" | "service_alert" | "unknown";

const labels: Record<Status, string> = {
  open: "Open",
  closed: "Closed",
  service_alert: "Service Alert",
  unknown: "Status Unknown",
};

const styles: Record<Status, string> = {
  open: "bg-green-100 text-green-800",
  closed: "bg-red-100 text-red-800",
  service_alert: "bg-yellow-100 text-yellow-800",
  unknown: "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", styles[status])}>
      {labels[status]}
    </span>
  );
}
