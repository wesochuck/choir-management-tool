export type MaintenanceTaskName =
  | 'emailQueue'
  | 'postEventReport'
  | 'ticketBuyerReminder'
  | 'cleanup';

export interface MaintenanceTaskLock {
  startedAt: string;
  expiresAt: string;
}

export interface MaintenanceState {
  lastRuns?: Record<string, string>;
  running?: Record<string, MaintenanceTaskLock>;
}

export interface MaintenanceTaskResult {
  task: string;
  status: 'ran' | 'skipped' | 'failed';
  processed?: number;
  queued?: number;
  updated?: number;
  skipped?: number;
  errors?: number;
  message?: string;
}

export interface MaintenanceRunSummary {
  startedAt: string;
  finishedAt: string;
  results: MaintenanceTaskResult[];
}
