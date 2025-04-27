import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private buildHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    };
  }

  //Obtener el username y el nombre real del usuario desde GitHub
  async getGitHubUsernameAndName(
    token: string,
  ): Promise<{ username: string; name: string }> {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: this.buildHeaders(token),
      });

      const username = response.data.login;
      const name = response.data.name;

      if (!username || !name) {
        throw new Error('No se pudo obtener el nombre o username del usuario.');
      }

      return { username, name };
    } catch (error) {
      this.logger.error(
        'Error obteniendo datos del usuario desde GitHub:',
        error.message,
      );
      throw new Error('No se pudo obtener el nombre y username del usuario.');
    }
  }

  //Obtener email primario
  async getGitHubPrimaryEmail(token: string) {
    const response = await axios.get('https://api.github.com/user/emails', {
      headers: this.buildHeaders(token),
    });

    const primary = response.data.find(
      (email: any) => email.primary && email.verified,
    );

    if (!primary)
      throw new Error('No se encontró un email primario verificado');

    return primary.email;
  }

  //Obtener lista de organizaciones
  async getGitHubOrganizations(token: string, username: string) {
    const response = await axios.get('https://api.github.com/user/orgs', {
      headers: this.buildHeaders(token),
    });

    const orgsWithRoles = await Promise.all(
      response.data.map(async (org: any) => {
        let role = 'unknown';
        try {
          const membership = await axios.get(
            `https://api.github.com/orgs/${org.login}/memberships/${username}`,
            { headers: this.buildHeaders(token) },
          );
          role = membership.data.role; //"admin" o "member"
        } catch (error) {
          this.logger.warn(
            `No se pudo obtener el rol del usuario en la org "${org.login}"`,
          );
        }

        return {
          orgName: org.login,
          orgId: org.id,
          role, //puede ser "admin", "member" o "unknown"
        };
      }),
    );

    return orgsWithRoles;
  }

  //Buscar profesores por ID de organización
  async findTeachersByOrgId(orgId: string) {
    const teachers = await this.userModel.find({
      organizations: {
        $elemMatch: {
          orgId,
          role: 'Teacher',
        },
      },
    });

    return teachers;
  }

  //Obtener email por githubUsername
  async getEmailByGithubUsername(
    githubUsername: string,
  ): Promise<string | null> {
    if (!githubUsername) {
      return null;
    }

    const user = await this.userModel.findOne({ githubUsername });

    if (!user) {
      return null;
    }

    return user.email;
  }

  //Obtener info de user por Correo
  async getUserByEmail(email: string): Promise<UserDocument | null> {
    if (!email) {
      return null;
    }

    const user = await this.userModel.findOne({ email });

    if (!user) {
      return null;
    }

    return user;
  }

  //Registro de usuario o actualización de datos en la base de datos
  async handleFirstLoginOrUpdate(token: string): Promise<any> {
    const email = await this.getGitHubPrimaryEmail(token);
    const existingUser = await this.userModel.findOne({ email });
    const { username, name } = await this.getGitHubUsernameAndName(token);
    const githubOrgs = await this.getGitHubOrganizations(token, username);
  
    //Validar el rol del usuario en la organización
    const determineRole = async (orgId: string, githubRole: string, previousRole?: 'Student' | 'Teacher' | 'ORG_Admin'): Promise<'Student' | 'Teacher' | 'ORG_Admin'> => {
      if (githubRole === 'member') {
        return 'Student';
      }
      if (githubRole === 'admin') {
        if (previousRole === 'ORG_Admin') {
          return 'ORG_Admin';
        }
        const orgAdminExists = await this.userModel.exists({
          'organizations': { $elemMatch: { orgId, role: 'ORG_Admin' } }
        });
        return !orgAdminExists ? 'ORG_Admin' : 'Teacher';
      }
      return 'Student';
    };
  
    const updatedOrganizations: {
      orgId: string;
      orgName: string;
      role: 'Student' | 'Teacher' | 'ORG_Admin';
    }[] = [];
  
    for (const githubOrg of githubOrgs) {
      const existingOrg = existingUser?.organizations.find(
        (o) => o.orgId === String(githubOrg.orgId)
      );
  
      const roleInApp = await determineRole(
        String(githubOrg.orgId),
        githubOrg.role,
        existingOrg?.role
      );
  
      updatedOrganizations.push({
        orgId: String(githubOrg.orgId),
        orgName: githubOrg.orgName,
        role: roleInApp,
      });
    }
  
    if (!existingUser) {
      const newUser = await this.userModel.create({
        email,
        githubUsername: username,
        name,
        githubAccessToken: token,
        isRoot: false,
        organizations: updatedOrganizations,
      });
  
      return {
        message: 'Usuario creado exitosamente',
        email: newUser.email,
        name: newUser.name,
        githubUsername: newUser.githubUsername,
        githubAccessToken: newUser.githubAccessToken,
        organizations: newUser.organizations,
        isRoot: newUser.isRoot,
      };
    } else {
      existingUser.githubUsername = username;
      existingUser.githubAccessToken = token;
      existingUser.name = name;
      existingUser.organizations = updatedOrganizations;
      await existingUser.save();
  
      return {
        message: 'Usuario actualizado exitosamente',
        email: existingUser.email,
        name: existingUser.name,
        githubUsername: existingUser.githubUsername,
        organizations: existingUser.organizations,
        isRoot: existingUser.isRoot,
      };
    }
  }
  
}
