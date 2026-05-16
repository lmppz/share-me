const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();

// Static Files (HTML, CSS, JS) များကို ပြသရန်
app.use(express.static(path.join(__dirname, '.')));

wss.on('connection', (socket) => {
    let currentId = null;

    socket.on('message', (message, isBinary) => {
        if (!isBinary) {
            try {
                const data = JSON.parse(message.toString());

                // DNS / Firewall ကြောင့် လိုင်းမပြတ်စေရန် Heartbeat (Ping) တုံ့ပြန်ခြင်း
                if (data.type === "ping") {
                    socket.send(JSON.stringify({ type: "pong" }));
                    return;
                }

                // ID မှတ်ပုံတင်ခြင်း
                if (data.type === "register") {
                    currentId = data.id.toLowerCase();
                    clients.set(currentId, socket);
                    socket.send(JSON.stringify({ type: "registered", id: data.id }));
                }

                // ပို့မည့်သူ Online ရှိ/မရှိ စစ်ဆေးခြင်း
                if (data.type === "check_status") {
                    const target = data.targetId.toLowerCase();
                    socket.send(JSON.stringify({
                        type: "status_update",
                        targetId: data.targetId,
                        status: clients.has(target) ? "online" : "offline"
                    }));
                }

                // စာသား သို့မဟုတ် ဖိုင်အချက်အလက် ပို့ခြင်း
                if (data.type === "text" || data.type === "file_chunk_meta") {
                    const target = data.to.toLowerCase();
                    if (data.type === "file_chunk_meta") {
                        socket.currentTargetId = target;
                    }
                    if (clients.has(target)) {
                        clients.get(target).send(message.toString());
                    }
                }
            } catch (e) {
                console.error("JSON Error:", e);
            }
        } else {
            // ၁၅၀ MB အထိ ဖိုင်အစိတ်အပိုင်း (Binary Chunk) များကို သတ်မှတ်ထားသည့် Target ID ဆီ တိုက်ရိုက် ပို့ပေးခြင်း
            if (socket.currentTargetId && clients.has(socket.currentTargetId)) {
                const targetSocket = clients.get(socket.currentTargetId);
                if (targetSocket.readyState === WebSocket.OPEN) {
                    targetSocket.send(message, { binary: true });
                }
            }
        }
    });

    socket.on('close', () => {
        if (currentId) {
            clients.delete(currentId);
        }
    });
});

// Hosting များပေါ်တွင် အဆင်ပြေပြေ အလုပ်လုပ်နိုင်ရန် Port သတ်မှတ်ခြင်း
const PORT = process.env.PORT || 7860;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
