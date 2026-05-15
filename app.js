let ws;
const wsUrl = "wss://lucimmo-share-me-server.hf.space"; 

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const targetStatus = document.getElementById("targetStatus");
const historyDiv = document.getElementById("history");
const connectBtn = document.getElementById("connectBtn");

let myId = "";

function initWS() {
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => { 
        statusDisplay.textContent = "Status: Server နှင့် ချိတ်ဆက်မိပါပြီ။";
        statusDisplay.style.color = "#38bdf8";
        connectBtn.disabled = false;
    };

    ws.onclose = () => {
        statusDisplay.textContent = "Status: ပြတ်တောက်သွားသည်။ ပြန်ချိတ်နေသည်...";
        statusDisplay.style.color = "#ef4444";
        setTimeout(initWS, 3000); 
    };

    ws.onmessage = async (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `Status: <b style="color:#22c55e">${data.id}</b> Online`;
                usernameInput.disabled = true;
                connectBtn.textContent = "Connected";
                startAutoStatusCheck();
            }
            if (data.type === "status-update") {
                targetStatus.textContent = data.isOnline ? "Online" : "Offline";
                targetStatus.className = data.isOnline ? "online" : "offline";
            }
            if (data.type === "text" && data.from !== myId) {
                addHistory(`From ${data.from}:`, data.content, data.time);
            }
        }
    };
}

function startAutoStatusCheck() {
    setInterval(() => {
        const target = targetIdInput.value.trim();
        if (target && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "check-status", id: target }));
        }
    }, 2000);
}

connectBtn.onclick = () => {
    const val = usernameInput.value.trim();
    if (val && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "register", id: val }));
    }
};

document.getElementById("sendText").onclick = () => {
    const text = textInput.value;
    const target = targetIdInput.value.trim();
    if (text && target) {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text, time: now }));
        textInput.value = "";
        // ပို့လိုက်တဲ့စာကို ကိုယ့်ဘက်မှာလည်း ပြချင်ရင် addHistory ထပ်ခေါ်နိုင်သည်
    }
};

function addHistory(title, content, time) {
    const div = document.createElement("div");
    div.className = "history-item";

    const header = document.createElement("div");
    header.className = "history-header";
    header.textContent = title;

    const pre = document.createElement("pre");
    pre.textContent = content;

    const timeDiv = document.createElement("div");
    timeDiv.className = "msg-time";
    timeDiv.textContent = `🕒 ${time || ""}`;

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    
    // Copy Logic အမှန်
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(content).then(() => {
            copyBtn.textContent = "Copied!";
            copyBtn.style.background = "#22c55e";
            setTimeout(() => {
                copyBtn.textContent = "Copy";
                copyBtn.style.background = "#38bdf8";
            }, 2000);
        }).catch(err => {
            console.error("Copy failed", err);
        });
    };

    div.appendChild(copyBtn);
    div.appendChild(header);
    div.appendChild(pre);
    div.appendChild(timeDiv);
    historyDiv.prepend(div);
}

document.getElementById("clearInput").onclick = () => { textInput.value = ""; };

initWS();
