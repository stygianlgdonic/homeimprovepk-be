import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async requestOtp(dto: RequestOtpDto): Promise<{ message: string }> {
    const isStub = this.config.get<boolean>('otp.stub');
    const expiryMinutes = this.config.get<number>('otp.expiryMinutes') || 10;
    const code = isStub ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { phone: dto.phone, code, expiresAt },
    });

    if (!isStub) {
      await this.sendSms(dto.phone, `Your ThekedaarPK code is: ${code}`);
    }

    return { message: isStub ? `OTP sent (stub: ${code})` : 'OTP sent' };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ accessToken: string; isNewUser: boolean }> {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone: dto.phone,
        code: dto.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException('Invalid or expired OTP');

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({ data: { phone: dto.phone } });
    }

    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = this.jwt.sign(payload);

    return { accessToken, isNewUser };
  }

  private async sendSms(to: string, message: string): Promise<void> {
    const accountSid = this.config.get<string>('twilio.accountSid');
    const authToken = this.config.get<string>('twilio.authToken');
    const from = this.config.get<string>('twilio.from');

    if (!accountSid || !authToken || !from) {
      console.warn('[SMS] Twilio not configured, skipping SMS');
      return;
    }

    try {
      const twilio = require('twilio')(accountSid, authToken);
      await twilio.messages.create({ body: message, from, to });
    } catch (err) {
      console.error('[SMS] Failed to send:', err);
    }
  }
}
