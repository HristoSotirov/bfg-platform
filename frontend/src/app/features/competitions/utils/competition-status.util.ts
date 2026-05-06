export type ComputedCompetitionStatus = 'TEMPLATE' | 'PLANNED' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED';

export function computeCompetitionStatus(comp: {
  isTemplate?: boolean;
  entrySubmissionsOpenAt?: string | null;
  entrySubmissionsClosedAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): ComputedCompetitionStatus {
  if (comp.isTemplate) return 'TEMPLATE';
  const now = new Date();
  const endDate = comp.endDate ? new Date(comp.endDate + 'T23:59:59.999Z') : null;
  if (endDate && now > endDate) return 'COMPLETED';
  const startDate = comp.startDate ? new Date(comp.startDate + 'T00:00:00Z') : null;
  if (startDate && now >= startDate) return 'IN_PROGRESS';
  const closedAt = comp.entrySubmissionsClosedAt ? new Date(comp.entrySubmissionsClosedAt) : null;
  if (closedAt && now >= closedAt) return 'REGISTRATION_CLOSED';
  const openAt = comp.entrySubmissionsOpenAt ? new Date(comp.entrySubmissionsOpenAt) : null;
  if (openAt && now >= openAt) return 'REGISTRATION_OPEN';
  return 'PLANNED';
}

export const STATUS_LABELS: Record<ComputedCompetitionStatus, string> = {
  TEMPLATE: 'competitions.statusLabels.template',
  PLANNED: 'competitions.statusLabels.planned',
  REGISTRATION_OPEN: 'competitions.statusLabels.registrationOpen',
  REGISTRATION_CLOSED: 'competitions.statusLabels.registrationClosed',
  IN_PROGRESS: 'competitions.statusLabels.inProgress',
  COMPLETED: 'competitions.statusLabels.completed',
};

export const STATUS_CLASSES: Record<ComputedCompetitionStatus, string> = {
  TEMPLATE: 'text-purple-600',
  PLANNED: 'text-blue-600',
  REGISTRATION_OPEN: 'text-green-600',
  REGISTRATION_CLOSED: 'text-orange-600',
  IN_PROGRESS: 'text-bfg-blue font-semibold',
  COMPLETED: 'text-gray-600',
};
