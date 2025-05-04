import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';


@Injectable()
export class JwtService {
  private readonly secret = process.env.JWT_SECRET || 'mi_clave_secreta';

  generateToken(payload: Record<string, any>, expiresIn = '2h'): string {
    return jwt.sign(payload, this.secret, { expiresIn });
  }

  verifyToken(token: string): Record<string, any> {
    try {
      return jwt.verify(token, this.secret) as Record<string, any>;
    } catch (err) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
