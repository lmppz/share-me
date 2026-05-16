const clients = new Map();

export default {
  async fetch(request, env, ctx) {
    // WebSocket Upgrade Request ကို ဖမ်းယူခြင်း
    if (request.headers.get("upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      server.accept();
      let currentId = null;

      server.addEventListener("message", (e) => {
        if (typeof e.data === "string") {
          const data = JSON.parse(e.data);

          // DNS / Network တည်ငြိမ်စေရန် Heartbeat (Ping) ကို တုံ့ပြန်ခြင်း
          if (data.type === "ping") {
            server.send(JSON.stringify({ type: "pong" }));
            return;
          }

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

          if (data.type === "text" || data.type === "file_chunk_meta") {
            const target = data.to.toLowerCase();
            // ပို့မည့်သူ၏ Target ID ကို ဆာဗာတွင် လော့ခ်ချမှတ်သားခြင်း
            if (data.type === "file_chunk_meta") {
              server.currentTargetId = target;
            }
            if (clients.has(target)) {
              clients.get(target).send(e.data);
            }
          }
        } else {
          // ခွဲပို့လိုက်သော ဖိုင်အစိတ်အပိုင်း (Binary Chunk) ကို သတ်မှတ်ထားသည့် Target ID ဆီသို့သာ တိုက်ရိုက်ပို့ခြင်း
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

    // Static assets (HTML, CSS, JS) များကို ပြသပေးခြင်း
    return env.ASSETS.fetch(request);
  }
};
