// Cloudflare Workers WebSocket logic
const clients = new Map();

export default {
  async fetch(request, env) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    server.accept();
    
    let currentId = null;
    let targetForBinary = null;

    server.addEventListener('message', event => {
      const { data } = event;

      if (typeof data === 'string') {
        const msg = JSON.parse(data);

        // ID မှတ်ပုံတင်ခြင်း
        if (msg.type === 'register') {
          currentId = msg.id.toLowerCase();
          clients.set(currentId, server);
          server.send(JSON.stringify({ type: 'registered', id: msg.id }));
        }

        // စာသားပို့ခြင်း
        if (msg.type === 'text') {
          const target = msg.to.toLowerCase();
          if (clients.has(target) && target !== currentId) {
            clients.get(target).send(JSON.stringify(msg));
          }
        }

        // Binary File မပို့ခင် Metadata ပို့ခြင်း
        if (msg.type === 'file_meta') {
          targetForBinary = msg.to.toLowerCase();
          if (clients.has(targetForBinary) && targetForBinary !== currentId) {
            clients.get(targetForBinary).send(JSON.stringify(msg));
          }
        }
      } else {
        // Binary Data (File) ကို Target ဆီ တိုက်ရိုက်ပို့ခြင်း
        if (targetForBinary && clients.has(targetForBinary)) {
          const targetWS = clients.get(targetForBinary);
          // Sender ဆီ ပြန်မရောက်အောင် စစ်ဆေးခြင်း
          if (targetWS !== server) {
            targetWS.send(data);
          }
        }
      }
    });

    server.addEventListener('close', () => {
      if (currentId) clients.delete(currentId);
    });

    return new Response(null, { status: 101, webSocket: client });
  }
};
