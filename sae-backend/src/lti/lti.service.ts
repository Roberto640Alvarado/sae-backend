import { Injectable } from '@nestjs/common';
const lti = require('ltijs').Provider;

@Injectable()
export class LtiService {
  async setupLti(expressApp: any) {
    await lti.setup(process.env.LTI_KEY,
        { url: process.env.MONGO_URI },
        {
          appRoute: '/',
          loginRoute: '/login',
          cookies: { secure: false, sameSite: 'None' },
          devMode: true
        }
      )

    await lti.deploy({ serverless: true, server: expressApp });

    await lti.registerPlatform({
      url: 'https://ecampusuca.moodlecloud.com/',
      name: 'EcampusUCA',
      clientId: 'd8Af3rpbiUdOneX',
      authenticationEndpoint: 'https://ecampusuca.moodlecloud.com/mod/lti/auth.php',
      accesstokenEndpoint: 'https://ecampusuca.moodlecloud.com/mod/lti/token.php',
      authConfig: {
        method: 'JWK_SET',
        key: 'https://ecampusuca.moodlecloud.com/mod/lti/certs.php',
      },
    });

    this.registerLaunchHandler();
    console.log('✅ Plataforma registrada y manejador conectado');
  }

  registerLaunchHandler() {
    lti.onConnect(async (token, req, res) => {
      const name = token.userInfo?.name || 'Nombre no disponible';
      const email = token.userInfo?.email || 'Correo no disponible';
      const roles = token.platformContext?.roles || [];
      const assignment = token.platformContext?.resource?.title || 'Actividad';

      const readableRoles = roles.map((r) => {
        if (r.includes('#Instructor')) return 'Instructor';
        if (r.includes('#Learner')) return 'Estudiante';
        return r;
      }).join(', ');

      res.send(`
        <html><body>
          <h1>Conexión exitosa 🚀</h1>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Correo:</strong> ${email}</p>
          <p><strong>Rol:</strong> ${readableRoles}</p>
          <p><strong>Actividad:</strong> ${assignment}</p>
        </body></html>
      `);
    });
  }
}

