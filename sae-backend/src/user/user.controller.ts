import {
    Controller,
    Post,
    Headers,
    Query,
    HttpStatus,
    HttpException,
  } from '@nestjs/common';
  import { UserService } from './user.service';
  
  @Controller('user')
  export class UserController {
    constructor(private readonly userService: UserService) {}
  
    //Endpoint para el primer login (o actualización)
    @Post('first-login')
    async handleFirstLogin(
      @Headers('authorization') authHeader: string,
      @Query('username') username: string,
    ) {
      if (!authHeader || !username) {
        throw new HttpException(
          'Token de autorización y username son requeridos.',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      const token = authHeader.replace('Bearer ', '');
  
      try {
        const result = await this.userService.handleFirstLoginOrUpdate(token, username);
  
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
            user: {
              email: result.email,
              githubUsername: result.githubUsername,
              isRoot: result.isRoot,
              organizations: result.organizations,
            },
          };
      } catch (error) {
        throw new HttpException(
          error.message || 'Error procesando el login del usuario.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
  