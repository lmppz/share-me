let ws;
const wsUrl = "wss://lucimmo-share-me-server.hf.space"; 

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const targetStatus = document.getElementById("targetStatus");
const historyDiv = document.getElementById("history");
const fileListDiv = document.getElementById("fileList");
const connectBtn = document.getElementById("connectBtn");

let myId = "";
let heartbeatInterval;

function initWS() {
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => { 
        statusDisplay.textContent = "Status: Server နှင့် ချိတ်ဆက်မိပါပြီ။ ID ရိုက်ထည့်ပြီး Connect နှိပ်ပါ။"; 
        statusDisplay.style.color = "#38bdf8";
        // WebSocket အဆင်သင့်ဖြစ်မှ ခလုတ်ကို အသက်သွင်းမည်
        connectBtn.disabled = false;
        startHeartbeat();
    };

    ws.onclose = () => {
        statusDisplay.textContent = "Status: ချိတ်ဆက်မှုပြတ်တောက်နေသည်။ ပြန်ချိတ်နေသည်...";
        statusDisplay.style.color = "#ef4444";
        connectBtn.disabled = true;
        stopHeartbeat();
        setTimeout(initWS, 3000); 
    };

    ws.onmessage = async (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `Status: ID <b style="color:#22c55e">${data.id}</b> ဖြင့် Online ဖြစ်နေပါပြီ။`;
                usernameInput.disabled = true;
                connectBtn.textContent = "Connected";
                connectBtn.style.background = "#475569";
            }
            if (data.type === "status-update") {
                targetStatus.textContent = data.isOnline ? "Online" : "Offline";
                targetStatus.className = data.isOnline ? "online" : "offline";
            }
            if (data.type === "text" && data.from !== myId) {
                addHistory(`From ${data.from}:`, data.content);
            }
        }
    };
}

// ခလုတ်နှိပ်လိုက်ရင် animation ပိုသိသာစေရန် logic
function playClickEffect(btn) {
    btn.style.transform = "scale(0.9)";
    setTimeout(() => { btn.style.transform = "scale(1)"; }, 100);
}

connectBtn.onclick = () => {
    playClickEffect(connectBtn);
    const val = usernameInput.value.trim();
    if (val && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "register", id: val }));
    } else if (!val) {
        alert("ID အမည် အရင်ရိုက်ထည့်ပါ!");
    }
};

targetIdInput.addEventListener('input', () => {
    const target = targetIdInput.value.trim();
    if (target && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "check-status", id: target }));
    }
});

document.getElementById("sendText").onclick = function() {
    playClickEffect(this);
    const text = textInput.value;
    const target = targetIdInput.value.trim();
    if (text && target) {
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text }));
        textInput.value = "";
        alert("စာသားပေးပို့ပြီးပါပြီ။");
    }
};

document.getElementById("clearInput").onclick = function() { 
    playClickEffect(this);
    textInput.value = ""; 
};

document.getElementById("clearHistory").onclick = function() { 
    playClickEffect(this);
    if(confirm("History အားလုံးကို ဖျက်မှာ သေချာပါသလား?")) {
        historyDiv.innerHTML = ""; 
        fileListDiv.innerHTML = ""; 
    }
};

function addHistory(title, content) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>${title}</strong><pre>${content}</pre>`;
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

function startHeartbeat() {
    heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, 10000);
}
function stopHeartbeat() { clearInterval(heartbeatInterval); }

// စတင်ချိန်မှာ connect ခလုတ်ကို ပိတ်ထားပြီး server ချိတ်မိမှ ဖွင့်မည်
connectBtn.disabled = true;
initWS();
