import {
  estimateEtaMinutes,
  haversineDistanceMeters,
  isWithinTorreonJurisdiction,
} from './geo.util';

describe('geo.util', () => {
  it('validates coordinates within Torreon bounds', () => {
    expect(isWithinTorreonJurisdiction(25.5428, -103.4068)).toBe(true);
    expect(isWithinTorreonJurisdiction(19.4326, -99.1332)).toBe(false);
  });

  it('computes realistic distance and ETA between two Torreon points', () => {
    const meters = haversineDistanceMeters(25.5428, -103.4068, 25.5439, -103.4616);
    expect(meters).toBeGreaterThan(5000);
    expect(meters).toBeLessThan(7000);
    expect(estimateEtaMinutes(meters / 1000)).toBeGreaterThanOrEqual(10);
  });
});
