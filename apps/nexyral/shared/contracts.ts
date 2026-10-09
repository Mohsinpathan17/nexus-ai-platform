import type { RunOutputs } from "./preview.ts";
export interface User {
  id: string;
  name: string;
  email: string;
}
export interface Session {
  user: User | null;
  csrfToken: string | null;
  emailVerified?: boolean;
  githubConnected?: boolean;
  emailDelivery?: "sent" | "failed" | "not_configured";
}
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  runCount: number;
}
export interface ProjectRequirements {
  text: string;
  revision: number;
  updatedAt: string | null;
}
export type RunStatus =
  | "awaiting_executor"
  | "running"
  | "awaiting_approval"
  | "succeeded"
  | "failed"
  | "cancelled";
export type RunStage =
  "intent" | "understand" | "plan" | "build" | "verify" | "ship";
export interface EngineeringRun {
  id: string;
  projectId: string;
  intent: string;
  status: RunStatus;
  stage: RunStage;
  createdAt: string;
  updatedAt: string;
}
export interface RunEvent {
  id: number;
  runId: string;
  type: "run.created" | "executor.unavailable" | "run.cancelled" | "worker.started" | "plan.ready" | "worker.failed" | "plan.approved" | "preview.retained" | "preview.unavailable" | "preview.expired" | "plan.revised" | "plan.rejected" | "build.started" | "build.completed" | "build.failed";
  message: string;
  createdAt: string;
}
export interface RunHistoryEntry extends EngineeringRun {
  sequence?: number;
  parentRunId?: string;
}
export interface Artifact {
  id: string;
  runId: string;
  name: string;
  kind: "intent" | "plan" | "patch" | "verification" | "release" | "preview";
  content: string;
  createdAt: string;
}
export interface RunDetail {
  run: EngineeringRun;
  events: RunEvent[];
  artifacts: Artifact[];
  outputs?: RunOutputs;
  executor: { available: boolean; buildAvailable?: boolean; reason: string };
}
export const executorReason =
  "No engineering worker is connected. Your intent is stored; no software has been generated or verified.";
