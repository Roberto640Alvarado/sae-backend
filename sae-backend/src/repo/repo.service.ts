import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class RepoService {
  private readonly logger = new Logger(RepoService.name);
  private readonly GITHUB_HEADERS: any;
  private readonly ORG_NAME: string;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('GITHUB_TOKEN');
    this.ORG_NAME = this.configService.get<string>('ORG_NAME')!;

    this.GITHUB_HEADERS = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  //Obtener todos los classrooms de la organización
  async fetchClassrooms(): Promise<any> {
    const url = 'https://api.github.com/classrooms';

    try {
      const response = await axios.get(url, {
        headers: this.GITHUB_HEADERS,
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        'Error obteniendo classrooms:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  //Obtener todas las tareas de una classroom
  async fetchAssignments(classroomId: string): Promise<any> {
    const url = `https://api.github.com/classrooms/${classroomId}/assignments`;

    try {
      const response = await axios.get(url, {
        headers: this.GITHUB_HEADERS,
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error obteniendo tareas del aula ${classroomId}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  //Obtener todos los repositorios de una tarea
  async fetchAssignmentRepos(assignmentId: string): Promise<any> {
    const url = `https://api.github.com/assignments/${assignmentId}/accepted_assignments`;

    try {
      const response = await axios.get(url, {
        headers: this.GITHUB_HEADERS,
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error obteniendo los repos de la tarea ${assignmentId}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  //Obtener todas las calificaciones de una tarea
  async fetchAssignmentGrades(assignmentId: string): Promise<any> {
    const url = `https://api.github.com/assignments/${assignmentId}/grades`;

    try {
      const response = await axios.get(url, {
        headers: this.GITHUB_HEADERS,
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error obteniendo calificaciones de la tarea ${assignmentId}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
