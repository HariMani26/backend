import { IKulamCompatibility } from '@models/KulamCompatibility.model';
import { KulamCompatibilityMatrix, MatchSubject, matchingService } from '@services/matching.service';

function buildMatrix(rows: Array<Partial<IKulamCompatibility> & { kulam: string }>): KulamCompatibilityMatrix {
  return new Map(
    rows.map((row) => [
      row.kulam,
      { excellent: [], good: [], average: [], avoid: [], ...row, kulam: row.kulam } as IKulamCompatibility,
    ]),
  );
}

function subject(overrides: Partial<MatchSubject> = {}): MatchSubject {
  return {
    age: 28,
    gender: 'male',
    kulam: 'dheppalu',
    district: 'Chennai',
    state: 'Tamil Nadu',
    education: "Bachelor's Degree",
    heightCm: 175,
    ...overrides,
  };
}

describe('matchingService.score', () => {
  it('scores an excellent-kulam, same-city, same-education pair near the top tier', () => {
    const matrix = buildMatrix([{ kulam: 'dheppalu', excellent: ['orsulu'] }]);
    const groom = subject();
    const bride = subject({ gender: 'female', age: 25, kulam: 'orsulu', heightCm: 165 });

    const result = matchingService.score(groom, bride, matrix);

    expect(result.breakdown.kulamScore).toBe(100);
    expect(result.breakdown.locationScore).toBe(100);
    expect(result.totalScore).toBeGreaterThanOrEqual(85);
    expect(result.compatibility).toBe('excellent');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('scores an avoid-bucket kulam pairing lower than an excellent one, all else equal', () => {
    const matrix = buildMatrix([{ kulam: 'dheppalu', excellent: ['orsulu'], avoid: ['aalukuttalu'] }]);
    const groom = subject();
    const goodBride = subject({ gender: 'female', age: 25, kulam: 'orsulu', heightCm: 165 });
    const avoidBride = subject({ gender: 'female', age: 25, kulam: 'aalukuttalu', heightCm: 165 });

    const goodResult = matchingService.score(groom, goodBride, matrix);
    const avoidResult = matchingService.score(groom, avoidBride, matrix);

    expect(avoidResult.breakdown.kulamScore).toBe(25);
    expect(avoidResult.totalScore).toBeLessThan(goodResult.totalScore);
  });

  it('falls back to a neutral 50 kulam score for a kulam missing from the matrix', () => {
    const matrix = buildMatrix([]);
    const result = matchingService.score(subject(), subject({ gender: 'female', kulam: 'unknown-kulam' }), matrix);
    expect(result.breakdown.kulamScore).toBe(50);
  });

  it('penalizes a target outside the viewer-stated age range', () => {
    const matrix = buildMatrix([]);
    const groom = subject();
    const tooYoung = subject({ gender: 'female', age: 19 });

    const result = matchingService.score(groom, tooYoung, matrix, { ageMin: 24, ageMax: 30 });
    expect(result.breakdown.ageScore).toBeLessThan(100);
  });

  it('gives same-state (different-city) a lower location score than same-city', () => {
    const matrix = buildMatrix([]);
    const groom = subject({ district: 'Chennai' });
    const sameCity = subject({ gender: 'female', district: 'Chennai' });
    const sameState = subject({ gender: 'female', district: 'Madurai' });

    const sameCityScore = matchingService.score(groom, sameCity, matrix).breakdown.locationScore;
    const sameStateScore = matchingService.score(groom, sameState, matrix).breakdown.locationScore;

    expect(sameCityScore).toBe(100);
    expect(sameStateScore).toBe(75);
    expect(sameStateScore).toBeLessThan(sameCityScore);
  });
});
