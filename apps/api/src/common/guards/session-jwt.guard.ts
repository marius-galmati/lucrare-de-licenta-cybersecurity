import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface SessionJwtPayload {
  sessionToken: string;
  assessmentId: string;
}

@Injectable()
export class SessionJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.slice(7);

    try {
      const payload = this.jwtService.verify<SessionJwtPayload>(token, {
        secret: this.configService.get<string>('ANONYMOUS_JWT_SECRET'),
      });

      // Atașăm informațiile de sesiune la request pentru utilizarea ulterioară
      request.sessionPayload = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid session token.');
    }
  }
}
