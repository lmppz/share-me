// Server side logic
const clients = new Map();

export default {
  async fetch(request, env) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const [client, server] = new Array(2).fill(null).map(() => new Object());
    const pair = new WebSocketPair();
    const [clientWS, serverWS] = [pair[0], pair[1]];

    serverWS.accept();
    
    let currentId = null;
    let targetForBinary = null;

    serverWS.addEventListener('message', event => {
      const { data } = event;

      if (typeof data === 'string') {
        const msg = JSON.parse(data);

        if (msg.type === 'register') {
          currentId = msg.id.toLowerCase();
          clients.set(currentId, serverWS);
          serverWS.send(JSON.stringify({ type: 'registered', id: msg.id }));
        }

        if (msg.type === 'text') {
          const target = msg.to.toLowerCase();
          if (clients.has(target) && target !== currentId) {
            clients.get(target).send(JSON.stringify(msg));
          }
        }

        if (msg.type === 'file_meta') {
          targetForBinary = msg.to.toLowerCase();
          if (clients.has(targetForBinary) && targetForBinary !== currentId) {
            clients.get(targetForBinary).send(JSON.stringify(msg));
          }
        }
      } else {
        // Binary Data (300MB Check handled at client side)
        if (targetForBinary && clients.has(targetForBinary)) {
          const targetWS = clients.get(targetForBinary);
          if (targetWS !== serverWS) {
            targetWS.send(data);
          }
        }
      }
    });

    serverWS.addEventListener('close', () => {
      if (currentId) clients.delete(currentId);
    });

    return new Response(null, { status: 101, webSocket: clientWS });
  }
};
