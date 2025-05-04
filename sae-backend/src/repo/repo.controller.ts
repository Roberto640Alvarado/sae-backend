import {
  Controller,
  Get,
  Param,
  HttpStatus,
  Res,
  Query,
  NotFoundException,
  Post,
  Body,
  Headers,
  HttpException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { RepoService } from './repo.service';
import { Response } from 'express';
import {
  Feedback,
  FeedbackDocument,
} from '../feedback/entities/feedback.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

interface WorkflowStep {
  name: string;
  status: string;
  conclusion: string;
  started_at: string;
  completed_at: string;
}

@Controller('repo')
export class RepoController {
  constructor(
    private readonly repoService: RepoService,

    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<FeedbackDocument>,
  ) {}

  //Obtener todos los classrooms de la organización
  @Get('classrooms')
  async getClassrooms(
    @Headers('authorization') authHeader: string,
    @Query('orgId') orgId: string,
  ) {
    if (!authHeader) {
      throw new NotFoundException(
        'Token no proporcionado en el header Authorization.',
      );
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const classrooms = await this.repoService.fetchClassrooms(token, orgId);

      if (!classrooms || !classrooms.length) {
        throw new NotFoundException(
          'No se encontraron classrooms en la organización.',
        );
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Classrooms obtenidos correctamente.',
        data: classrooms,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al obtener los classrooms.',
      );
    }
  }

  //Verificar si una classroom específica pertenece a una organización
  @Get('classrooms/validate')
  async validateClassroomInOrg(
    @Headers('authorization') authHeader: string,
    @Query('orgId') orgId: string,
    @Query('classroomId') classroomId: string,
  ) {
    if (!authHeader) {
      throw new NotFoundException(
        'Token no proporcionado en el header Authorization.',
      );
    }

    if (!orgId || !classroomId) {
      throw new BadRequestException(
        'Se requieren orgId y classroomId como parámetros.',
      );
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const classroom = await this.repoService.isClassroomInOrg(
        token,
        orgId,
        classroomId,
      );

      if (!classroom) {
        throw new NotFoundException(
          'La classroom no pertenece a la organización.',
        );
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'La classroom pertenece a la organización.',
        data: classroom,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al validar la classroom en la organización.',
      );
    }
  }

  //Obtener todas las tareas de una classroom
  @Get('classrooms/:id/assignments')
  async getAssignments(
    @Param('id') classroomId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
      throw new NotFoundException(
        'Token no proporcionado en el header Authorization.',
      );
    }

    if (!classroomId) {
      throw new NotFoundException('El ID de la classroom es requerido.');
    }
    const token = authHeader.replace('Bearer ', '');

    try {
      const assignments = await this.repoService.fetchAssignments(
        token,
        classroomId,
      );

      if (!assignments || !assignments.length) {
        throw new NotFoundException(
          `No se encontraron asignaciones para la classroom con ID ${classroomId}.`,
        );
      }

      return {
        statusCode: HttpStatus.OK,
        message: `Asignaciones de la classroom ${classroomId} obtenidas correctamente.`,
        data: assignments,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al obtener las asignaciones.',
      );
    }
  }

  //Obtener todos los repositorios de una tarea
  @Get('assignments/:id/accepted_assignments')
  async getAssignmentRepos(
    @Param('id') assignmentId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
      throw new NotFoundException(
        'Token no proporcionado en el header Authorization.',
      );
    }

    if (!assignmentId) {
      throw new NotFoundException('El ID de la tarea es requerido.');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const repos = await this.repoService.fetchAssignmentRepos(
        token,
        assignmentId,
      );

      if (!repos || !repos.length) {
        throw new NotFoundException(
          `No se encontraron repositorios para la tarea con ID ${assignmentId}.`,
        );
      }

      return {
        statusCode: HttpStatus.OK,
        message: `Repositorios de la tarea ${assignmentId} obtenidos correctamente.`,
        data: repos,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al obtener los repositorios de la tarea.',
      );
    }
  }

  //Obtener todas las calificaciones de una tarea
  @Get('assignments/:id/grades')
  async getAssignmentGrades(
    @Param('id') assignmentId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
      throw new NotFoundException(
        'Token no proporcionado en el header Authorization.',
      );
    }

    if (!assignmentId) {
      throw new NotFoundException('El ID de la tarea es requerido.');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const grades = await this.repoService.fetchAssignmentGrades(
        token,
        assignmentId,
      );

      if (!grades || !grades.length) {
        throw new NotFoundException(
          `No se encontraron calificaciones para la tarea con ID ${assignmentId}.`,
        );
      }

      return {
        statusCode: HttpStatus.OK,
        message: `Calificaciones de la tarea ${assignmentId} obtenidas correctamente.`,
        data: grades,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al obtener las calificaciones de la tarea.',
      );
    }
  }

  // Obtener detalles del último workflow run de un repositorio
  @Get(':repo/workflow/details')
  async getLatestWorkflowDetails(
    @Param('repo') repo: string,
    @Headers('authorization') authHeader: string,
    @Query('orgName') orgName: string,
  ) {
    if (!authHeader) {
      throw new NotFoundException(
        'Token no proporcionado en el header Authorization.',
      );
    }
    const token = authHeader.replace('Bearer ', '');
    try {
      const latestRun = await this.repoService.fetchLatestWorkflowRun(
        token,
        repo,
        orgName,
      );

      if (!latestRun) {
        throw new NotFoundException(
          'No se encontró ningún workflow run para este repositorio.',
        );
      }

      const jobs = await this.repoService.fetchWorkflowJobs(
        token,
        repo,
        latestRun.id,
        orgName,
      );

      if (!jobs.length) {
        throw new NotFoundException(
          'No se encontraron jobs en el workflow run.',
        );
      }

      const testResults = jobs[0].steps
        .filter(
          (step: WorkflowStep) =>
            step.name.toLowerCase().includes('compilación') ||
            step.name.toLowerCase().includes('prueba'),
        )
        .map((step: WorkflowStep) => ({
          test_name: step.name,
          status: step.status,
          conclusion: step.conclusion,
          started_at: step.started_at,
          completed_at: step.completed_at,
        }));

      return {
        statusCode: HttpStatus.OK,
        message: 'Último workflow run obtenido exitosamente.',
        data: {
          repo,
          workflow_name: latestRun.name,
          run_url: latestRun.html_url,
          status: latestRun.status,
          conclusion: latestRun.conclusion,
          created_at: latestRun.created_at,
          completed_at: latestRun.updated_at,
          testResults,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException({
        error: 'Error obteniendo la información del workflow',
        message: error.message,
        status: error.response?.status || 500,
        githubError: error.response?.data || null,
      });
    }
  }

  // Obtener el contenido de un repositorio
  @Get(':repo/files')
  async getRepoContent(
    @Param('repo') repo: string,
    @Query('orgName') orgName: string,
    @Query('ext') ext: string = '.cpp',
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
      throw new NotFoundException(
        'Token no proporcionado en el header Authorization.',
      );
    }
    const token = authHeader.replace('Bearer ', '');

    const content = await this.repoService.fetchRepoContent(
      token,
      repo,
      ext,
      orgName,
    );

    if (!content) {
      throw new NotFoundException(
        `No se encontró contenido válido para el repositorio "${repo}"`,
      );
    }

    return content;
  }

  //Agregar feedback a un PR
  @Post(':repo/pr/feedback')
  async addFeedbackToPR(
    @Param('repo') repo: string,
    @Body('feedback') feedback: string,
    @Res() res: Response,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
      throw new NotFoundException(
        'Token no proporcionado en el header Authorization.',
      );
    }
    const token = authHeader.replace('Bearer ', '');
    try {
      if (!feedback) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'El feedback es obligatorio.' });
      }

      const owner = process.env.ORG_NAME!;
      const response = await this.repoService.postFeedbackToPR(
        token,
        owner,
        repo,
        feedback,
      );

      await this.feedbackModel.findOneAndUpdate(
        { repo },
        { $set: { status: 'Enviado' } },
      );

      return res.json({
        message: 'Feedback agregado correctamente.',
        data: response,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Error agregando feedback al PR.',
        details: error.message,
      });
    }
  }
}
