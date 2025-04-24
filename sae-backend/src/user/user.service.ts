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

  //Verifica lo de roles y guarda en la BD
  async handleFirstLoginOrUpdate(token: string, username: string): Promise<any> {
    const email = await this.getGitHubPrimaryEmail(token);
    const existingUser = await this.userModel.findOne({ email });
    const githubOrgs = await this.getGitHubOrganizations(token, username);
  
    const updatedOrganizations: {
        orgId: string;
        orgName: string;
        role: 'Student' | 'Teacher' | 'ORG_Admin';
      }[] = [];
  
      for (const org of githubOrgs) {
        const alreadyHasORG_Admin = existingUser?.organizations?.some(
          (o) => o.orgId === org.orgId && o.role === 'ORG_Admin',
        );
      
        const existingOrgInUser = existingUser?.organizations?.find(
          (o) => o.orgId === org.orgId,
        );
      
        //Si ya tiene ORG_Admin en esa org, conservarlo
        if (alreadyHasORG_Admin && existingOrgInUser) {
          updatedOrganizations.push(existingOrgInUser);
          continue;
        }
      
        const orgUsers = await this.userModel.find({
          'organizations.orgId': org.orgId,
        });
      
        let internalRole: 'Student' | 'Teacher' | 'ORG_Admin' = 'Student';
      
        if (org.role === 'admin') {
          internalRole = orgUsers.length === 0 ? 'ORG_Admin' : 'Teacher';
        }
      
        updatedOrganizations.push({
          orgId: org.orgId,
          orgName: org.orgName,
          role: internalRole,
        });
      }
  
    //Crear o actualizar el usuario
    if (!existingUser) {
        const newUser = await this.userModel.create({
            email,
            githubUsername: username,
            githubAccessToken: token,
            isRoot: false,
            organizations: updatedOrganizations ,
          });
          
          return {
            message: 'Usuario creado exitosamente',
            email: newUser.email,
            githubUsername: newUser.githubUsername,
            organizations: newUser.organizations,
            isRoot: newUser.isRoot,
          };
    } else {
      existingUser.githubUsername = username;
      existingUser.githubAccessToken = token;
      existingUser.organizations = updatedOrganizations;
      await existingUser.save();
  
      return {
        message: 'Usuario actualizado exitosamente',
        email: existingUser.email,
        githubUsername: existingUser.githubUsername,
        organizations: existingUser.organizations,
        isRoot: existingUser.isRoot,
      };
    }
  }
  
  
}
