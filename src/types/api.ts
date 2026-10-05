/**
 * Response shapes of the backend API (/api/v1). Mirrors the backend DTOs in
 * backend/src/application/dto and use-case return types.
 */

export type UserRole = 'learning_team' | 'hr' | 'manager' | 'team_member';
export type ReportingAccess = 'full' | 'self';
export type ProfileStatus = 'active' | 'pending' | 'inactive';
export type EvidenceMode = 'certificate' | 'acknowledgement';
export type ReviewStatus = 'not_reviewed' | 'verified' | 'flagged' | 'rejected';
export type ItemStatus = 'completed' | 'overdue' | 'outstanding';
export type VisibilityScope = 'all' | 'team' | 'self';
export type OverdueFrequency = 'daily' | 'weekly' | 'fortnightly';
export type CcPolicy = 'never' | 'overdue' | 'always';
export type TeamReportKind = 'log' | 'completion' | 'mandatory' | 'outstanding' | 'evidence' | 'icaew' | 'acca';
export type MyReportKind = 'all' | 'period' | 'outstanding';

export interface Named {
  id: number;
  name: string;
}

export interface Person {
  id: string;
  fullName: string;
  email: string;
  initials: string;
  avatarColor: string | null;
  role: UserRole;
  designation: Named | null;
  reportingAccess: ReportingAccess;
  lineManager: { id: string; fullName: string } | null;
  status: ProfileStatus;
  hasAccount: boolean;
}

export interface PersonAdmin extends Person {
  lastSeenAt: string | null;
  reportCount: number;
}

export interface Permissions {
  scope: VisibilityScope;
  manageItems: boolean;
  manageCycles: boolean;
  manageUsers: boolean;
  manageReminders: boolean;
  reviewEvidence: boolean;
  /** Approve / reject evidence and re-run checks (Learning Team). */
  decideEvidence: boolean;
  viewTeam: boolean;
}

export interface Cycle {
  id: string;
  year: number;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
}

export interface Me {
  profile: Person;
  permissions: Permissions;
  currentCycle: Cycle | null;
}

export interface Lookups {
  designations: (Named & { rank: number; grantsFullAccess: boolean })[];
  categories: (Named & { sortOrder: number })[];
  cpdTypes: (Named & { sortOrder: number })[];
  deliveryTypes: (Named & { sortOrder: number })[];
}

export interface LearningItem {
  id: string;
  cycleId: string;
  title: string;
  category: Named;
  cpdType: Named;
  deliveryType: Named;
  provider: string;
  hours: number;
  dueDate: string | null;
  isMandatory: boolean;
  evidenceMode: EvidenceMode;
  link: string | null;
  description: string | null;
  audience: { all: boolean; designations: Named[]; people: { id: string; fullName: string }[]; label: string };
  archived: boolean;
}

export interface Completion {
  id: string;
  completedOn: string;
  reflection: string | null;
  evidence: { fileName: string; mimeType: string; sizeBytes: number } | null;
  reviewStatus: ReviewStatus;
  reviewSource: 'ai' | 'manual' | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  submittedAt: string;
  /** Latest automatic check of the file. */
  check: EvidenceCheck | null;
}

export type CheckResult = 'match' | 'partial' | 'mismatch' | 'not_found';

export interface EvidenceCheck {
  status: 'queued' | 'running' | 'done' | 'failed';
  decision: 'verified' | 'flagged' | null;
  reasons: string[];
  confidence: number | null;
  documentType: string | null;
  summary: string | null;
  extracted: {
    participantName: string | null;
    courseTitle: string | null;
    provider: string | null;
    completionDate: string | null;
    hours: number | null;
    certificateId: string | null;
  } | null;
  checks: { name: CheckResult; title: CheckResult; provider: CheckResult } | null;
  tamperingSigns: string[];
  model: string | null;
  finishedAt: string | null;
}

