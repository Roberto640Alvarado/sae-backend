import { Injectable, OnModuleInit } from '@nestjs/common';
const lti = require('ltijs').Provider;

@Injectable()
export class LtiService implements OnModuleInit {
  async onModuleInit() {
    await lti.setup(
      process.env.LTI_KEY,
      { url: process.env.MONGO_URI }, //Base datos mongo para sesiones
      {
        appRoute: '/', //Ruta a la que Moodle redirige tras login
        loginRoute: '/login', //Ruta para el login LTI
        cookies: {
          secure: true, 
          sameSite: 'None',
        }, 
      },
    );

    await lti.deploy({ serverless: true });

    const platformConfig = {
      url: 'https://ecampusuca.moodlecloud.com/',
      name: 'EcampusUCA',
      clientId: 'd8Af3rpbiUdOneX',
      authenticationEndpoint:
        'https://ecampusuca.moodlecloud.com/mod/lti/auth.php',
      accesstokenEndpoint:
        'https://ecampusuca.moodlecloud.com/mod/lti/token.php',
      authConfig: {
        method: 'JWK_SET',
        key: 'https://ecampusuca.moodlecloud.com/mod/lti/certs.php',
      },
    };

    await lti.registerPlatform(platformConfig);

    console.log('Plataforma registrada correctamente:', platformConfig.name);

    lti.onConnect(async (token, req, res) => {
      const name = token.userInfo?.name || 'Nombre no disponible';
      const email = token.userInfo?.email || 'Correo no disponible';
      const roles = token.platformContext?.roles || [];
      const course =
        token.platformContext?.context?.title || 'Curso desconocido';
      const assignment =
        token.platformContext?.resource?.title || 'Actividad desconocida';

      const readableRoles = roles
        .map((r) => {
          if (r.includes('#Instructor')) return 'Instructor';
          if (r.includes('#Learner')) return 'Estudiante';
          if (r.includes('#Administrator')) return 'Administrador';
          return r;
        })
        .join(', ');

      const html = `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8" />
            <title>LTI Launch</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h1 { color: #007acc; }
              p { font-size: 1.1rem; }
            </style>
          </head>
          <body>
            <h1>Conexión exitosa 🚀</h1>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Correo:</strong> ${email}</p>
            <p><strong>Rol:</strong> ${readableRoles}</p>
            <p><strong>Curso:</strong> ${course}</p>
            <p><strong>Actividad:</strong> ${assignment}</p>
          </body>
          </html>
        `;

      return res.send(html);
    });
  }
}
