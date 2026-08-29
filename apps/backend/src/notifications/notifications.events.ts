import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './notification.entity';

@Injectable()
export class NotificationsEvents {
  constructor(private notificationsService: NotificationsService) {}

  @OnEvent('enrollment.created')
  async handleEnrollmentCreated(payload: { userId: string; courseName: string }) {
    await this.notificationsService.onEnrollmentCreated(payload.userId, payload.courseName);
  }

  @OnEvent('credential.issued')
  async handleCredentialIssued(payload: { userId: string; courseName: string }) {
    await this.notificationsService.onCredentialIssued(payload.userId, payload.courseName);
  }

  @OnEvent('course.completed')
  @OnEvent('progress.completed')
  async handleProgressCompleted(payload: { userId: string; courseName: string }) {
    await this.notificationsService.onProgressCompleted(payload.userId, payload.courseName);
  }

  @OnEvent('waitlist.joined')
  async handleWaitlistJoined(payload: { userId: string; courseTitle: string; position: number }) {
    await this.notificationsService.create(
      payload.userId,
      NotificationType.WAITLIST_JOINED,
      `You joined the waitlist for "${payload.courseTitle}" at position #${payload.position}.`,
    );
  }

  @OnEvent('waitlist.enrolled')
  async handleWaitlistEnrolled(payload: { userId: string; courseTitle: string }) {
    await this.notificationsService.create(
      payload.userId,
      NotificationType.WAITLIST_ENROLLED,
      `A spot opened up! You've been enrolled in "${payload.courseTitle}" from the waitlist.`,
    );
  }
}
