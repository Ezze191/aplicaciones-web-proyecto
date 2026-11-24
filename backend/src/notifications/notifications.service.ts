import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { NotificationEntity } from './entities/notification.entity';
import {
  NotificationEventType,
  NotificationFactory,
} from './notification.factory';
import { ResendService } from './resend.service';

export interface CreateNotificationInput {
  userId?: string | null;
  departmentId?: string | null;
  reportId?: string | null;
  title: string;
  message: string;
  type?: string;
}

export interface NotificationItemView {
  id: string;
  userId: string | null;
  departmentId: string | null;
  reportId: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationQueryRow {
  id: string;
  user_id: string | null;
  department_id: string | null;
  report_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: Date;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepo: Repository<NotificationEntity>,
    private readonly resendService: ResendService,
  ) {}

  async createInApp(
    input: CreateNotificationInput,
  ): Promise<NotificationEntity> {
    const entity = this.notificationsRepo.create({
      userId: input.userId ?? null,
      departmentId: input.departmentId ?? null,
      reportId: input.reportId ?? null,
      title: input.title,
      message: input.message,
      type: input.type ?? 'INFO',
      isRead: false,
    });
    return this.notificationsRepo.save(entity);
  }

  async sendEventEmail(
    eventType: NotificationEventType,
    data: {
      recipientEmail?: string | null;
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
    },
  ): Promise<void> {
    if (!data.recipientEmail) return;
    const emailPayload = NotificationFactory.buildEmail({
      eventType,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      folio: data.folio,
      categoryName: data.categoryName,
      departmentName: data.departmentName,
      address: data.address,
      slaHours: data.slaHours,
      crewName: data.crewName,
      notes: data.notes,
      beforePhotoUrl: data.beforePhotoUrl,
      afterPhotoUrl: data.afterPhotoUrl,
      resetCode: data.resetCode,
      frontendUrl: this.resendService.getFrontendUrl(),
    });
    await this.resendService.sendEmail(emailPayload);
  }

  private buildScopeClause(user: AuthenticatedUser): {
    clause: string;
    params: unknown[];
  } {
    if (user.role === 'ROLE_ADMIN') {
      return {
        clause: '(n.user_id = $1 OR n.department_id IS NOT NULL)',
        params: [user.id],
      };
    }
    if (user.role === 'ROLE_SUPERVISOR' && user.departmentId) {
      return {
        clause: '(n.user_id = $1 OR n.department_id = $2)',
        params: [user.id, user.departmentId],
      };
    }
    // ROLE_CREW y ROLE_CITIZEN reciben sus notificaciones personales de seguimiento
    return {
      clause: 'n.user_id = $1',
      params: [user.id],
    };
  }

  async listForUser(user: AuthenticatedUser): Promise<{
    items: NotificationItemView[];
    unreadCount: number;
  }> {
    const { clause, params } = this.buildScopeClause(user);

    const rows = await this.dataSource.query<NotificationQueryRow[]>(
      `
      SELECT
        n.id,
        n.user_id,
        n.department_id,
        n.report_id,
        n.title,
        n.message,
        n.type,
        (nr.read_at IS NOT NULL) AS is_read,
        n.created_at
      FROM notifications n
      LEFT JOIN notification_reads nr
        ON nr.notification_id = n.id
       AND nr.user_id = $1
      WHERE ${clause}
        AND nr.dismissed_at IS NULL
      ORDER BY n.created_at DESC
      LIMIT 40
      `,
      params,
    );

    const items: NotificationItemView[] = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      departmentId: r.department_id,
      reportId: r.report_id,
      title: r.title,
      message: r.message,
      type: r.type,
      isRead: Boolean(r.is_read),
      createdAt: r.created_at,
    }));

    const unreadCount = items.filter((i) => !i.isRead).length;
    return { items, unreadCount };
  }

  async markAsRead(id: string, user: AuthenticatedUser): Promise<{ ok: true }> {
    await this.dataSource.query(
      `
      INSERT INTO notification_reads (notification_id, user_id, read_at)
      SELECT n.id, $2::uuid, CURRENT_TIMESTAMP
      FROM notifications n
      WHERE n.id = $1::uuid
      ON CONFLICT (notification_id, user_id)
      DO UPDATE SET read_at = COALESCE(notification_reads.read_at, CURRENT_TIMESTAMP)
      `,
      [id, user.id],
    );
    return { ok: true };
  }

  async markAllAsRead(user: AuthenticatedUser): Promise<{ ok: true }> {
    const { clause, params } = this.buildScopeClause(user);
    await this.dataSource.query(
      `
      INSERT INTO notification_reads (notification_id, user_id, read_at)
      SELECT n.id, $1::uuid, CURRENT_TIMESTAMP
      FROM notifications n
      WHERE ${clause}
      ON CONFLICT (notification_id, user_id)
      DO UPDATE SET read_at = COALESCE(notification_reads.read_at, CURRENT_TIMESTAMP)
      `,
      params,
    );
    return { ok: true };
  }

  async dismissOne(id: string, user: AuthenticatedUser): Promise<{ ok: true }> {
    await this.dataSource.query(
      `
      INSERT INTO notification_reads (notification_id, user_id, read_at, dismissed_at)
      SELECT n.id, $2::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM notifications n
      WHERE n.id = $1::uuid
      ON CONFLICT (notification_id, user_id)
      DO UPDATE SET
        read_at = COALESCE(notification_reads.read_at, CURRENT_TIMESTAMP),
        dismissed_at = CURRENT_TIMESTAMP
      `,
      [id, user.id],
    );
    return { ok: true };
  }

  async clearAll(user: AuthenticatedUser): Promise<{ ok: true }> {
    const { clause, params } = this.buildScopeClause(user);
    await this.dataSource.query(
      `
      INSERT INTO notification_reads (notification_id, user_id, read_at, dismissed_at)
      SELECT n.id, $1::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM notifications n
      WHERE ${clause}
      ON CONFLICT (notification_id, user_id)
      DO UPDATE SET
        read_at = COALESCE(notification_reads.read_at, CURRENT_TIMESTAMP),
        dismissed_at = CURRENT_TIMESTAMP
      `,
      params,
    );
    return { ok: true };
  }
}
