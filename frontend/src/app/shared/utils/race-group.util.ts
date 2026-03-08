/**
 * Utility function to calculate race group (състезателна група) based on age and gender
 * 
 * Race groups:
 * - M12/W12: Until December 31 of the year in which they turn 12
 * - M14/W14: Until December 31 of the year in which they turn 14
 * - M16/W16: Until December 31 of the year in which they turn 16
 * - M18/W18: Until December 31 of the year in which they turn 18
 * - M23/W23: Until December 31 of the year in which they turn 22
 * - M/W: No age restriction
 */

export interface RaceGroupInfo {
  code: string;
  label: string;
}

/**
 * Calculate race group based on date of birth and gender
 * @param dateOfBirth Date of birth in ISO format (YYYY-MM-DD)
 * @param gender 'male' or 'female'
 * @returns Race group code and label
 */
export function calculateRaceGroup(
  dateOfBirth: string | undefined,
  gender: string | undefined
): RaceGroupInfo {
  if (!dateOfBirth || !gender) {
    return { code: '', label: '-' };
  }

  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) {
    return { code: '', label: '-' };
  }

  const currentYear = new Date().getFullYear();
  const birthYear = birthDate.getFullYear();
  
  // Age at the end of the current year (December 31)
  const ageAtEndOfYear = currentYear - birthYear;
  
  const isMale = gender.toLowerCase() === 'male';
  const prefix = isMale ? 'M' : 'W';

  // Check age groups from youngest to oldest
  if (ageAtEndOfYear <= 12) {
    return { code: `${prefix}12`, label: `${prefix}12` };
  } else if (ageAtEndOfYear <= 14) {
    return { code: `${prefix}14`, label: `${prefix}14` };
  } else if (ageAtEndOfYear <= 16) {
    return { code: `${prefix}16`, label: `${prefix}16` };
  } else if (ageAtEndOfYear <= 18) {
    return { code: `${prefix}18`, label: `${prefix}18` };
  } else if (ageAtEndOfYear <= 22) {
    return { code: `${prefix}23`, label: `${prefix}23` };
  } else {
    // No age restriction
    return { code: prefix, label: prefix };
  }
}

/**
 * Get all possible race group options for filtering
 */
export function getRaceGroupOptions(): Array<{ value: string; label: string }> {
  return [
    { value: 'M12', label: 'M12' },
    { value: 'W12', label: 'W12' },
    { value: 'M14', label: 'M14' },
    { value: 'W14', label: 'W14' },
    { value: 'M16', label: 'M16' },
    { value: 'W16', label: 'W16' },
    { value: 'M18', label: 'M18' },
    { value: 'W18', label: 'W18' },
    { value: 'M23', label: 'M23' },
    { value: 'W23', label: 'W23' },
    { value: 'M', label: 'M' },
    { value: 'W', label: 'W' },
  ];
}

