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
  let targetForBinary = null;

  socket.onmessage = (e) => {
    if (typeof e.data === "string") {
      const data = JSON.parse(e.data);
      
      // User မှတ်ပုံတင်ခြင်း
      if (data.type === "register") {
        currentId = data.id.toLowerCase();
        clients.set(currentId, socket);
        socket.send(JSON.stringify({ type: "registered", id: data.id }));
      }
      
      // စာသားပို့ခြင်း
      if (data.type === "text") {
        const target = data.to.toLowerCase();
        if (clients.has(target)) {
          clients.get(target).send(JSON.stringify(data));
        }
      }

      // ဖိုင်ပို့ရန် Target သတ်မှတ်ခြင်း
      if (data.type === "file_meta") {
        targetForBinary = data.to.toLowerCase();
        if (clients.has(targetForBinary)) {
          clients.get(targetForBinary).send(JSON.stringify(data));
        }
      }
    } else {
      // Binary (File) ကို သတ်မှတ်ထားသော Target တစ်ဦးတည်းထံ ပို့ခြင်း
      if (targetForBinary && clients.has(targetForBinary)) {
        clients.get(targetForBinary).send(e.data);
      }
    }
  };

  socket.onclose = () => { if (currentId) clients.delete(currentId); };
  return response;
});
