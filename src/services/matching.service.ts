import { IKulamCompatibility } from '@models/KulamCompatibility.model';
import { Gender } from '@models/Profile.model';
import { kulamCompatibilityRepository } from '@repositories/kulamCompatibility.repository';

/**
 * Multi-factor compatibility scoring, ported from the Figma reference's
 * MatchingService.tsx (Kulam 40% / Age 20% / Location 15% / Education 15% /
 * Height 10%). Two adaptations from the reference:
 *  - Kulam scoring reads the DB-backed KulamCompatibility matrix (our real
 *    12-Kulam list, seeded as a structural placeholder — see
 *    KulamCompatibility.model.ts) instead of the reference's hardcoded
 *    Sanskrit-gotra names, which do not apply to this app.
 *  - Height uses centimetres (this app's Profile.heightCm) with thresholds
 *    converted 1:1 from the reference's inch-based ones (1in = 2.54cm).
 *  - Education has no dedicated lookup collection yet (Profile.education is
 *    free text), so education scoring is a simplified text-similarity
 *    heuristic rather than the reference's fixed degree-level ladder.
 */

export interface MatchSubject {
  age: number;
  gender: Gender;
  kulam: string;
  district: string;
  state: string;
  currentCity?: string;
  education: string;
  heightCm: number;
}

export interface MatchPreference {
  ageMin?: number;
  ageMax?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  preferredDistricts?: string[];
  preferredEducation?: string[];
}

export interface MatchBreakdown {
  kulamScore: number;
  ageScore: number;
  locationScore: number;
  educationScore: number;
  heightScore: number;
}

export type CompatibilityTier = 'excellent' | 'very-good' | 'good' | 'average' | 'low';

export interface MatchScore {
  totalScore: number;
  breakdown: MatchBreakdown;
  reasons: string[];
  compatibility: CompatibilityTier;
}

export type KulamCompatibilityMatrix = Map<string, IKulamCompatibility>;

function calculateKulamScore(subjectKulam: string, targetKulam: string, matrix: KulamCompatibilityMatrix): number {
  const rules = matrix.get(subjectKulam.toLowerCase());
  if (!rules) {
    return 50; // Unknown kulam (e.g. "other") — neutral default, matches the reference's fallback.
  }

  const target = targetKulam.toLowerCase();
  if (rules.excellent.includes(target)) return 100;
  if (rules.good.includes(target)) return 75;
  if (rules.average.includes(target)) return 50;
  if (rules.avoid.includes(target)) return 25;
  return 50;
}

function calculateAgeScore(subject: MatchSubject, target: MatchSubject, preference?: MatchPreference): number {
  const ageDiff = Math.abs(subject.age - target.age);

  if (preference?.ageMin && target.age < preference.ageMin) {
    return Math.max(0, 100 - (preference.ageMin - target.age) * 10);
  }
  if (preference?.ageMax && target.age > preference.ageMax) {
    return Math.max(0, 100 - (target.age - preference.ageMax) * 10);
  }

  // Traditional preference: groom slightly older than bride.
  if (subject.gender === 'male' && target.gender === 'female') {
    if (ageDiff <= 3) return 100;
    if (ageDiff <= 5) return 90;
    if (ageDiff <= 7) return 75;
    if (ageDiff <= 10) return 60;
    return Math.max(0, 60 - (ageDiff - 10) * 5);
  }
  if (subject.gender === 'female' && target.gender === 'male') {
    if (target.age >= subject.age && ageDiff <= 5) return 100;
    if (target.age >= subject.age && ageDiff <= 8) return 85;
    if (ageDiff <= 3) return 90;
    if (ageDiff <= 5) return 75;
    return Math.max(0, 75 - ageDiff * 5);
  }

  if (ageDiff <= 2) return 100;
  if (ageDiff <= 5) return 80;
  if (ageDiff <= 10) return 60;
  return Math.max(0, 60 - (ageDiff - 10) * 4);
}

function calculateLocationScore(subject: MatchSubject, target: MatchSubject, preference?: MatchPreference): number {
  const subjectLocation = (subject.currentCity || subject.district).toLowerCase();
  const targetLocation = (target.currentCity || target.district).toLowerCase();

  if (subjectLocation === targetLocation) {
    return 100;
  }
  if (subject.state.toLowerCase() === target.state.toLowerCase()) {
    return 75;
  }

  const preferred = preference?.preferredDistricts ?? [];
  const matchesPreferred = preferred.some((district) => {
    const needle = district.toLowerCase();
    return targetLocation.includes(needle) || target.district.toLowerCase().includes(needle) || target.state.toLowerCase().includes(needle);
  });
  if (matchesPreferred) {
    return 70;
  }

  return 40;
}

