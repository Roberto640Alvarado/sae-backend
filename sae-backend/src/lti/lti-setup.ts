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
    const url_return = token.platformContext?.launchPresentation?.return_url;

    //VALIDACIONES

    if (isInstructor || isAdmin) {
      //Validar si la tarea ya fue enlazada a una tarea de github
      const hasTaskLink = await ltiService.hasTaskLink(assignmentId, issuer);
      if (hasTaskLink) {
        const taskLink = await ltiService.getTaskLinkByMoodleTask(
          assignmentId,
          issuer,
        );

        const idclassroom = taskLink?.idClassroom;
        const idtaskgithub = taskLink?.idTaskGithubClassroom;
        const orgId = taskLink?.orgId;
        const orgName = taskLink?.orgName;
        const idtaskmoodle = taskLink?.idTaskMoodle;

        const payload = {
          idclassroom,
          idtaskgithub,
          orgId,
          orgName,
          idtaskmoodle,
          isMoodle,
          url_return,
        };

        if (!idtaskgithub) {
          throw new Error('No se encontró idTaskGithubClassroom en taskLink');
        }

        const tokenM = jwtService.generateToken(payload, '1h');
        const queryToken = new URLSearchParams({ token: tokenM }).toString();
        const accion = req.query?.accion;
        const resultadoNotas: any[] = [];

        const hasGrade =
          await ltiService.allFeedbackSentByGithubTask(idtaskgithub); //hay notas?

        if (hasGrade) {
          const membersUrl =
            token.platformContext.namesRoles?.context_memberships_url;
          const members = await lti.NamesAndRoles.getMembers(token, membersUrl);

          const estudiantes = members.members.filter((user: any) =>
            user.roles.some(
              (role: string) => role.endsWith('#Learner') || role === 'Learner',
            ),
          );

          const idTareaLTI = taskLink?.idTaskGithubClassroom;
          if (!idTareaLTI) {
            throw new Error(
              'idTaskGithubClassroom no está definido en taskLink',
            );
          }
          console.log('id de Tarea de Github:', idTareaLTI);

          for (const estudiante of estudiantes) {
            let gradeAction = 0;
            let gradeFeedback = 0;

            try {
              const feedback =
                await ltiService.getFeedbackByEmailAndIdTaskGithub(
                  estudiante.email,
                  idTareaLTI,
                );

              if (feedback && typeof feedback.gradeValue === 'number') {
                gradeAction = feedback.gradeValue;
                gradeFeedback = feedback.gradeFeedback;
              }
            } catch (error) {
              console.warn(`No se encontró feedback para ${estudiante.email}`);
            }

            resultadoNotas.push({
              userId: estudiante.user_id,
              email: estudiante.email,
              gradeAction,
              gradeFeedback,
            });
          }

          // Si el usuario ya dio clic en "Enviar notas"
          if (accion === 'enviarNotas') {
            console.log('Enviando calificaciones...');
            let lineItemId = token.platformContext.endpoint?.lineitem;

            if (!lineItemId) {
              const response = await lti.Grade.getLineItems(token, {
                resourceLinkId: true,
              });
              const lineItems = response?.lineItems || [];

              if (lineItems.length === 0) {
                const newLineItem = {
                  scoreMaximum: 10,
                  label: 'Nota automática',
                  tag: 'autograde',
                  resourceLinkId: token.platformContext.resource.id,
                };
                const created = await lti.Grade.createLineItem(
                  token,
                  newLineItem,
                );
                lineItemId = created.id;
              } else {
                lineItemId = lineItems[0].id;
              }
            }

            for (const estudiante of resultadoNotas) {
              const average =
                (estudiante.gradeAction + estudiante.gradeFeedback) / 2;

              const score = {
                userId: estudiante.userId,
                scoreGiven: average,
                scoreMaximum: 10,
                activityProgress: 'Completed',
                gradingProgress: 'FullyGraded',
              };

              try {
                await lti.Grade.submitScore(token, lineItemId, score);
                console.log(
                  `✅ Nota enviada para ${estudiante.email}: ${average}`,
                );
              } catch (error) {
                console.error(
                  `❌ Error al enviar nota para ${estudiante.email}:`,
                  error.message,
                );
              }
            }

            return res.redirect(
              `https://assesscode.com/repositorios?${queryToken}`,
            );
          }

          //Mostrar los botones si hay notas y aún no se envió
          const html = `
    <html>
      <head>
        <title>Enviar notas</title>
        <style>
      * {
        box-sizing: border-box;
      }

      body {
        font-family: Arial, sans-serif;
        background: #f5f5f5;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        height: 100vh;
        margin: 0;
      }

      .card {
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        text-align: center;
        width: 100%;
        max-width: 360px;
        display: flex; 
        flex-direction: column; 
        align-items: center;
      }

      .card h2 {
        margin-top: 0;
      }

      button {
        margin: 10px 0;
        padding: 12px 20px;
        border: none;
        border-radius: 5px;
        font-weight: bold;
        cursor: pointer;
        width: 100%;
        height: 50px;
        transition: background-color 0.3s ease;
        font-size: 16px;
      }

      .sae, .moodle {
        background-color: #19AA59;
        color: white;
      }

      .sae:hover, .moodle:hover {
        background-color: #148c4a;
      }

      a {
        text-decoration: none;
        width: 100%;
      }

    </style>
      </head>
      <body>
        <div class="card">
          <h2>¿Qué deseas hacer?</h2>
          <p>Se encontraron notas para esta tarea.</p>
          <a href="?accion=enviarNotas&ltik=${req.query.ltik}">
            <button class="moodle">Enviar notas a Moodle</button>
          </a>
          <a href="https://assesscode.com/repositorios?${queryToken}">
            <button class="sae">Ir a AssessCode</button>
          </a>
        </div>
      </body>
    </html>
    `;

          return res.send(html);
        }

        // Si no hay notas
        return res.redirect(
          `https://assesscode.com/repositorios?${queryToken}`,
        );
      } else {
        console.log('Esta tarea no ha sido enlazada a una tarea de github');
        const payload = { email, isMoodle, courseId, assignmentId, issuer };
        const token = jwtService.generateToken(payload, '1h');
        const query = new URLSearchParams({ token }).toString();
        return res.redirect(`https://assesscode.com?${query}`);
      }
    } else if (isStudent) {
      //No Existe usuario en SAE
      const hasUser = await ltiService.hasUser(email);
      if (!hasUser) {
        console.log('Este usuario no existe en SAE');
        const isStudentMoodle = true;
        const payload = { isMoodle, isStudentMoodle };
        const token = jwtService.generateToken(payload, '1h');
        const query = new URLSearchParams({ token }).toString();
        return res.redirect(`https://assesscode.com?${query}`);
      } else {
        console.log('Este usuario ya existe en SAE');

        //Verificamos si la tarea ya fue enlazada a una tarea de github
        const hasTaskLink = await ltiService.hasTaskLink(assignmentId, issuer);
        if (!hasTaskLink) {
          console.log('Esta tarea no ha sido enlazada a una tarea de github');

          return res.redirect('https://assesscode.com/NoDisponible'); //Redirigir a una pagina de error,
        } else {
          console.log('Esta tarea ya fue enlazada a una tarea de github');
          const hasFeedback = await ltiService.hasFeedback(
            email,
            assignmentId,
            issuer,
          );
          if (hasFeedback) {
            console.log('Este usuario ya tiene feedback en esta tarea');

            const idTaskClassroom = await ltiService.getTaskLinkByMoodleTask(
              assignmentId,
              issuer,
            ); //Id de la tarea de classroom
            const payload = { email, isMoodle, idTaskClassroom, name };
            const token = jwtService.generateToken(payload, '1h');
            const query = new URLSearchParams({ token }).toString();
            return res.redirect(
              `https://assesscode.com/feedback?${query}`,
            );
          } else {
            console.log('Este usuario no tiene feedback en esta tarea');
            const urlInvitation = await ltiService.getInvitationUrlByMoodleTask(
              assignmentId,
              issuer,
            );
            const payload = { isMoodle, urlInvitation, name };
            const token = jwtService.generateToken(payload, '1h');
            const query = new URLSearchParams({ token }).toString();
            return res.redirect(
              `https://assesscode.com/invitacion?${query}`,
            );
          }
        }
      }
    }
  });

  await lti.deploy({ serverless: true }); // evita conflicto interno
  const express = require('express');
  const ltiApp = express();
  ltiApp.use(lti.app); // usa la app de LTI como middleware
  ltiApp.listen(process.env.PORTLTI || 4000, 'localhost', () =>
    console.log(`✓ LTI escuchando en puerto ${process.env.PORTLTI || 4000}`),
  );

  //Registra la plataforma LTI
  await lti.registerPlatform({
    url: process.env.LTI_PLATFORM_URL!,
    name: 'EcampusUCA',
    clientId: process.env.LTI_CLIENT_ID!,
    authenticationEndpoint: `${process.env.LTI_PLATFORM_URL}/mod/lti/auth.php`,
    accesstokenEndpoint: `${process.env.LTI_PLATFORM_URL}/mod/lti/token.php`,
    authConfig: {
      method: 'JWK_SET',
      key: `${process.env.LTI_PLATFORM_URL}/mod/lti/certs.php`,
    },
  });

  console.log('Plataforma LTI registrada');
};