export interface PlanEntry {
  item: LearningItem;
  status: ItemStatus;
  /** Completed and the evidence is confirmed; false while under review (or not completed). */
  confirmed: boolean;
  daysOverdue: number;
  daysUntilDue: number | null;
  completion: Completion | null;
  /** Submission the Learning Team rejected - the item is outstanding again. */
  rejected: Completion | null;
}

export interface ProgressSummary {
  assigned: number;
  completed: number;
  outstanding: number;
  overdue: number;
  mandatoryAssigned: number;
  mandatoryCompleted: number;
  mandatoryOutstanding: number;
  hoursAssigned: number;
  hoursCompleted: number;
  hoursOutstanding: number;
  completionPct: number;
  /** Completed with confirmed evidence (verified / approved / no file needed). */
  confirmed: number;
  mandatoryConfirmed: number;
  hoursConfirmed: number;
  /** Completed, evidence still being checked or reviewed. */
  underReview: number;
  confirmedPct: number;
}

export interface Plan {
  cycle: Cycle;
  today: string;
  person: Person;
  summary: ProgressSummary;
  entries: PlanEntry[];
  hoursByCategory: { category: string; hours: number }[];
}

export interface MemberProgress {
  person: Person;
  summary: ProgressSummary;
}

export interface Overview {
  cycle: Cycle;
  today: string;
  scope: 'all' | 'team';
  kpis: {
    itemCount: number;
    mandatoryItemCount: number;
    templateHours: number;
    memberCount: number;
    averageCompletionPct: number;
    evidenceCount: number;
    hoursLogged: number;
    outstandingCount: number;
    overdueCount: number;
    confirmedCount: number;
    underReviewCount: number;
    hoursConfirmed: number;
    averageConfirmedPct: number;
  };
  /** Evidence waiting for a Learning Team decision (in the viewer's scope). */
  reviewQueue: { waiting: number; waitingOverDays: number; overDays: number };
  members: MemberProgress[];
  items: { item: LearningItem; assignedCount: number; completedCount: number; confirmedCount: number; overdueCount: number }[];
  outstanding: {
    personId: string;
    personName: string;
    itemId: string;
    title: string;
    dueDate: string | null;
    hours: number;
    isMandatory: boolean;
    overdue: boolean;
  }[];
  evidence: {
    completionId: string;
    personId: string;
    personName: string;
    itemId: string;
    title: string;
    hours: number;
    completedOn: string;
    fileName: string | null;
    reflection: string | null;
  }[];
  evidenceByMonth: { month: string; count: number }[];
}

export interface EvidenceRecord {
  completion: Completion;
  person: Person;
  item: LearningItem;
}

export interface EvidenceUrl {
  url: string;
  expiresAt: string;
  fileName: string;
  mimeType: string;
}

export interface ImportPreview<S> {
  rows: { rowNumber: number; values: Record<string, string>; errors: string[]; summary: S | null; action?: 'create' | 'update' | null }[];
  validCount: number;
  errorCount: number;
}

export interface ItemImportSummary {
  title: string;
  hours: number | null;
  dueDate: string | null;
  deliveryType: string;
  provider: string;
  assignTo: string;
}

export interface UserImportSummary {
  fullName: string;
  email: string;
  role: string;
  designation: string | null;
  lineManagerEmail: string | null;
}

export interface ReminderSettings {
  autoEnabled: boolean;
  leadDays: number[];
  overdueFrequency: OverdueFrequency;
  sendTime: string;
  timezone: string;
  ccLineManager: CcPolicy;
}

export interface ReminderCandidate {
  person: Person;
  outstandingCount: number;
  overdueCount: number;
}

export interface ReminderLogEntry {
  id: string;
  kind: 'automatic' | 'manual';
  sentAt: string;
  recipient: { id: string; fullName: string; email: string };
  outstandingCount: number;
  overdueCount: number;
  triggers: string[];
  hasNote: boolean;
  ccEmails: string[];
  sentBy: string | null;
  deliveryStatus: 'sent' | 'failed';
}

export interface SendResult {
  sent: number;
  failed: number;
  skipped: number;
}
