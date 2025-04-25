import {
    Controller,
    Post,
    Get,
    Headers,
    Param,
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

    //Traer todos los profesores
  @Get('teachers')
  async getTeachersByOrgId(@Query('orgId') orgId: string) {
    if (!orgId) {
      throw new HttpException('El parámetro "orgId" es obligatorio.', HttpStatus.BAD_REQUEST);
    }

    const teachers = await this.userService.findTeachersByOrgId(orgId);

    return {
      statusCode: HttpStatus.OK,
      message: `Se encontraron ${teachers.length} profesores.`,
      data: teachers,
    };
  }

  @Get('students/:login/email')
  async getEmailByGithubUsername(@Param('login') login: string) {
    if (!login) {
      throw new HttpException('El githubUsername es requerido.', HttpStatus.BAD_REQUEST);
    }

    const email = await this.userService.getEmailByGithubUsername(login);

    if (!email) {
      throw new HttpException('Usuario no encontrado.', HttpStatus.NOT_FOUND);
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Usuario encontrado exitosamente.',
      email,
    };
  }
}
  