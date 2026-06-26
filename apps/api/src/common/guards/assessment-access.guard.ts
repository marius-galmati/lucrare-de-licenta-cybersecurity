import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SessionJwtPayload } from './session-jwt.guard';

/**
 * Acceptă FIE un JWT standard de utilizator, FIE un JWT de sesiune anonimă.
 * Populează request.user (autentificat) sau request.sessionPayload (anonim).
 */
@Injectable()
export class AssessmentAccessGuard implements CanActivate {
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

    // Încercăm mai întâi JWT-ul standard de utilizator
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      // Nu este un JWT de utilizator — încercăm JWT-ul de sesiune anonimă
    }

    try {
      const payload = this.jwtService.verify<SessionJwtPayload>(token, {
        secret: this.configService.get<string>('ANONYMOUS_JWT_SECRET'),
      });
      request.sessionPayload = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token.');
    }
  }
}
