import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class RepoService {
  private readonly logger = new Logger(RepoService.name);
  private buildHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  //Obtener todos los classrooms filtrados por id de organización
  async fetchClassrooms(token: string, orgId: string): Promise<any[]> {
    const url = 'https://api.github.com/classrooms';

    try {
      const response = await axios.get(url, {
        headers: this.buildHeaders(token),
      });

      const allClassrooms = response.data;

      // Filtrar por orgId presente en la URL
      const filteredClassrooms = allClassrooms.filter((classroom: any) => {
        return classroom.url.includes(`classrooms/${orgId}-`);
      });

      return filteredClassrooms;
    } catch (error) {
      this.logger.error(
        'Error obteniendo classrooms:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  //Verificar si una classroom específica pertenece a una organización
  async isClassroomInOrg(
    token: string,
    orgId: string,
    classroomId: string,
  ): Promise<any> {
    const classrooms = await this.fetchClassrooms(token, orgId);
    const match = classrooms.find(
      (classroom: any) => classroom.id.toString() === classroomId,
    );

    return match || null;
  }

  //Obtener todas las tareas de una classroom
  async fetchAssignments(token: string, classroomId: string): Promise<any> {
    const url = `https://api.github.com/classrooms/${classroomId}/assignments`;

    try {
      const response = await axios.get(url, {
        headers: this.buildHeaders(token),
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
  async fetchAssignmentRepos(
    token: string,
    assignmentId: string,
  ): Promise<any> {
    const url = `https://api.github.com/assignments/${assignmentId}/accepted_assignments`;

    try {
      const response = await axios.get(url, {
        headers: this.buildHeaders(token),
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
  async fetchAssignmentGrades(
    token: string,
    assignmentId: string,
  ): Promise<any> {
    const url = `https://api.github.com/assignments/${assignmentId}/grades`;

    try {
      const response = await axios.get(url, {
        headers: this.buildHeaders(token),
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
  async fetchLatestWorkflowRun(token: string, repo: string, orgName: string) {
    const url = `https://api.github.com/repos/${orgName}/${repo}/actions/runs`;
    const response = await axios.get(url, {
      headers: this.buildHeaders(token),
    });

    if (!response.data.workflow_runs.length) return null;
    return response.data.workflow_runs[0];
  }

  //Función para obtener los detalles de un workflow
  async fetchWorkflowJobs(
    token: string,
    repo: string,
    runId: number,
    orgName: string,
  ) {
    const url = `https://api.github.com/repos/${orgName}/${repo}/actions/runs/${runId}/jobs`;
    const response = await axios.get(url, {
      headers: this.buildHeaders(token),
    });

    return response.data.jobs;
  }

  //Función para obtener el contenido de un repositorio
  async fetchRepoContent(
    token: string,
    repo: string,
    extension: string,
    orgName: string,
  ) {
    try {
      const repoContentsUrl = `https://api.github.com/repos/${orgName}/${repo}/contents/`;
      const contentsResponse = await axios.get(repoContentsUrl, {
        headers: this.buildHeaders(token),
      });

      const matchingFiles = contentsResponse.data.filter(
        (file: { name: string }) => file.name.endsWith(extension),
      );

      if (!matchingFiles.length) {
        throw new Error(
          `No se encontró ningún archivo con la extensión "${extension}" en el repositorio.`,
        );
      }

      const codeUrl = matchingFiles[0].download_url;

      const readmeUrl = `https://api.github.com/repos/${orgName}/${repo}/contents/README.md`;
      const readmeResponse = await axios.get(readmeUrl, {
        headers: this.buildHeaders(token),
      });

      const codeResponse = await axios.get(codeUrl);

      return {
        readme: Buffer.from(readmeResponse.data.content, 'base64').toString(),
        code: codeResponse.data,
      };
    } catch (error) {
      this.logger.error(
        `Error obteniendo contenido del repositorio: ${error.message}`,
      );
      return null;
    }
  }

  //Si existe rama feedback, la crea desde main
  private async ensureFeedbackBranchExists(
    token: string,
    owner: string,
    repo: string,
  ): Promise<void> {
    const feedbackBranch = 'feedback';
    const baseBranch = 'main';

    try {
      await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${feedbackBranch}`,
        { headers: this.buildHeaders(token) },
      );
      this.logger.log(`La rama '${feedbackBranch}' ya existe.`);
    } catch (error) {
      if (error.response?.status === 404) {
        this.logger.log(
          `La rama '${feedbackBranch}' no existe. Creándola desde '${baseBranch}'...`,
        );

        const baseRef = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
          { headers: this.buildHeaders(token) },
        );
        const baseSha = baseRef.data.object.sha;

        await axios.post(
          `https://api.github.com/repos/${owner}/${repo}/git/refs`,
          {
            ref: `refs/heads/${feedbackBranch}`,
            sha: baseSha,
          },
          { headers: this.buildHeaders(token) },
        );

        this.logger.log(`Rama '${feedbackBranch}' creada correctamente.`);
      } else {
        throw new Error(
          `Error verificando la rama '${feedbackBranch}': ${error.message}`,
        );
      }
    }
  }

  //Función para crear un Pull Request con el feedback
  async createPullRequest(
    token: string,
    owner: string,
    repo: string,
    feedback: string,
  ): Promise<number> {
    const feedbackBranch = 'feedback';
    const branchName = `auto-feedback-${Date.now()}`;

    await this.ensureFeedbackBranchExists(token, owner, repo);

    const baseRef = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${feedbackBranch}`,
      { headers: this.buildHeaders(token) },
    );
    const baseSha = baseRef.data.object.sha;

    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      },
      { headers: this.buildHeaders(token) },
    );

    this.logger.log(`Rama '${branchName}' creada desde '${feedbackBranch}'.`);

    let fileSha: string | null = null;
    let existingContent = '';

    try {
      const fileData = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/feedback.md?ref=${feedbackBranch}`,
        { headers: this.buildHeaders(token) },
      );
      fileSha = fileData.data.sha;
      existingContent = Buffer.from(fileData.data.content, 'base64').toString(
        'utf-8',
      );
    } catch {
      this.logger.log('No se encontró feedback.md. Se creará uno nuevo.');
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
      { headers: this.buildHeaders(token) },
    );

    const pr = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        title: 'Auto-generated Feedback PR',
        head: branchName,
        base: feedbackBranch,
        body: 'Este PR ha sido creado automáticamente para la retroalimentación.',
      },
      { headers: this.buildHeaders(token) },
    );

    this.logger.log(`Pull Request #${pr.data.number} creado en '${repo}'.`);
    return pr.data.number;
  }

  //Verificar si hay un Pull Request abierto
  async getOpenPullRequest(
    token: string,
    owner: string,
    repo: string,
  ): Promise<number | null> {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open`;

    const res = await axios.get(url, { headers: this.buildHeaders(token) });

    if (!res.data.length) {
      this.logger.warn(`No hay Pull Requests abiertos en '${repo}'.`);
      return null;
    }

    return res.data[0].number;
  }

  //Agregar un comentario al Pull Request
  async addCommentToPullRequest(
    token: string,
    owner: string,
    repo: string,
    pullNumber: number,
    feedback: string,
  ): Promise<any> {
    const feedbackMessage = `📌 **Nueva Retroalimentación Generada:**\n\n**Fecha y Hora:** ${new Date().toLocaleString()}\n\n${feedback}`;

    const res = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
      {
        body: feedbackMessage,
      },
      { headers: this.buildHeaders(token) },
    );

    this.logger.log(
      `Comentario agregado en el PR #${pullNumber} de '${repo}'.`,
    );
    return res.data;
  }

  //Crear un Pull Request o agregar un comentario si ya existe
  async postFeedbackToPR(
    token: string,
    owner: string,
    repo: string,
    feedback: string,
  ): Promise<any> {
    try {
      let pullNumber = await this.getOpenPullRequest(token, owner, repo);

      if (!pullNumber) {
        this.logger.log(`No hay PR abierto en '${repo}'. Creando uno nuevo...`);
        pullNumber = await this.createPullRequest(token, owner, repo, feedback);
      }

      return await this.addCommentToPullRequest(
        token,
        owner,
        repo,
        pullNumber,
        feedback,
      );
    } catch (error) {
      this.logger.error('Error procesando el feedback:', {
        message: error.message,
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }
}