function calculateEducationScore(subject: MatchSubject, target: MatchSubject, preference?: MatchPreference): number {
  const subjectEducation = subject.education.trim().toLowerCase();
  const targetEducation = target.education.trim().toLowerCase();

  if (subjectEducation === targetEducation) {
    return 100;
  }

  const preferred = preference?.preferredEducation ?? [];
  if (preferred.some((p) => targetEducation.includes(p.toLowerCase()) || p.toLowerCase().includes(targetEducation))) {
    return 85;
  }
  if (subjectEducation.includes(targetEducation) || targetEducation.includes(subjectEducation)) {
    return 80;
  }
  return 60;
}

function calculateHeightScore(subject: MatchSubject, target: MatchSubject, preference?: MatchPreference): number {
  if (preference?.heightMinCm || preference?.heightMaxCm) {
    const min = preference.heightMinCm ?? 0;
    const max = preference.heightMaxCm ?? 300;
    if (target.heightCm < min || target.heightCm > max) {
      const deviationCm = Math.min(Math.abs(target.heightCm - min), Math.abs(target.heightCm - max));
      return Math.max(0, 100 - deviationCm * 4);
    }
  }

  // Traditional preference: groom taller than bride.
  if (subject.gender === 'male' && target.gender === 'female') {
    const diff = subject.heightCm - target.heightCm;
    if (diff >= 5) return 100;
    if (diff >= 0) return 90;
    if (diff >= -5) return 75;
    return Math.max(40, 75 - Math.abs(diff + 5) * 4);
  }
  if (subject.gender === 'female' && target.gender === 'male') {
    const diff = target.heightCm - subject.heightCm;
    if (diff >= 5) return 100;
    if (diff >= 0) return 90;
    if (diff >= -5) return 80;
    return Math.max(40, 80 - Math.abs(diff + 5) * 4);
  }

  const diff = Math.abs(subject.heightCm - target.heightCm);
  if (diff <= 5) return 100;
  if (diff <= 10) return 85;
  if (diff <= 15) return 70;
  return Math.max(40, 70 - (diff - 15) * 2);
}

function tierFromScore(totalScore: number): CompatibilityTier {
  if (totalScore >= 85) return 'excellent';
  if (totalScore >= 70) return 'very-good';
  if (totalScore >= 55) return 'good';
  if (totalScore >= 40) return 'average';
  return 'low';
}

function buildReasons(breakdown: MatchBreakdown, locationSameCity: boolean, locationSameState: boolean): string[] {
  const reasons: string[] = [];

  if (breakdown.kulamScore >= 90) {
    reasons.push('Excellent Kulam compatibility — traditional heritage match');
  } else if (breakdown.kulamScore >= 70) {
    reasons.push('Good Kulam compatibility');
  } else if (breakdown.kulamScore <= 30) {
    reasons.push('Kulam compatibility may need consideration');
  }

  if (breakdown.ageScore >= 90) {
    reasons.push('Great age match');
  } else if (breakdown.ageScore >= 70) {
    reasons.push('Age within a compatible range');
  }

  if (locationSameCity) {
    reasons.push('Same city — easy to meet');
  } else if (locationSameState) {
    reasons.push('Same state — relatively close');
  }

  if (breakdown.educationScore >= 90) {
    reasons.push('Similar educational background');
  }

  if (breakdown.heightScore >= 90) {
    reasons.push('Height preferences aligned');
  }

  return reasons;
}

export const matchingService = {
  /** Loads the full compatibility matrix once — pass the result into `score()`/`rank()` for a batch of comparisons. */
  async loadMatrix(): Promise<KulamCompatibilityMatrix> {
    const rows = await kulamCompatibilityRepository.findAll();
    return new Map(rows.map((row) => [row.kulam, row]));
  },

  score(subject: MatchSubject, target: MatchSubject, matrix: KulamCompatibilityMatrix, preference?: MatchPreference): MatchScore {
    const breakdown: MatchBreakdown = {
      kulamScore: calculateKulamScore(subject.kulam, target.kulam, matrix),
      ageScore: calculateAgeScore(subject, target, preference),
      locationScore: calculateLocationScore(subject, target, preference),
      educationScore: calculateEducationScore(subject, target, preference),
      heightScore: calculateHeightScore(subject, target, preference),
    };

    const totalScore = Math.round(
      breakdown.kulamScore * 0.4 +
        breakdown.ageScore * 0.2 +
        breakdown.locationScore * 0.15 +
        breakdown.educationScore * 0.15 +
        breakdown.heightScore * 0.1,
    );

    const subjectLocation = (subject.currentCity || subject.district).toLowerCase();
    const targetLocation = (target.currentCity || target.district).toLowerCase();

    return {
      totalScore,
      breakdown,
      reasons: buildReasons(breakdown, subjectLocation === targetLocation, subject.state.toLowerCase() === target.state.toLowerCase()),
      compatibility: tierFromScore(totalScore),
    };
  },
};
