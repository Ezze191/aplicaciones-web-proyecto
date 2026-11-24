import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    this.fromEmail =
      this.configService
        .get<string>('RESEND_FROM_EMAIL')
        ?.trim() || 'Torreón Alerta <onboarding@resend.dev>';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL')?.trim() ||
      'http://localhost:3001';

    if (
      apiKey &&
      !apiKey.includes('placeholder') &&
      !apiKey.includes('demo') &&
      apiKey.startsWith('re_')
    ) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Servicio Resend API inicializado correctamente.');
    } else {
      this.resend = null;
      this.logger.warn(
        '⚠️ RESEND_API_KEY no configurada (modo simulación). Agrega tu API key en backend/.env para envíos reales.',
      );
    }
  }

  getFrontendUrl(): string {
    return this.frontendUrl;
  }

  isConfigured(): boolean {
    return Boolean(this.resend);
  }

  async sendEmail(payload: EmailPayload): Promise<{ sent: boolean; id?: string }> {
    if (!payload.to) {
      return { sent: false };
    }

    if (!this.resend) {
      this.logger.log(
        `[Resend Simulado] Para: ${payload.to} | Asunto: ${payload.subject}`,
      );
      return { sent: false };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });

      if (error) {
        this.logger.error(
          `Error enviando correo vía Resend a ${payload.to}: ${error.message}`,
        );
        return { sent: false };
      }

      this.logger.log(`Correo enviado vía Resend (${data?.id}) a ${payload.to}`);
      return { sent: true, id: data?.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.error(`Excepción Resend al enviar a ${payload.to}: ${message}`);
      return { sent: false };
    }
  }
}
