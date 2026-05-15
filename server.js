const clients = new Map();

Deno.serve({ port: 7860 }, async (req) => {
  if (req.headers.get("upgrade") !== "websocket") return new Response("Running", { status: 200 });

  const { socket, response } = Deno.upgradeWebSocket(req);
  let currentId = null;

  socket.onmessage = (e) => {
    if (typeof e.data === "string") {
      const data = JSON.parse(e.data);
      
      if (data.type === "register") {
        currentId = data.id.trim().toLowerCase(); // ID ကို lowercase ပြောင်းသိမ်းမည်
        clients.set(currentId, socket);
        socket.send(JSON.stringify({ type: "registered", id: data.id }));
      }

      if (data.type === "check-status") {
        const target = data.id.trim().toLowerCase();
        const isOnline = clients.has(target);
        socket.send(JSON.stringify({ type: "status-update", isOnline }));
      }

      if (data.to) {
        const target = data.to.trim().toLowerCase();
        if (clients.has(target)) {
          clients.get(target).send(e.data);
        }
      }
    } else {
      // File ပို့သည့်အခါ အားလုံးဆီမရောက်စေဘဲ သတ်မှတ်ထားသူဆီပဲ ပို့မည်ဆိုလျှင် logic ထပ်ပြင်ရပါမည်
      // အခုလောလောဆယ် Relay mode အတိုင်းပဲ ထားထားပါတယ်
      for (const [id, client] of clients) {
        if (client !== socket && client.readyState === 1) client.send(e.data);
      }
    }
  };

  socket.onclose = () => { if (currentId) clients.delete(currentId); };
  return response;
});
