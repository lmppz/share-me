const clients = new Map();

Deno.serve({ port: 7860 }, async (req) => {
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Share-Me Server is Running", { status: 200 });
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

        // မိမိ Online ဖြစ်လာကြောင်း တခြားသူအားလုံးကို အသိပေးခြင်း
        clients.forEach((client, id) => {
          if (id !== currentId) {
            client.send(JSON.stringify({ type: "status-update", id: currentId, isOnline: true }));
          }
        });
      }

      // ၂။ Online Status စစ်ဆေးခြင်း (Client က တောင်းဆိုသည့်အခါ)
      if (data.type === "check-status") {
        const target = data.id.trim().toLowerCase();
        socket.send(JSON.stringify({ 
          type: "status-update", 
          id: target, 
          isOnline: clients.has(target) 
        }));
      }

      // ၃။ Message & Files များကို တစ်ဆင့်ပို့ပေးခြင်း (Relay)
      if (data.to) {
        const target = data.to.trim().toLowerCase();
        if (clients.has(target)) {
          clients.get(target).send(JSON.stringify(data));
        } else {
          socket.send(JSON.stringify({ type: "status-update", id: target, isOnline: false }));
        }
      }
    } catch (err) {
      console.error("Server Error:", err);
    }
  };

  socket.onclose = () => {
    if (currentId) {
      clients.delete(currentId);
      // မိမိ Offline ဖြစ်သွားကြောင်း တခြားသူအားလုံးကို အသိပေးခြင်း
      clients.forEach((client, id) => {
        client.send(JSON.stringify({ type: "status-update", id: currentId, isOnline: false }));
      });
    }
  };

  return response;
});
