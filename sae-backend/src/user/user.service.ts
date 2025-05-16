import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
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
          role: { $in: ['Teacher', 'ORG_Admin'] },
        },
      },
    });

    //Filtrar el array de organizaciones para dejar solo la que coincide con el orgId
    const filteredTeachers = teachers.map((teacher) => {
      const orgMatch = teacher.organizations.filter(
        (org) => org.orgId === orgId
      );
      return {
        ...teacher.toObject(), //convertir a objeto plano
        organizations: orgMatch,
      };
    });

    return filteredTeachers;
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
    const determineRole = async (
      orgId: string,
      githubRole: string,
      previousRole?: 'Student' | 'Teacher' | 'ORG_Admin',
    ): Promise<'Student' | 'Teacher' | 'ORG_Admin'> => {
      if (githubRole === 'member') {
        return 'Student';
      }
      if (githubRole === 'admin') {
        if (previousRole === 'ORG_Admin') {
          return 'ORG_Admin';
        }
        return 'Teacher';
      }
      return 'Student';
    };

    const updatedOrganizations: {
      orgId: string;
      orgName: string;
      role: 'Student' | 'Teacher' | 'ORG_Admin';
      isActive: boolean;
    }[] = [];

    for (const githubOrg of githubOrgs) {
      const existingOrg = existingUser?.organizations.find(
        (o) => o.orgId === String(githubOrg.orgId),
      );

      const roleInApp = await determineRole(
        String(githubOrg.orgId),
        githubOrg.role,
        existingOrg?.role,
      );

      updatedOrganizations.push({
        orgId: String(githubOrg.orgId),
        orgName: githubOrg.orgName,
        role: roleInApp,
        isActive: existingOrg?.isActive ?? true,
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

  //Mostrar todos los usuarios de una organización
  async getUsersGroupedByOrganization() {
    const users = await this.userModel
      .find(
        {},
        {
          email: 1,
          name: 1,
          githubUsername: 1,
          organizations: 1,
        },
      )
      .lean();

    const orgMap = new Map<
      string,
      {
        orgId: string;
        orgName: string;
        users: {
          _id: any;
          email: string;
          name: string | null;
          githubUsername: string | null;
          role: string;
          isActive?: boolean;
        }[];
      }
    >();

    for (const user of users) {
      for (const org of user.organizations || []) {
        const key = org.orgId;

        if (!orgMap.has(key)) {
          orgMap.set(key, {
            orgId: org.orgId,
            orgName: org.orgName,
            users: [],
          });
        }

        orgMap.get(key)!.users.push({
          _id: user._id,
          email: user.email,
          name: user.name,
          githubUsername: user.githubUsername,
          role: org.role,
          isActive: org.isActive,
        });
      }
    }

    return Array.from(orgMap.values());
  }

  //Asignar rol de admin a un usuario en una organización
  async assignOrgAdminRole(userId: string, orgId: string) {
    const currentAdmin = await this.userModel.findOne({
      organizations: {
        $elemMatch: { orgId, role: 'ORG_Admin' },
      },
    });

    const newAdmin = await this.userModel.findById(userId);
    if (!newAdmin) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    //Validar que el nuevo admin pertenezca a esa organización
    const newAdminOrg = newAdmin.organizations.find(
      (org) => org.orgId === orgId,
    );
    if (!newAdminOrg) {
      throw new HttpException(
        'El usuario no pertenece a esa organización',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Actualizar el rol del admin anterior, si existe
    if (currentAdmin && currentAdmin._id?.toString() !== userId) {
      const previousOrg = currentAdmin.organizations.find(
        (org) => org.orgId === orgId,
      );
      if (previousOrg) {
        previousOrg.role = 'Teacher';
        await currentAdmin.save();
      }
    }

    //Asignar nuevo rol de ORG_Admin
    newAdminOrg.role = 'ORG_Admin';
    await newAdmin.save();

    return {
      message: 'Rol de ORG_Admin asignado correctamente.',
      newAdmin: {
        email: newAdmin.email,
        name: newAdmin.name,
      },
      previousAdmin: currentAdmin
        ? {
            email: currentAdmin.email,
            name: currentAdmin.name,
          }
        : null,
    };
  }

  //Activar o desactivar un usuario en una organización
  async toggleUserStatus(
    userId: string,
    orgId: string,
    activate: boolean,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    const org = user.organizations.find((o) => o.orgId === orgId);

    if (!org) {
      throw new HttpException(
        'El usuario no pertenece a la organización especificada',
        HttpStatus.BAD_REQUEST,
      );
    }

    org.isActive = activate;
    await user.save();
  }

  //Desactivar a todos los usuarios de una organización
  async deactivateAllUsersInOrg(
    orgId: string,
  ): Promise<{ updatedCount: number }> {
    const users = await this.userModel.find({
      organizations: {
        $elemMatch: {
          orgId,
          isActive: true,
        },
      },
    });

    let updatedCount = 0;

    for (const user of users) {
      let modified = false;

      for (const org of user.organizations) {
        if (org.orgId === orgId && org.isActive) {
          org.isActive = false;
          modified = true;
        }
      }

      if (modified) {
        await user.save();
        updatedCount++;
      }
    }

    return { updatedCount };
  }

  //Activar a todos los usuarios de una organización
  async activateAllUsersInOrg(
    orgId: string,
  ): Promise<{ updatedCount: number }> {
    const users = await this.userModel.find({
      organizations: {
        $elemMatch: {
          orgId,
          isActive: false,
        },
      },
    });

    let updatedCount = 0;

    for (const user of users) {
      let modified = false;

      for (const org of user.organizations) {
        if (org.orgId === orgId && !org.isActive) {
          org.isActive = true;
          modified = true;
        }
      }

      if (modified) {
        await user.save();
        updatedCount++;
      }
    }

    return { updatedCount };
  }

  //Obtener todas las organizaciones únicas
  async getAllOrganizations(): Promise<
    { orgId: string; orgName: string; isActive: boolean }[]
  > {
    const users = await this.userModel.find({}, { organizations: 1 }).lean();

    const orgMap = new Map<string, { orgName: string; hasActive: boolean }>();

    for (const user of users) {
      for (const org of user.organizations || []) {
        if (!orgMap.has(org.orgId)) {
          //Inicializar con el primer registro encontrado
          orgMap.set(org.orgId, {
            orgName: org.orgName,
            hasActive: !!org.isActive, //true si el primero ya es activo
          });
        } else if (org.isActive) {
          //Si ya existe pero encontramos uno activo, actualizar a true
          orgMap.get(org.orgId)!.hasActive = true;
        }
      }
    }

    return Array.from(orgMap.entries()).map(([orgId, value]) => ({
      orgId,
      orgName: value.orgName,
      isActive: value.hasActive,
    }));
  }
}
