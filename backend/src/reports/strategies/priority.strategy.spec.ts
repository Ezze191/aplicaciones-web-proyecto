import { PriorityStrategyResolver } from './priority.strategy';

describe('PriorityStrategyResolver', () => {
  it('marks report as critico when elapsed hours exceed SLA', () => {
    const createdAt = new Date(Date.now() - 28 * 3600000);
    const res = PriorityStrategyResolver.evaluate({
      departmentCode: 'SIM',
      defaultSlaHours: 24,
      riskLevel: 'MEDIO',
      categoryWeight: 4,
      upvotesCount: 10,
      status: 'REGISTRADO',
      createdAt,
    });

    expect(res.slaStatus).toBe('critico');
    expect(res.remainingHours).toBeLessThan(0);
    expect(res.priorityScore).toBeGreaterThan(50);
  });

  it('marks report as en_riesgo when <= 4 hours remain', () => {
    const createdAt = new Date(Date.now() - 21 * 3600000);
    const res = PriorityStrategyResolver.evaluate({
      departmentCode: 'SIM',
      defaultSlaHours: 24,
      riskLevel: 'MEDIO',
      categoryWeight: 3,
      upvotesCount: 2,
      status: 'ASIGNADO',
      createdAt,
    });

    expect(res.slaStatus).toBe('en_riesgo');
  });

  it('marks resolved report as a_tiempo even if created earlier', () => {
    const createdAt = new Date(Date.now() - 10 * 3600000);
    const resolvedAt = new Date(Date.now() - 2 * 3600000);
    const res = PriorityStrategyResolver.evaluate({
      departmentCode: 'OBP',
      defaultSlaHours: 48,
      riskLevel: 'ALTO',
      categoryWeight: 3,
      upvotesCount: 5,
      status: 'RESUELTO',
      createdAt,
      resolvedAt,
    });

    expect(res.slaStatus).toBe('a_tiempo');
    expect(res.elapsedHours).toBeCloseTo(8, 0);
  });
});
