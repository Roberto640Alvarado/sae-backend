import { Controller, Get, Param } from '@nestjs/common';
import { RepoService } from './repo.service';

@Controller('repo')
export class RepoController {
  constructor(private readonly repoService: RepoService) {}

  //Obtener todos los classrooms de la organización
  @Get('classrooms')
  getClassrooms() {
    return this.repoService.fetchClassrooms();
  }

  //Obtener todas las tareas de una classroom
  @Get('classrooms/:id/assignments')
  getAssignments(@Param('id') classroomId: string) {
    return this.repoService.fetchAssignments(classroomId);
  }

  //Obtener todos los repositorios de una tarea
  @Get('assignments/:id/repos')
  getAssignmentRepos(@Param('id') assignmentId: string) {
    return this.repoService.fetchAssignmentRepos(assignmentId);
  }

  //Obtener todas las calificaciones de una tarea
  @Get('assignments/:id/grades')
  getAssignmentGrades(@Param('id') assignmentId: string) {
    return this.repoService.fetchAssignmentGrades(assignmentId);
  }
}
