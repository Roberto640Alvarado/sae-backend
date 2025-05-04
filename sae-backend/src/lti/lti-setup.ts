const lti = require("ltijs").Provider;
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

export const setupLti = async () => {

    await lti.setup(
        process.env.LTI_KEY,
        { url: process.env.MONGO_URI  },
        {
          appRoute: '/',
          loginRoute: '/login',
          cookies: { secure: true, sameSite: 'None' },
          devMode: false,
        }
      );
      
      await mongoose.connect(process.env.MONGO_URI!);
      console.log('Conectado a MongoDB');

      lti.onConnect(async (token, req, res) => {
        const name = token.userInfo?.name || 'Sin nombre';
        const email = token.userInfo?.email || 'Sin email';
        const assignment = token.platformContext?.resource?.title || 'Actividad';
        const roles = token.platformContext?.roles || [];
      
        const courseId = token.platformContext?.context?.id || 'unknown';
        const assignmentId = token.platformContext?.resource?.id || 'unknown';
      
        const isInstructor = roles.some((r) => r.includes('#Instructor'));
        const isAdmin = roles.some((r) => r.includes('#Administrator'));
        const isStudent = roles.some((r) => r.includes('#Learner'));
      
        if (isInstructor || isAdmin) {
          const query = new URLSearchParams({
            email,
            isMoodle: 'true',
            courseId,
            assignmentId,
          }).toString();
      
          return res.redirect(`https://sae2025.netlify.app?${query}`);
        }
      
        //Si es estudiante, mostrar vista básica
        const readableRoles = roles
          .map((r) => {
            if (r.includes("#Instructor")) return "Instructor";
            if (r.includes("#Learner")) return "Estudiante";
            if (r.includes("#Administrator")) return "Administrador";
            return r;
          })
          .join(", ");
      
        const html = `<h1>Hola ${name}</h1>
          <p>Tarea: ${assignment}</p>
          <p>Correo: ${email}</p>
          <p>Curso: ${courseId}</p>
          <p>ID de Tarea: ${assignmentId}</p>
          <p>Roles: ${readableRoles}</p>
          <p>Token: ${JSON.stringify(token, null, 2)}</p>`;
      
        return res.send(html);
      });
      
      
      await lti.deploy({ port: 3005 });
      console.log('🚀 LTI Deploy ejecutado');
      
      //Registra la plataforma LTI
      await lti.registerPlatform({
        url: 'https://ecampusuca.moodlecloud.com',
        name: 'EcampusUCA',
        clientId: 'd8Af3rpbiUdOneX',
        authenticationEndpoint: 'https://ecampusuca.moodlecloud.com/mod/lti/auth.php',
        accesstokenEndpoint: 'https://ecampusuca.moodlecloud.com/mod/lti/token.php',
        authConfig: {
          method: 'JWK_SET',
          key: 'https://ecampusuca.moodlecloud.com/mod/lti/certs.php',
        },
      });
      
      console.log('✅ Plataforma LTI registrada');
};
