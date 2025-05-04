const lti = require('ltijs').Provider;
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { LtiValidationService } from './lti-validation.service';
import { JwtService } from '../jwt/jwt.service';

dotenv.config();

const jwtService = new JwtService();

export const setupLti = async () => {
  const ltiValidation = new LtiValidationService();

  await lti.setup(
    process.env.LTI_KEY,
    { url: process.env.MONGO_URI },
    {
      appRoute: '/',
      loginRoute: '/login',
      cookies: { secure: true, sameSite: 'None' },
      devMode: false,
    },
  );

  await mongoose.connect(process.env.MONGO_URI!);
  console.log('Conectado a MongoDB');

  lti.onConnect(async (token, req, res) => {
    const ltiService = new LtiValidationService();
    //console.log('Token:', token);
    const name = token.userInfo?.name || 'Sin nombre';
    const email = token.userInfo?.email || 'Sin email';
    const roles = token.platformContext?.roles || [];

    const courseId = token.platformContext?.context?.id || 'unknown';
    const assignmentId = token.platformContext?.resource?.id || 'unknown';
    const issuer = token.iss;

    const isInstructor = roles.some((r) => r.includes('#Instructor'));
    const isAdmin = roles.some((r) => r.includes('#Administrator'));
    const isStudent = roles.some((r) => r.includes('#Learner'));
    const isMoodle = true;

    //VALIDACIONES

    if (isInstructor || isAdmin) {
      //Validar si la tarea ya fue enlazada a una tarea de github
      const hasTaskLink = await ltiService.hasTaskLink(assignmentId, issuer);
      if (hasTaskLink) {
        console.log('Esta tarea ya fue enlazada a una tarea de github');

        const taskLink = await ltiService.getTaskLinkByMoodleTask(
          assignmentId,
          issuer,
        ); //info de la tarea enlazada

        const idclassroom = taskLink?.idClassroom; //Id classroom
        const idtaskgithub = taskLink?.idTaskGithubClassroom; //Id tarea github
        const idtaskmoodle = taskLink?.idTaskMoodle; //Id tarea moodle
        const payload = { idclassroom, idtaskgithub, idtaskmoodle, isMoodle };

        const token = jwtService.generateToken(payload, '1h');

        const query = new URLSearchParams({ token }).toString();

        return res.redirect(`https://sae2025.netlify.app?${query}`);
      } else {
        console.log('Esta tarea no ha sido enlazada a una tarea de github');
        const payload = { email, isMoodle, courseId, assignmentId, issuer };
        const token = jwtService.generateToken(payload, '1h');
        const query = new URLSearchParams({ token }).toString();
        return res.redirect(`https://sae2025.netlify.app?${query}`);
      }
    } else if (isStudent) {
      //Existe usuario en SAE
      const hasUser = await ltiService.hasUser(email);
      if (!hasUser) {
        console.log('Este usuario no existe en SAE');
        const isStudentMoodle = true;
        const payload = { isMoodle, isStudentMoodle };
        const token = jwtService.generateToken(payload, '1h');
        const query = new URLSearchParams({ token }).toString();
        return res.redirect(`https://sae2025.netlify.app?${query}`);
      } else {
        console.log('Este usuario ya existe en SAE');

        //Verificamos si la tarea ya fue enlazada a una tarea de github
        const hasTaskLink = await ltiService.hasTaskLink(assignmentId, issuer);
        if (!hasTaskLink) {
          console.log('Esta tarea no ha sido enlazada a una tarea de github');

          const html = `<h1>Hola ${name} esta tarea se encuentra en Configuracion</h1>
          <p>Correo: ${email}</p>
          <p>Curso: ${courseId}</p>
          <p>ID de Tarea: ${assignmentId}</p>`;

          return res.send(html);
        }
        else{
          console.log('Esta tarea ya fue enlazada a una tarea de github');
          const hasFeedback = await ltiService.hasFeedback(email, assignmentId, issuer);
          if (hasFeedback){
            console.log('Este usuario ya tiene feedback en esta tarea');
            const payload = { email, isMoodle, assignmentId };
            const token = jwtService.generateToken(payload, '1h');
            const query = new URLSearchParams({ token }).toString();
            return res.redirect(`https://sae2025.netlify.app/feedback?${query}`);            
          }
          else{
            console.log('Este usuario no tiene feedback en esta tarea');
            const urlInvitation = await ltiService.getInvitationUrlByMoodleTask(assignmentId,issuer); 
            const html = `<h1>Hola ${name} tu enlace de invitacion es el siguiente:</h1>
            <p> Si ya generaste tu repositorio, puedes ignorar este mensaje</p>
            <p> Catedratico se encuentra realizando las retroalimentaciones respectivas</p>
            <p>URL de invitación: ${urlInvitation}</p>`;
            return res.send(html);     
          }

        }
      }
    }
  });

  await lti.deploy({ port: 3005 });
  console.log('LTI Deploy ejecutado');

  //Registra la plataforma LTI
  await lti.registerPlatform({
    url: 'https://ecampusuca.moodlecloud.com',
    name: 'EcampusUCA',
    clientId: 'd8Af3rpbiUdOneX',
    authenticationEndpoint:
      'https://ecampusuca.moodlecloud.com/mod/lti/auth.php',
    accesstokenEndpoint: 'https://ecampusuca.moodlecloud.com/mod/lti/token.php',
    authConfig: {
      method: 'JWK_SET',
      key: 'https://ecampusuca.moodlecloud.com/mod/lti/certs.php',
    },
  });

  console.log('Plataforma LTI registrada');
};
