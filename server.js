const clients = new Map();

export default {
  async fetch(request, env, ctx) {
    // WebSocket ချိတ်ဆက်မှု တောင်းဆိုချက်ကို စစ်ဆေးခြင်း
    if (request.headers.get("upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      server.accept();
      let currentId = null;

      server.addEventListener("message", (e) => {
        if (typeof e.data === "string") {
          const data = JSON.parse(e.data);

          if (data.type === "register") {
            currentId = data.id.toLowerCase();
            clients.set(currentId, server);
            server.send(JSON.stringify({ type: "registered", id: data.id }));
          }

          if (data.type === "check_status") {
            const target = data.targetId.toLowerCase();
            server.send(JSON.stringify({
              type: "status_update",
              targetId: data.targetId,
              status: clients.has(target) ? "online" : "offline"
            }));
          }

          if (data.type === "text" || data.type === "file_meta") {
            const target = data.to.toLowerCase();
            if (data.type === "file_meta") {
              server.currentTargetId = target;
            }
            if (clients.has(target)) {
              clients.get(target).send(e.data);
            }
          }
        } else {
          // Binary File ဒေတာများကို သတ်မှတ်ထားသည့် Target ID ဆီသို့သာ တိုက်ရိုက်ပို့ခြင်း
          if (server.currentTargetId && clients.has(server.currentTargetId)) {
            const targetSocket = clients.get(server.currentTargetId);
            if (targetSocket.readyState === 1) {
              targetSocket.send(e.data);
            }
          }
        }
      });

      server.addEventListener("close", () => {
        if (currentId) {
          clients.delete(currentId);
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // အခြား Request များကို Static Assets (HTML, CSS, JS) ဖိုင်များအဖြစ် Cloudflare မှ ပြသပေးခြင်း
    return env.ASSETS.fetch(request);
  }
};
