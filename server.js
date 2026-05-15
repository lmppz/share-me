const clients = new Map();

Deno.serve({ port: 7860 }, async (req) => {
  if (req.headers.get("upgrade") !== "websocket") return new Response("Running", { status: 200 });

  const { socket, response } = Deno.upgradeWebSocket(req);
  let currentId = null;

  socket.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      
      // Register လုပ်ခြင်း
      if (data.type === "register") {
        currentId = data.id.trim().toLowerCase();
        clients.set(currentId, socket);
        socket.send(JSON.stringify({ type: "registered", id: data.id }));

        // အရေးကြီး - မိမိ Register လုပ်လိုက်တာနဲ့ တစ်ခြားလူတွေဆီ Online ဖြစ်ကြောင်း အကြောင်းကြားရန်
        for (const [id, client] of clients) {
            if (id !== currentId) {
                client.send(JSON.stringify({ type: "status-update", id: currentId, isOnline: true }));
            }
        }
      }

      // Online Status စစ်ဆေးခြင်း
      if (data.type === "check-status") {
        const target = data.id.trim().toLowerCase();
        socket.send(JSON.stringify({ 
          type: "status-update", 
          id: target, 
          isOnline: clients.has(target) 
        }));
      }

      // Relay Messages & Files
      if (data.to) {
        const target = data.to.trim().toLowerCase();
        if (clients.has(target)) {
          clients.get(target).send(JSON.stringify(data));
        } else if (data.type !== "feedback") {
          socket.send(JSON.stringify({ type: "error", msg: "တစ်ဖက်လူ Offline ဖြစ်သွားပါပြီ" }));
        }
      }
    } catch (err) {
      console.error("Server Error:", err);
    }
  };

  socket.onclose = () => {
    if (currentId) {
        // Offline ဖြစ်သွားကြောင်း အခြားသူများကို အကြောင်းကြားရန်
        for (const [id, client] of clients) {
            if (id !== currentId) {
                client.send(JSON.stringify({ type: "status-update", id: currentId, isOnline: false }));
            }
        }
        clients.delete(currentId);
    }
  };

  return response;
});
