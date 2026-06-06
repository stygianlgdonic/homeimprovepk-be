import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface NotificationJobData {
  notificationId: string;
  userId: string;
  type: string;
  payload: Record<string, any>;
}

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { userId, type, payload } = job.data;

    this.logger.log(`Processing notification for user ${userId}: type=${type}`);

    const smsApiKey = this.config.get<string>('SMS_API_KEY');
    const smsEnabled = !!smsApiKey;

    if (smsEnabled) {
      await this.dispatchSms(userId, type, payload);
    } else {
      this.logger.warn(`SMS not configured — skipping SMS for user ${userId}`);
    }
  }

  private async dispatchSms(
    userId: string,
    type: string,
    payload: Record<string, any>,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, preferredLang: true },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found — skipping SMS`);
      return;
    }

    const message = this.buildSmsMessage(type, payload, user.preferredLang ?? 'en');

    const smsApiKey = this.config.get<string>('SMS_API_KEY');
    const smsApiUrl = this.config.get<string>('SMS_API_URL') ?? 'https://api.sms.gateway/send';

    try {
      const response = await fetch(smsApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${smsApiKey}`,
        },
        body: JSON.stringify({
          to: user.phone,
          message,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`SMS dispatch failed for user ${userId}: ${error}`);
      } else {
        this.logger.log(`SMS sent to user ${userId} (${user.phone})`);
      }
    } catch (err) {
      this.logger.error(`SMS dispatch error for user ${userId}: ${err.message}`);
    }
  }

  private buildSmsMessage(
    type: string,
    payload: Record<string, any>,
    lang: string,
  ): string {
    const messages: Record<string, Record<string, string>> = {
      QUOTE_RECEIVED: {
        en: `You have received a new quote for your job "${payload.jobTitle}". Open the app to review it.`,
        ur: `آپ کو "${payload.jobTitle}" کے لیے ایک نئی قیمت موصول ہوئی ہے۔`,
      },
      QUOTE_ACCEPTED: {
        en: `Your quote has been accepted! Get ready to start work on "${payload.jobTitle}".`,
        ur: `آپ کی قیمت قبول کر لی گئی ہے! "${payload.jobTitle}" کے لیے تیار ہو جائیں۔`,
      },
      BOOKING_CREATED: {
        en: `A booking has been confirmed for "${payload.jobTitle}". Check the app for details.`,
        ur: `"${payload.jobTitle}" کے لیے بکنگ تصدیق ہو گئی ہے۔`,
      },
      BOOKING_COMPLETED: {
        en: `Your booking for "${payload.jobTitle}" has been marked as completed.`,
        ur: `"${payload.jobTitle}" کی بکنگ مکمل ہو گئی ہے۔`,
      },
      NEW_MESSAGE: {
        en: `You have a new message from ${payload.senderName}.`,
        ur: `${payload.senderName} کی طرف سے نیا پیغام ہے۔`,
      },
    };

    const typeMessages = messages[type];
    if (!typeMessages) {
      return `ThekedaarPK: You have a new notification.`;
    }

    return typeMessages[lang] ?? typeMessages['en'];
  }
}
