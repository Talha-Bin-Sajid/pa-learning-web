import type { Completion, EvidenceCheck, LearningItem, PlanEntry } from '@/types/api';

export function item(over: Partial<LearningItem> = {}): LearningItem {
  return {
    id: 'item-1',
    cycleId: 'cycle-1',
    title: 'Anti-Money Laundering Refresh',
    category: { id: 1, name: 'Mandatory Compliance' },
    cpdType: { id: 1, name: 'Mandatory Compliance' },
    deliveryType: { id: 1, name: 'eLearning' },
    provider: 'ICAEW',
    hours: 1.5,
    dueDate: '2026-03-31',
    isMandatory: true,
    evidenceMode: 'certificate',
    link: 'https://www.icaew.com',
    description: 'Annual AML refresher.',
    audience: { all: true, designations: [], people: [], label: 'All staff' },
    archived: false,
    ...over,
  };
}

export function entry(over: Partial<PlanEntry> = {}, itemOver: Partial<LearningItem> = {}): PlanEntry {
  return { item: item(itemOver), status: 'outstanding', daysOverdue: 0, daysUntilDue: 20, completion: null, rejected: null, confirmed: false, ...over };
}

export function completion(over: Partial<Completion> = {}): Completion {
  return {
    id: 'c1',
    completedOn: '2026-02-11',
    reflection: null,
    evidence: { fileName: 'cert.pdf', mimeType: 'application/pdf', sizeBytes: 100 },
    reviewStatus: 'not_reviewed',
    reviewSource: null,
    reviewNotes: null,
    reviewedAt: null,
    submittedAt: '',
    check: null,
    ...over,
  };
}

export const CHECK: EvidenceCheck = {
  status: 'done',
  decision: 'verified',
  reasons: [],
  confidence: 0.92,
  documentType: 'Course completion certificate',
  summary: 'ICAEW certificate for Sarah Whitfield.',
  extracted: {
    participantName: 'Sarah Whitfield',
    courseTitle: 'AML Update',
    provider: 'ICAEW',
    completionDate: '2026-02-10',
    hours: 1.5,
    certificateId: null,
  },
  checks: { name: 'match', title: 'match', provider: 'match' },
  tamperingSigns: [],
  model: 'gemini',
  finishedAt: '2026-02-11T10:00:00Z',
};
