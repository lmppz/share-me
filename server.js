const clients = new Map();

Deno.serve({ port: 7860 }, (req) => {
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Share-Me Backend Running", { status: 200 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let currentId = null;

  socket.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);

      // ၁။ Register လုပ်ခြင်း
      if (data.type === "register") {
        currentId = data.id.trim().toLowerCase();
        clients.set(currentId, socket);
        socket.send(JSON.stringify({ type: "registered", id: data.id }));

        // ကိုယ် online တက်လာတာကို တခြားသူတွေ သိအောင် အကြောင်းကြားမယ်
        clients.forEach((client, id) => {
          if (id !== currentId) {
            client.send(JSON.stringify({ type: "status-update", id: currentId, isOnline: true }));
          }
        });
      }

      // ၂။ Status စစ်ဆေးခြင်း
      if (data.type === "check-status") {
        const target = data.id.trim().toLowerCase();
        socket.send(JSON.stringify({ 
          type: "status-update", 
          id: target, 
          isOnline: clients.has(target) 
        }));
      }

      // ၃။ Message ပို့ခြင်း
      if (data.to) {
        const target = data.to.trim().toLowerCase();
        if (clients.has(target)) {
          clients.get(target).send(JSON.stringify(data));
        }
      }
    } catch (err) {
      console.log("Error handling message:", err);
    }
  };

  socket.onclose = () => {
    if (currentId) {
      clients.delete(currentId);
      // ကိုယ်ထွက်သွားတာကို တခြားသူတွေကို အကြောင်းကြားမယ်
      clients.forEach((client, id) => {
        client.send(JSON.stringify({ type: "status-update", id: currentId, isOnline: false }));
      });
    }
  };

  return response;
});
