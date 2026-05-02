import { ProgressionGenerationStatus } from './progressionGenerationStatus';

export interface DisciplineStandingResult {
    disciplineId?: string;
    disciplineName?: string;
    status?: ProgressionGenerationStatus;
    reason?: string;
}
