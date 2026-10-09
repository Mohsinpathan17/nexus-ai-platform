import type { RunStatus } from "../../../shared/contracts";
export const statusLabels: Record<RunStatus, string> = {
  awaiting_executor: "Awaiting executor",
  running: "Running",
  awaiting_approval: "Awaiting approval",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
};
