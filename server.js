const clients = new Map();

Deno.serve({ port: 7860 }, async (req) => {
  if (req.headers.get("upgrade") !== "websocket") return new Response("Running", { status: 200 });

  const { socket, response } = Deno.upgradeWebSocket(req);
  let currentId = null;

  socket.onmessage = (e) => {
    if (typeof e.data === "string") {
      const data = JSON.parse(e.data);
      if (data.type === "register") {
        currentId = data.id.trim().toLowerCase();
        clients.set(currentId, socket);
        socket.send(JSON.stringify({ type: "registered", id: data.id }));
      }
      if (data.type === "check-status") {
        socket.send(JSON.stringify({ type: "status-update", isOnline: clients.has(data.id.trim().toLowerCase()) }));
      }
      if (data.to && clients.has(data.to.trim().toLowerCase())) {
        clients.get(data.to.trim().toLowerCase()).send(e.data);
      }
    } else {
      for (const [id, client] of clients) {
        if (client !== socket && client.readyState === 1) client.send(e.data);
      }
    }
  };

  socket.onclose = () => { if (currentId) clients.delete(currentId); };
  return response;
});
