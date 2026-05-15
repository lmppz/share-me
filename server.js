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

    server.addEventListener('message', event => {
      const { data } = event;

      if (typeof data === 'string') {
        const msg = JSON.parse(data);

        // ID ကို Map ထဲမှာ သိမ်းဆည်းခြင်း
        if (msg.type === 'register') {
          currentId = msg.id.toLowerCase();
          clients.set(currentId, server);
          server.send(JSON.stringify({ type: 'registered', id: msg.id }));
        }

        // စာသားပို့ခြင်း
        if (msg.type === 'text') {
          const target = msg.to.toLowerCase();
          if (clients.has(target)) {
            clients.get(target).send(JSON.stringify(msg));
          }
        }
        
        // ဖိုင် metadata ပို့ခြင်း
        if (msg.type === 'file_meta') {
          const target = msg.to.toLowerCase();
          if (clients.has(target)) {
            clients.get(target).send(JSON.stringify(msg));
          }
        }
      } else {
        // Binary (File) ကို အားလုံးဆီ forward လုပ်ခြင်း (သို့မဟုတ် receiver ဆီတိုက်ရိုက်)
        for (const [id, s] of clients) {
          if (s !== server) {
            s.send(data);
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
