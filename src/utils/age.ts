/** Whole years between `dob` and now (or `asOf`, mainly for tests). */
export function calculateAge(dob: Date, asOf: Date = new Date()): number {
  let age = asOf.getFullYear() - dob.getFullYear();
  const monthDiff = asOf.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/** Date-of-birth range (inclusive) that corresponds to an inclusive [ageFrom, ageTo] age filter. */
export function dobRangeForAgeFilter(ageFrom?: number, ageTo?: number, asOf: Date = new Date()): { minDob?: Date; maxDob?: Date } {
  const range: { minDob?: Date; maxDob?: Date } = {};

  if (ageTo !== undefined) {
    // Oldest allowed (age <= ageTo) => born no earlier than (asOf - (ageTo + 1) years + 1 day).
    const minDob = new Date(asOf);
    minDob.setFullYear(minDob.getFullYear() - (ageTo + 1));
    minDob.setDate(minDob.getDate() + 1);
    range.minDob = minDob;
  }

  if (ageFrom !== undefined) {
    // Youngest allowed (age >= ageFrom) => born no later than (asOf - ageFrom years).
    const maxDob = new Date(asOf);
    maxDob.setFullYear(maxDob.getFullYear() - ageFrom);
    range.maxDob = maxDob;
  }

  return range;
}
