import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepo: Repository<NotificationEntity>,
    private readonly resendService: ResendService,
  ) {}

  async createInApp(input: CreateNotificationInput): Promise<NotificationEntity> {
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

  async listForUser(user: AuthenticatedUser): Promise<{
    items: NotificationEntity[];
    unreadCount: number;
  }> {
    const qb = this.notificationsRepo
      .createQueryBuilder('n')
      .orderBy('n.createdAt', 'DESC')
      .take(30);

    if (user.role === 'ROLE_ADMIN') {
      qb.where('n.userId = :userId OR n.departmentId IS NOT NULL', {
        userId: user.id,
      });
    } else if (
      (user.role === 'ROLE_SUPERVISOR' || user.role === 'ROLE_CREW') &&
      user.departmentId
    ) {
      qb.where('n.userId = :userId OR n.departmentId = :deptId', {
        userId: user.id,
        deptId: user.departmentId,
      });
    } else {
      qb.where('n.userId = :userId', { userId: user.id });
    }

    const items = await qb.getMany();
    const unreadCount = items.filter((i) => !i.isRead).length;
    return { items, unreadCount };
  }

  async markAsRead(id: string, user: AuthenticatedUser): Promise<{ ok: true }> {
    const notif = await this.notificationsRepo.findOne({ where: { id } });
    if (
      notif &&
      (notif.userId === user.id ||
        user.role === 'ROLE_ADMIN' ||
        (notif.departmentId && notif.departmentId === user.departmentId))
    ) {
      notif.isRead = true;
      await this.notificationsRepo.save(notif);
    }
    return { ok: true };
  }

  async markAllAsRead(user: AuthenticatedUser): Promise<{ ok: true }> {
    const qb = this.notificationsRepo
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ isRead: true })
      .where('is_read = false');

    if (user.role === 'ROLE_CITIZEN') {
      qb.andWhere('user_id = :userId', { userId: user.id });
    } else if (user.departmentId && user.role !== 'ROLE_ADMIN') {
      qb.andWhere('(user_id = :userId OR department_id = :deptId)', {
        userId: user.id,
        deptId: user.departmentId,
      });
    }

    await qb.execute();
    return { ok: true };
  }
}
