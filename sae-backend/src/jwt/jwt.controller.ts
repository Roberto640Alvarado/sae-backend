import { Controller, Get, Headers, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { JwtService } from './jwt.service';

@Controller('jwt')
export class JwtController {
  constructor(private readonly jwtService: JwtService) {}

  @Get('decode')
  decodeToken(
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
          throw new NotFoundException(
            'Token no proporcionado en el header Authorization.',
          );
        }
        const token = authHeader.replace('Bearer ', '');

    const decoded = this.jwtService.verifyToken(token);
    return {
      message: 'Token decodificado correctamente',
      data: decoded,
    };
  }
}
