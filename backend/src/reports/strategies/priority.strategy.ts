import { RiskLevel, ReportStatusEnum } from '../entities/incident-report.entity';

export type SlaSemaphore = 'a_tiempo' | 'en_riesgo' | 'critico';

export interface SlaEvaluation {
  elapsedHours: number;
  remainingHours: number;
  slaHours: number;
  slaStatus: SlaSemaphore;
  priorityScore: number;
}

export interface PriorityContext {
  departmentCode: string;
  defaultSlaHours: number;
  riskLevel: RiskLevel;
  categoryWeight: number;
  upvotesCount: number;
  status: ReportStatusEnum;
  createdAt: Date;
  resolvedAt?: Date | null;
}

/**
 * Patrón Comportamental Strategy para calcular semáforos SLA y puntuación
 * de urgencia operativa según dependencia y respaldo vecinal.
 */
export interface SlaStrategy {
  evaluate(ctx: PriorityContext): SlaEvaluation;
}

class BaseSlaStrategy implements SlaStrategy {
  constructor(private readonly riskMultiplier: number) {}

  evaluate(ctx: PriorityContext): SlaEvaluation {
    const endDate =
      ctx.status === 'RESUELTO' && ctx.resolvedAt
        ? new Date(ctx.resolvedAt)
        : new Date();
    const elapsedMs = Math.max(0, endDate.getTime() - new Date(ctx.createdAt).getTime());
    const elapsedHours = Math.round((elapsedMs / 3600000) * 10) / 10;
    const slaHours = ctx.defaultSlaHours || 24;
    const remainingHours = Math.round((slaHours - elapsedHours) * 10) / 10;

    let slaStatus: SlaSemaphore = 'a_tiempo';
    if (ctx.status !== 'RESUELTO' && ctx.status !== 'RECHAZADO') {
      if (remainingHours <= 0 || ctx.riskLevel === 'CRITICO') {
        slaStatus = 'critico';
      } else if (remainingHours <= 4 || ctx.riskLevel === 'ALTO') {
        slaStatus = 'en_riesgo';
      }
    }

    const riskPoints: Record<RiskLevel, number> = {
      BAJO: 10,
      MEDIO: 25,
      ALTO: 50,
      CRITICO: 85,
    };

    const priorityScore = Math.round(
      (riskPoints[ctx.riskLevel] ?? 25) * this.riskMultiplier +
        ctx.categoryWeight * 5 +
        Math.min(ctx.upvotesCount, 50) * 2 +
        Math.max(0, elapsedHours),
    );

    return {
      elapsedHours,
      remainingHours,
      slaHours,
      slaStatus,
      priorityScore,
    };
  }
}

export class PriorityStrategyResolver {
  private static readonly strategies: Record<string, SlaStrategy> = {
    SIM: new BaseSlaStrategy(1.2), // Agua y drenaje sanitario tiene mayor peso sanitario
    OLA: new BaseSlaStrategy(1.0),
    OBP: new BaseSlaStrategy(1.1),
  };

  static evaluate(ctx: PriorityContext): SlaEvaluation {
    const strategy =
      this.strategies[ctx.departmentCode.toUpperCase()] ??
      new BaseSlaStrategy(1.0);
    return strategy.evaluate(ctx);
  }
}
