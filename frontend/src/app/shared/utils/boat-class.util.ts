const BOAT_CLASS_LABELS: Record<string, string> = {
  SINGLE_SCULL: '1X',
  DOUBLE_SCULL: '2X',
  COXED_PAIR: '2+',
  PAIR: '2-',
  QUAD: '4X',
  COXED_QUAD: '4X+',
  COXED_FOUR: '4+',
  FOUR: '4-',
  EIGHT: '8+',
  ERGO: 'ERGO',
};

const BOAT_CLASS_CREW_SIZE: Record<string, number> = {
  SINGLE_SCULL: 1,
  DOUBLE_SCULL: 2,
  COXED_PAIR: 2,
  PAIR: 2,
  QUAD: 4,
  COXED_QUAD: 4,
  COXED_FOUR: 4,
  FOUR: 4,
  EIGHT: 8,
  ERGO: 1,
};

const BOAT_CLASS_HAS_COXSWAIN: Record<string, boolean> = {
  SINGLE_SCULL: false,
  DOUBLE_SCULL: false,
  COXED_PAIR: true,
  PAIR: false,
  QUAD: false,
  COXED_QUAD: true,
  COXED_FOUR: true,
  FOUR: false,
  EIGHT: true,
  ERGO: false,
};

export function getBoatClassLabel(boatClass: string | undefined): string {
  if (!boatClass) return '-';
  return BOAT_CLASS_LABELS[boatClass] ?? boatClass;
}

export function getBoatClassCrewSize(boatClass: string | undefined): string {
  if (!boatClass) return '-';
  return boatClass in BOAT_CLASS_CREW_SIZE ? String(BOAT_CLASS_CREW_SIZE[boatClass]) : '-';
}

export function getBoatClassHasCoxswain(boatClass: string | undefined): string {
  if (!boatClass) return '-';
  return boatClass in BOAT_CLASS_HAS_COXSWAIN ? (BOAT_CLASS_HAS_COXSWAIN[boatClass] ? 'Да' : 'Не') : '-';
}
