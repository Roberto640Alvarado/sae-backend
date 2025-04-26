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
    ) {
      if (!authHeader) {
        throw new HttpException(
          'Token de autorización es requerido.',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      const token = authHeader.replace('Bearer ', '');
  
      try {
        const result = await this.userService.handleFirstLoginOrUpdate(token);
  
        return {
            statusCode: HttpStatus.OK,
            message: result.message,
            user: {
              email: result.email,
              name: result.name,
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

  //Traer info de un usuario por su correo
  @Get('teacher/:email')
  async getUserByEmail(@Param('email') email: string) {
    if (!email) {
      throw new HttpException('El correo es requerido.', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new HttpException('Usuario no encontrado.', HttpStatus.NOT_FOUND);
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Usuario encontrado exitosamente.',
      user,
    };
  }

  //Traer el email de un usuario por su githubUsername
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
  