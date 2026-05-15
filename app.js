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
let statusCheckTimer;

function initWS() {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => { 
        statusDisplay.textContent = "Status: Server နှင့် ချိတ်ဆက်မိပါပြီ။"; 
        statusDisplay.style.color = "#38bdf8";
        connectBtn.disabled = false;
    };
    ws.onclose = () => {
        statusDisplay.textContent = "Status: ချိတ်ဆက်မှုပြတ်တောက်နေသည်။ ပြန်ချိတ်နေသည်...";
        statusDisplay.style.color = "#ef4444";
        setTimeout(initWS, 3000); 
    };
    ws.onmessage = (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `Status: <b style="color:#22c55e">${data.id}</b> ဖြင့် Online ဖြစ်နေသည်။`;
                usernameInput.disabled = true;
                connectBtn.textContent = "Connected";
                startStatusAutoCheck(); // Register ပြီးမှ auto check စမည်
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

// ၁ စက္ကန့်တစ်ခါ တစ်ဖက်လူရှိမရှိ အလိုအလျောက် စစ်ဆေးပေးခြင်း
function startStatusAutoCheck() {
    setInterval(() => {
        const target = targetIdInput.value.trim();
        if (target && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "check-status", id: target }));
        }
    }, 1000);
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
        const now = new Date().toLocaleTimeString();
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text, time: now }));
        textInput.value = "";
        alert("စာသားပေးပို့ပြီးပါပြီ။");
    }
};

function addHistory(title, content, time) {
    const div = document.createElement("div");
    div.className = "history-item";
    const timeSpan = time ? `<span class="msg-time">🕒 ${time}</span>` : "";
    div.innerHTML = `<div><strong>${title}</strong> ${timeSpan}</div><pre>${content}</pre>`;
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(content);
        copyBtn.textContent = "Copied!";
        setTimeout(() => copyBtn.textContent = "Copy", 2000);
    };
    div.prepend(copyBtn);
    historyDiv.prepend(div);
}

document.getElementById("clearInput").onclick = () => { textInput.value = ""; };
document.getElementById("clearHistory").onclick = () => { historyDiv.innerHTML = ""; };

initWS();
