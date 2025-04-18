import {
    Controller,
    Post,
    Get,
    Query,
    Body,
    Param,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Teacher, TeacherDocument } from './entities/teacher.entity';

@Controller('teachers')
export class TeacherController {
  constructor(
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
  ) {}

  //Traer todos los profesores
  @Get('all')
  async getAllTeachers() {
    const teachers = await this.teacherModel.find();

    if (!teachers.length) {
      throw new HttpException(
        'No hay catedráticos registrados.',
        HttpStatus.NOT_FOUND,
      );
    }

    return { total: teachers.length, teachers };
  }

  //Traer info de un profesor por su correo
  @Get('teachers/by-email')
  async getTeacherByEmail(@Query('email') email: string) {
    if (!email) {
      throw new HttpException(
        'El parámetro "email" es requerido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const teacher = await this.teacherModel.findOne({ email });

    if (!teacher) {
      throw new HttpException(
        'Catedrático no encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }

    return teacher;
  }
}
