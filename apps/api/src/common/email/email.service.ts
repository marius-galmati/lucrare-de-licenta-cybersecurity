import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { baseTemplate } from './templates/base.template';
import {
  resetPasswordTemplate,
  resetPasswordText,
} from './templates/reset-password.template';
import { welcomeTemplate, welcomeText } from './templates/welcome.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER', 'noreply@cyberxscore.com');
    this.fromAddress = `"CyberXscore" <${user}>`;

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('SMTP_PORT', 465),
        secure: config.get<string>('SMTP_SECURE', 'true') === 'true',
        auth: {
          user,
          pass: config.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log(`SMTP configured: ${host}:${config.get('SMTP_PORT')}`);
    } else {
      this.logger.warn('SMTP not configured — emails will be logged only');
    }
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const html = baseTemplate(
      resetPasswordTemplate(resetUrl, 60),
      'Reset your CyberXscore password — link expires in 60 minutes',
    );
    const text = resetPasswordText(resetUrl);

    await this.send({
      to,
      subject: 'Reset your CyberXscore password',
      html,
      text,
    });
  }

  async sendWelcome(to: string, companyName: string): Promise<void> {
    const html = baseTemplate(
      welcomeTemplate(companyName),
      `Welcome to CyberXscore — start your security assessment`,
    );
    const text = welcomeText(companyName);

    await this.send({
      to,
      subject: `Welcome to CyberXscore, ${companyName}`,
      html,
      text,
    });
  }

  private async send(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`=== EMAIL (SMTP not configured) ===`);
      this.logger.warn(`  To: ${options.to}`);
      this.logger.warn(`  Subject: ${options.subject}`);
      this.logger.warn(`===================================`);
      return;
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      ...options,
    });

    this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
  }
}
