const clients = new Map();

Deno.serve({ port: 7860 }, async (req) => {
  if (req.headers.get("upgrade") !== "websocket") return new Response("Running", { status: 200 });

  const { socket, response } = Deno.upgradeWebSocket(req);
  let currentId = null;

  socket.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      
      // မိမိ ID ကို မှတ်ပုံတင်ခြင်း
      if (data.type === "register") {
        currentId = data.id.trim().toLowerCase();
        clients.set(currentId, socket);
        socket.send(JSON.stringify({ type: "registered", id: data.id }));
      }

      // တစ်ဖက်လူ ရှိမရှိ စစ်ဆေးခြင်း
      if (data.type === "check-status") {
        const target = data.id.trim().toLowerCase();
        socket.send(JSON.stringify({ 
          type: "status-update", 
          id: target, 
          isOnline: clients.has(target) 
        }));
      }

      // စာသားနှင့် ဖိုင်များ ပေးပို့ခြင်း (Offline ဖြစ်နေရင် Error ပြန်ပို့မည်)
      if (data.to) {
        const target = data.to.trim().toLowerCase();
        if (clients.has(target)) {
          clients.get(target).send(JSON.stringify(data));
        } else if (data.type !== "check-status" && data.type !== "feedback") {
          socket.send(JSON.stringify({ type: "error", msg: "Target is Offline" }));
        }
      }
    } catch (err) {
      console.error("Server Error:", err);
    }
  };

  socket.onclose = () => {
    if (currentId) clients.delete(currentId);
  };

  return response;
});
