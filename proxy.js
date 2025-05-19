// proxy.js
const WebSocket = require('ws');

const wsServer = new WebSocket.Server({
  port: 3007,
  handleProtocols: () => 'websocket',
  perMessageDeflate: false,
  clientTracking: true
});

const remoteEndpoint = 'ws://192.168.5.199:3006/ws';

wsServer.on('connection', (clientWs, req) => {
  console.log(' Nouvelle connexion client');

  let remoteWs = null;
  let tokenRecu = false;

  clientWs.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      // Étape 1 : réception du token
      if (!tokenRecu && data.type === 'auth' && data.token) {
        tokenRecu = true;
        const token = data.token;
        console.log(' Token JWT reçu du client');

        // Connexion vers WebSocket API distante avec le token
        remoteWs = new WebSocket(remoteEndpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Upgrade': 'websocket',
            'Connection': 'Upgrade'
          },
          rejectUnauthorized: false,
          perMessageDeflate: false,
          followRedirects: true
        });

        remoteWs.on('open', (msg) => {
          console.log(' Connexion établie avec la WebSocket distante');
        });

        remoteWs.on('message', (msg) => {
            console.log(msg)
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(msg);
          }
        });

        remoteWs.on('close', () => {
          console.log(' WebSocket distante fermée');
          if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
        });

        remoteWs.on('error', (err) => {
          console.error(' Erreur WebSocket distante :', err.message);
          if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
        });

      } else if (tokenRecu && remoteWs?.readyState === WebSocket.OPEN) {
        // Reçoit et transmet les messages après authentification
        remoteWs.send(message.toString());
      } else {
        console.warn(' Token non encore reçu ou WebSocket distante non prête');
      }

    } catch (err) {
      console.error('Erreur de parsing ou de message invalide :', err.message);
    }
  });

  clientWs.on('close', () => {
    console.log(' Client WebSocket déconnecté');
    if (remoteWs && remoteWs.readyState === WebSocket.OPEN) remoteWs.close();
  });

  clientWs.on('error', (err) => {
    console.error(' Erreur WebSocket client :', err.message);
  });
});

wsServer.on('error', (error) => {
  console.error(' Erreur serveur WebSocket :', error);
});

console.log(' Serveur proxy WebSocket démarré sur ws://localhost:3007');
