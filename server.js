const clients = new Map();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // WebSocket Upgrade Request ကို စစ်ဆေးခြင်း
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
            if (clients.has(target)) {
              clients.get(target).send(e.data);
            }
          }
        } else {
          // ပြင်ဆင်လိုက်သည့်နေရာ: File ကို လူတိုင်းဆီ မပို့တော့ဘဲ သတ်မှတ်ထားတဲ့ Target ဆီပဲ ပို့ပေးခြင်း
          // file_meta ပို့ထားတဲ့ target ရဲ့ WebSocket ကို ရှာပြီး ပို့ပေးပါတယ်
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

    // Static Files (HTML, CSS, JS) များကို assets directory ထဲမှ ရှာဖွေဖတ်ရှုခြင်း
    return env.ASSETS.fetch(request);
  }
};
