const clients = new Map();

Deno.serve({ port: 7860 }, async (req) => {
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Share Me Server is Running", { status: 200 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let currentId = null;

  socket.onmessage = (e) => {
    if (typeof e.data === "string") {
      const data = JSON.parse(e.data);
      
      // ID မှတ်ပုံတင်ခြင်း
      if (data.type === "register") {
        currentId = data.id.toLowerCase();
        clients.set(currentId, socket);
        socket.send(JSON.stringify({ type: "registered", id: data.id }));
      }

      // တစ်ဖက်လူ Online ရှိမရှိ စစ်ဆေးခြင်း
      if (data.type === "check-status") {
        const isOnline = clients.has(data.id.toLowerCase());
        socket.send(JSON.stringify({ type: "status-update", isOnline }));
      }

      // စာသားပို့ခြင်း
      if (data.to && clients.has(data.to.toLowerCase())) {
        clients.get(data.to.toLowerCase()).send(e.data);
      }
    } else {
      // ဖိုင်ပို့ခြင်း (Binary)
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
