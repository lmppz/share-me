const WebSocket = require('ws');
const http = require('http');

// Server တည်ဆောက်ခြင်း
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Share-Me Server is running");
});

const wss = new WebSocket.Server({ server });
const clients = new Map();

wss.on('connection', (ws) => {
    let currentId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // ၁။ Register လုပ်ခြင်း
            if (data.type === "register") {
                currentId = data.id.trim().toLowerCase();
                clients.set(currentId, ws);
                
                // Register အောင်မြင်ကြောင်း ပြန်ပြောမယ်
                ws.send(JSON.stringify({ type: "registered", id: data.id }));

                // ကိုယ် Online တက်လာတာကို တခြားသူတွေ သိအောင် အကြောင်းကြားမယ်
                clients.forEach((client, id) => {
                    if (id !== currentId && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: "status-update", id: currentId, isOnline: true }));
                    }
                });
            }

            // ၂။ Status စစ်ဆေးခြင်း
            if (data.type === "check-status") {
                const target = data.id.trim().toLowerCase();
                ws.send(JSON.stringify({ 
                    type: "status-update", 
                    id: target, 
                    isOnline: clients.has(target) 
                }));
            }

            // ၃။ Message & Files ပို့ခြင်း (Relay)
            if (data.to) {
                const target = data.to.trim().toLowerCase();
                if (clients.has(target)) {
                    clients.get(target).send(JSON.stringify(data));
                }
            }

        } catch (err) {
            console.error("Error:", err);
        }
    });

    ws.on('close', () => {
        if (currentId) {
            clients.delete(currentId);
            // Offline ဖြစ်သွားကြောင်း အားလုံးကို အသိပေးမယ်
            clients.forEach((client, id) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: "status-update", id: currentId, isOnline: false }));
                }
            });
        }
    });
});

// Port 7860 မှာ run ပါမယ် (Hugging Face standard)
server.listen(7860, () => {
    console.log("Server is listening on port 7860");
});
