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
    ws.onmessage = (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `Status: <b style="color:#22c55e">${data.id}</b> ဖြင့် Online ဖြစ်နေသည်။`;
                usernameInput.disabled = true;
                connectBtn.textContent = "Connected";
                startStatusAutoCheck();
            }
            if (data.type === "status-update") {
                // တစ်ဖက်လူ Online ရှိမရှိကို အရောင်ဖြင့် ခွဲခြားပြသခြင်း
                if (data.isOnline) {
                    targetStatus.textContent = "Online";
                    targetStatus.className = "online";
                } else {
                    targetStatus.textContent = "Offline";
                    targetStatus.className = "offline";
                }
            }
            if (data.type === "text" && data.from !== myId) {
                addHistory(`From ${data.from}:`, data.content, data.time);
            }
        }
    };
}

// တစ်ဖက်လူကို စစ်ဆေးတဲ့နေရာမှာ error မရှိအောင် ၁ စက္ကန့်တစ်ခါ တောင်းဆိုခြင်း
function startStatusAutoCheck() {
    setInterval(() => {
        const target = targetIdInput.value.trim();
        if (target && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "check-status", id: target }));
        } else if (!target) {
            targetStatus.textContent = "Offline";
            targetStatus.className = "offline";
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
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text, time: now }));
        textInput.value = "";
        alert("စာသားပေးပို့ပြီးပါပြီ။");
    }
};

function addHistory(title, content, time) {
    const div = document.createElement("div");
    div.className = "history-item";
    
    // Header
    const header = document.createElement("div");
    header.className = "history-header";
    header.innerHTML = `<strong>${title}</strong>`;
    
    // Content (Code design မပြောင်းစေရန် textContent သုံးသည်)
    const pre = document.createElement("pre");
    pre.textContent = content;
    
    // Time (အောက်ခြေသို့ ပို့ထားသည်)
    const timeDiv = document.createElement("div");
    timeDiv.className = "msg-time";
    timeDiv.textContent = `🕒 ${time || ""}`;
    
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(content);
        copyBtn.textContent = "Copied!";
        setTimeout(() => copyBtn.textContent = "Copy", 2000);
    };

    div.appendChild(copyBtn);
    div.appendChild(header);
    div.appendChild(pre);
    div.appendChild(timeDiv);
    historyDiv.prepend(div);
}

document.getElementById("clearInput").onclick = () => { textInput.value = ""; };
document.getElementById("clearHistory").onclick = () => { if(confirm("History အားလုံး ဖျက်မလား?")) historyDiv.innerHTML = ""; };

initWS();
