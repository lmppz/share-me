const clients = new Map();

Deno.serve({ port: 7860 }, async (req) => {
  if (req.headers.get("upgrade") !== "websocket") return new Response("Running", { status: 200 });

  const { socket, response } = Deno.upgradeWebSocket(req);
  let currentId = null;

  socket.onmessage = (e) => {
    try {
      if (typeof e.data === "string") {
        const data = JSON.parse(e.data);
        
        // Register လုပ်ခြင်း
        if (data.type === "register") {
          currentId = data.id.trim().toLowerCase();
          clients.set(currentId, socket);
          socket.send(JSON.stringify({ type: "registered", id: data.id }));
        }

        // Online ရှိမရှိ စစ်ဆေးခြင်း
        if (data.type === "check-status") {
          const target = data.id.trim().toLowerCase();
          const isOnline = clients.has(target);
          socket.send(JSON.stringify({ type: "status-update", isOnline: isOnline }));
        }

        // စာသားပေးပို့ခြင်း
        if (data.to) {
          const target = data.to.trim().toLowerCase();
          if (clients.has(target)) {
            clients.get(target).send(JSON.stringify(data));
          }
        }
      } else {
        // Binary relay (Files)
        for (const [id, client] of clients) {
          if (client !== socket && client.readyState === 1) client.send(e.data);
        }
      }
    } catch (err) {
      console.error("Error processing message:", err);
    }
  };

  socket.onclose = () => { if (currentId) clients.delete(currentId); };
  return response;
});
