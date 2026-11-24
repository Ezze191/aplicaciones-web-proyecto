import { EmailPayload } from './resend.service';

export type NotificationEventType =
  | 'REPORT_CREATED'
  | 'REPORT_ASSIGNED'
  | 'REPORT_IN_PROCESS'
  | 'REPORT_RESOLVED'
  | 'REPORT_REJECTED'
  | 'PASSWORD_RESET';

export interface NotificationTemplateInput {
  eventType: NotificationEventType;
  recipientEmail: string;
  recipientName?: string;
  folio?: string;
  categoryName?: string;
  departmentName?: string;
  address?: string;
  slaHours?: number;
  crewName?: string;
  notes?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  resetCode?: string;
  frontendUrl: string;
}

/**
 * Patrón Creacional Factory Method para la generación uniforme de notificaciones
 * por correo transaccional (Resend) y avisos internos de la plataforma.
 */
export class NotificationFactory {
  static buildEmail(input: NotificationTemplateInput): EmailPayload {
    const greeting = input.recipientName
      ? `Hola, <strong>${this.escapeHtml(input.recipientName)}</strong>:`
      : 'Estimado(a) ciudadano(a):';
    const trackingUrl = input.folio
      ? `${input.frontendUrl}/mis-reportes/${encodeURIComponent(input.folio)}`
      : input.frontendUrl;

    switch (input.eventType) {
      case 'REPORT_CREATED':
        return {
          to: input.recipientEmail,
          subject: `[S.I.U Torreón] Reporte recibido · Folio ${input.folio}`,
          html: this.wrapLayout(
            'Reporte registrado en Torreón Alerta',
            `<p>${greeting}</p>
             <p>Tu reporte ciudadano ha sido recibido y geo-validado correctamente.</p>
             ${this.infoBox([
               `<strong>Folio oficial:</strong> ${this.escapeHtml(input.folio ?? '')}`,
               `<strong>Categoría:</strong> ${this.escapeHtml(input.categoryName ?? '')}`,
               `<strong>Dependencia:</strong> ${this.escapeHtml(input.departmentName ?? '')}`,
               `<strong>Ubicación:</strong> ${this.escapeHtml(input.address ?? '')}`,
               `<strong>Plazo SLA de atención:</strong> ${input.slaHours ?? 24} horas`,
             ])}
             <p><a href="${trackingUrl}" style="${this.btnStyle()}">Ver trazabilidad en tiempo real</a></p>`,
          ),
        };

      case 'REPORT_ASSIGNED':
        return {
          to: input.recipientEmail,
          subject: `[S.I.U Torreón] Cuadrilla asignada · Folio ${input.folio}`,
          html: this.wrapLayout(
            'Tu reporte fue asignado a una cuadrilla',
            `<p>${greeting}</p>
             <p>Tu reporte <strong>${this.escapeHtml(input.folio ?? '')}</strong> ha sido validado y asignado para su atención en campo.</p>
             ${this.infoBox([
               `<strong>Dependencia:</strong> ${this.escapeHtml(input.departmentName ?? '')}`,
               `<strong>Cuadrilla asignada:</strong> ${this.escapeHtml(input.crewName ?? 'Cuadrilla en turno')}`,
               `<strong>Ubicación:</strong> ${this.escapeHtml(input.address ?? '')}`,
               ...(input.notes
                 ? [`<strong>Instrucciones:</strong> ${this.escapeHtml(input.notes)}`]
                 : []),
             ])}
             <p><a href="${trackingUrl}" style="${this.btnStyle()}">Consultar avance del folio</a></p>`,
          ),
        };

      case 'REPORT_IN_PROCESS':
        return {
          to: input.recipientEmail,
          subject: `[S.I.U Torreón] Cuadrilla trabajando en sitio · ${input.folio}`,
          html: this.wrapLayout(
            'Personal operativo en sitio',
            `<p>${greeting}</p>
             <p>La cuadrilla <strong>${this.escapeHtml(input.crewName ?? '')}</strong> inició los trabajos de reparación para tu folio <strong>${this.escapeHtml(input.folio ?? '')}</strong>.</p>
             <p><a href="${trackingUrl}" style="${this.btnStyle()}">Seguir reparación en vivo</a></p>`,
          ),
        };

      case 'REPORT_RESOLVED':
        return {
          to: input.recipientEmail,
          subject: `[S.I.U Torreón] Incidencia resuelta con evidencia · ${input.folio}`,
          html: this.wrapLayout(
            '¡Tu reporte ha sido resuelto!',
            `<p>${greeting}</p>
             <p>La cuadrilla operativa completó el cierre técnico auditado en el sitio para el folio <strong>${this.escapeHtml(input.folio ?? '')}</strong>.</p>
             ${this.infoBox([
               `<strong>Ubicación:</strong> ${this.escapeHtml(input.address ?? '')}`,
               `<strong>Cuadrilla:</strong> ${this.escapeHtml(input.crewName ?? '')}`,
               ...(input.notes
                 ? [`<strong>Observaciones de cierre:</strong> ${this.escapeHtml(input.notes)}`]
                 : []),
             ])}
             ${
               input.afterPhotoUrl
                 ? `<p style="font-size:13px;color:#5e7085;">Evidencia final capturada en sitio:</p><img src="${this.escapeHtml(input.afterPhotoUrl)}" alt="Evidencia después de reparación" style="max-width:100%;border-radius:10px;border:1px solid #dce4ed;" />`
                 : ''
             }
             <p style="margin-top:16px;"><a href="${trackingUrl}" style="${this.btnStyle()}">Ver comparativa Antes / Después</a></p>`,
          ),
        };

      case 'REPORT_REJECTED':
        return {
          to: input.recipientEmail,
          subject: `[S.I.U Torreón] Actualización sobre tu folio ${input.folio}`,
          html: this.wrapLayout(
            'Resolución administrativa del folio',
            `<p>${greeting}</p>
             <p>Tu reporte <strong>${this.escapeHtml(input.folio ?? '')}</strong> fue revisado por la dependencia correspondiente y marcado como <strong>Rechazado / No procedente</strong>.</p>
             ${this.infoBox([
               `<strong>Motivo formal:</strong> ${this.escapeHtml(input.notes ?? 'Fuera de competencia o datos insuficientes.')}`,
             ])}
             <p><a href="${trackingUrl}" style="${this.btnStyle()}">Ver detalle del folio</a></p>`,
          ),
        };

      case 'PASSWORD_RESET':
        return {
          to: input.recipientEmail,
          subject: '[S.I.U Torreón] Recuperación de contraseña',
          html: this.wrapLayout(
            'Código de recuperación de contraseña',
            `<p>${greeting}</p>
             <p>Recibimos una solicitud para restablecer tu contraseña en la plataforma <strong>S.I.U Torreón Alerta</strong>.</p>
             <div style="background:#edf5ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;text-align:center;margin:16px 0;">
               <span style="font-size:11px;text-transform:uppercase;color:#155ead;font-weight:bold;">Código de verificación</span>
               <div style="font-size:26px;font-weight:800;letter-spacing:4px;color:#0e315a;margin-top:6px;">${this.escapeHtml(input.resetCode ?? '')}</div>
             </div>
             <p style="font-size:12px;color:#5e7085;">Este código expira en 30 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>`,
          ),
        };
    }
  }

