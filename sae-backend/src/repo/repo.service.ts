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

  //Función para obtener el último run de un workflow
  async fetchLatestWorkflowRun(repo: string) {
    const url = `https://api.github.com/repos/${this.ORG_NAME}/${repo}/actions/runs`;
    const response = await axios.get(url, { headers: this.GITHUB_HEADERS, });

    if (!response.data.workflow_runs.length) return null;
    return response.data.workflow_runs[0];
  }

  //Función para obtener los detalles de un workflow
  async fetchWorkflowJobs(repo: string, runId: number) {
    const url = `https://api.github.com/repos/${this.ORG_NAME}/${repo}/actions/runs/${runId}/jobs`;
    const response = await axios.get(url, { headers: this.GITHUB_HEADERS,});

    return response.data.jobs;
  }

  //Función para obtener el contenido de un repositorio
  async fetchRepoContent(repo: string, extension: string) {
    try {
      const repoContentsUrl = `https://api.github.com/repos/${this.ORG_NAME}/${repo}/contents/`;
      const contentsResponse = await axios.get(repoContentsUrl, { headers: this.GITHUB_HEADERS });

      const matchingFiles = contentsResponse.data.filter((file: { name: string }) =>
        file.name.endsWith(extension),
      );

      if (!matchingFiles.length) {
        throw new Error(`No se encontró ningún archivo con la extensión "${extension}" en el repositorio.`);
      }

      const codeUrl = matchingFiles[0].download_url;

      const readmeUrl = `https://api.github.com/repos/${this.ORG_NAME}/${repo}/contents/README.md`;
      const readmeResponse = await axios.get(readmeUrl, { headers: this.GITHUB_HEADERS });

      const codeResponse = await axios.get(codeUrl);

      return {
        readme: Buffer.from(readmeResponse.data.content, 'base64').toString(),
        code: codeResponse.data,
      };
    } catch (error) {
      this.logger.error(`Error obteniendo contenido del repositorio: ${error.message}`);
      return null;
    }
  }

  //Si existe rama feedback, la crea desde main
  private async ensureFeedbackBranchExists(owner: string, repo: string): Promise<void> {
    const feedbackBranch = 'feedback';
    const baseBranch = 'main';

    try {
      await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${feedbackBranch}`,
        { headers: this.GITHUB_HEADERS },
      );
      this.logger.log(`✅ La rama '${feedbackBranch}' ya existe.`);
    } catch (error) {
      if (error.response?.status === 404) {
        this.logger.log(`📌 La rama '${feedbackBranch}' no existe. Creándola desde '${baseBranch}'...`);

        const baseRef = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
          { headers: this.GITHUB_HEADERS },
        );
        const baseSha = baseRef.data.object.sha;

        await axios.post(
          `https://api.github.com/repos/${owner}/${repo}/git/refs`,
          {
            ref: `refs/heads/${feedbackBranch}`,
            sha: baseSha,
          },
          { headers: this.GITHUB_HEADERS },
        );

        this.logger.log(`✅ Rama '${feedbackBranch}' creada correctamente.`);
      } else {
        throw new Error(`❌ Error verificando la rama '${feedbackBranch}': ${error.message}`);
      }
    }
  }

  //Función para crear un Pull Request con el feedback
  async createPullRequest(owner: string, repo: string, feedback: string): Promise<number> {
    const feedbackBranch = 'feedback';
    const branchName = `auto-feedback-${Date.now()}`;

    await this.ensureFeedbackBranchExists(owner, repo);

    const baseRef = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${feedbackBranch}`,
      { headers: this.GITHUB_HEADERS },
    );
    const baseSha = baseRef.data.object.sha;

    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      },
      { headers: this.GITHUB_HEADERS },
    );

    this.logger.log(`✅ Rama '${branchName}' creada desde '${feedbackBranch}'.`);

    let fileSha: string | null = null;
    let existingContent = '';

    try {
      const fileData = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/feedback.md?ref=${feedbackBranch}`,
        { headers: this.GITHUB_HEADERS },
      );
      fileSha = fileData.data.sha;
      existingContent = Buffer.from(fileData.data.content, 'base64').toString('utf-8');
    } catch {
      this.logger.log('📌 No se encontró feedback.md. Se creará uno nuevo.');
    }

    const formattedFeedback = `### Feedback generado el ${new Date().toLocaleString()}\n\n${feedback}\n\n${existingContent}`;

    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/feedback.md`,
      {
        message: '🔄 Actualizando feedback del código [skip ci]',
        content: Buffer.from(formattedFeedback).toString('base64'),
        sha: fileSha || undefined,
        branch: branchName,
      },
      { headers: this.GITHUB_HEADERS },
    );

    const pr = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        title: 'Auto-generated Feedback PR',
        head: branchName,
        base: feedbackBranch,
        body: 'Este PR ha sido creado automáticamente para la retroalimentación.',
      },
      { headers: this.GITHUB_HEADERS },
    );

    this.logger.log(`✅ Pull Request #${pr.data.number} creado en '${repo}'.`);
    return pr.data.number;
  }

  //Verificar si hay un Pull Request abierto
  async getOpenPullRequest(owner: string, repo: string): Promise<number | null> {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open`;

    const res = await axios.get(url, { headers: this.GITHUB_HEADERS });

    if (!res.data.length) {
      this.logger.warn(`No hay Pull Requests abiertos en '${repo}'.`);
      return null;
    }

    return res.data[0].number;
  }

  //Agregar un comentario al Pull Request
  async addCommentToPullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    feedback: string,
  ): Promise<any> {
    const feedbackMessage = `📌 **Nuevo Feedback Generado:**\n\n**Fecha y Hora:** ${new Date().toLocaleString()}\n\n${feedback}`;

    const res = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
      {
        body: feedbackMessage,
      },
      { headers: this.GITHUB_HEADERS },
    );

    this.logger.log(`✅ Comentario agregado en el PR #${pullNumber} de '${repo}'.`);
    return res.data;
  }

  //Crear un Pull Request o agregar un comentario si ya existe
  async postFeedbackToPR(owner: string, repo: string, feedback: string): Promise<any> {
    try {
      let pullNumber = await this.getOpenPullRequest(owner, repo);

      if (!pullNumber) {
        this.logger.log(`No hay PR abierto en '${repo}'. Creando uno nuevo...`);
        pullNumber = await this.createPullRequest(owner, repo, feedback);
      }

      return await this.addCommentToPullRequest(owner, repo, pullNumber, feedback);
    } catch (error) {
      this.logger.error('❌ Error procesando el feedback:', error.message);
      throw error;
    }
  }

  //Obtener miembros de la organización
  async fetchOrgMembers(): Promise<any[]> {
    try {
      const members: any[] = [];
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await axios.get(
          `https://api.github.com/orgs/${this.ORG_NAME}/members`,
          {
            headers: this.GITHUB_HEADERS,
            params: {
              per_page: perPage,
              page,
            },
          },
        );

        members.push(...response.data);

        if (response.data.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }

      return members;
    } catch (error) {
      this.logger.error(
        'Error obteniendo miembros de la organización:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
