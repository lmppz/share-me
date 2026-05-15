const clients = new Map();

Deno.serve({ port: 7860 }, async (req) => {
  if (req.headers.get("upgrade") !== "websocket") return new Response("Running", { status: 200 });

  const { socket, response } = Deno.upgradeWebSocket(req);
  let currentId = null;

  socket.onmessage = (e) => {
    if (typeof e.data === "string") {
      const data = JSON.parse(e.data);
      
      if (data.type === "register") {
        currentId = data.id.toLowerCase();
        clients.set(currentId, socket);
        socket.send(JSON.stringify({ type: "registered", id: data.id }));
      }

      // Online Status စစ်ဆေးခြင်း
      if (data.type === "check-status") {
        const isOnline = clients.has(data.id.toLowerCase());
        socket.send(JSON.stringify({ type: "status-update", isOnline }));
      }

      if (data.to && clients.has(data.to.toLowerCase())) {
        clients.get(data.to.toLowerCase()).send(e.data);
      }
    }
  };

  socket.onclose = () => { if (currentId) clients.delete(currentId); };
  return response;
});
