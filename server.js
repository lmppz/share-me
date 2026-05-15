const clients = new Map();

Deno.serve(async (req) => {
  if (req.headers.get("upgrade") !== "websocket") {
    const url = new URL(req.url);
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    try {
      return await fetch(new URL(`.${path}`, import.meta.url));
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  }

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
      
      if (data.type === "check_status") {
        const target = data.targetId.toLowerCase();
        socket.send(JSON.stringify({ 
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
      // Binary Data (File) ကို လူတိုင်းဆီ forward လုပ်ခြင်း
      for (const [id, client] of clients) {
        if (client !== socket && client.readyState === 1) {
          client.send(e.data);
        }
      }
    }
  };

  socket.onclose = () => { if (currentId) clients.delete(currentId); };
  return response;
});