  private static wrapLayout(title: string, body: string): string {
    return `
      <div style="font-family:Inter,Arial,sans-serif;background:#f3f6fa;padding:24px;color:#172b43;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dce4ed;border-radius:16px;overflow:hidden;">
          <div style="background:#0e315a;color:#ffffff;padding:20px 24px;">
            <div style="font-size:11px;letter-spacing:1px;color:#afcef0;text-transform:uppercase;">S.I.U · Torreón Alerta</div>
            <h1 style="margin:6px 0 0;font-size:19px;">${this.escapeHtml(title)}</h1>
          </div>
          <div style="padding:24px;font-size:14px;line-height:1.6;">
            ${body}
          </div>
          <div style="background:#f8fafd;border-top:1px solid #dce4ed;padding:14px 24px;font-size:11px;color:#5e7085;">
            Plataforma Municipal de Reportes Urbanos · Torreón, Coahuila.
          </div>
        </div>
      </div>
    `;
  }

  private static infoBox(lines: string[]): string {
    return `<div style="background:#f3f6fa;border:1px solid #dce4ed;border-radius:12px;padding:14px 16px;margin:14px 0;font-size:13px;">${lines.map((l) => `<div style="margin-bottom:4px;">${l}</div>`).join('')}</div>`;
  }

  private static btnStyle(): string {
    return 'display:inline-block;background:#155ead;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;font-size:13px;';
  }

  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
