let ws;
const wsUrl = "wss://lucimmo-share-me-server.hf.space"; 

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const targetStatus = document.getElementById("targetStatus");
const historyDiv = document.getElementById("history");
const fileListDiv = document.getElementById("fileList");

let myId = "";
let heartbeatInterval;

function initWS() {
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => { 
        statusDisplay.textContent = "Server နှင့် ချိတ်ဆက်မိပါပြီ။"; 
        statusDisplay.style.color = "#22c55e";
        startHeartbeat();
    };

    ws.onclose = () => {
        statusDisplay.textContent = "ချိတ်ဆက်မှု ပြတ်တောက်သွားသည်။ ပြန်ချိတ်နေသည်...";
        statusDisplay.style.color = "#ef4444";
        stopHeartbeat();
        setTimeout(initWS, 3000); 
    };

    ws.onmessage = async (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `ID: <b style="color:#22c55e">${data.id}</b> (Online)`;
                usernameInput.disabled = true;
                document.getElementById("connectBtn").disabled = true;
            }

            // တစ်ဖက်လူ Online ရှိမရှိ ပြန်ကြားချက်
            if (data.type === "status-update") {
                if (data.isOnline) {
                    targetStatus.textContent = "Online";
                    targetStatus.className = "online";
                } else {
                    targetStatus.textContent = "Offline";
                    targetStatus.className = "offline";
                }
            }

            if (data.type === "text") {
                addHistory(`From ${data.from}:`, data.content);
            }

            if (data.type === "file-meta") {
                window.incomingFileMeta = data;
            }
        } else {
            handleFileReceive(e.data);
        }
    };
}

// Target ID ရိုက်တဲ့အခါ Online ရှိမရှိ စစ်ရန် (Backend က Support လုပ်ဖို့လိုသည်)
targetIdInput.oninput = () => {
    const target = targetIdInput.value.trim();
    if (target && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "check-status", id: target }));
    }
};

function addHistory(title, content) {
    const div = document.createElement("div");
    div.className = "history-item";
    
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.innerHTML = `<strong>${title}</strong>`;
    
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(content);
        copyBtn.textContent = "Copied!";
        setTimeout(() => copyBtn.textContent = "Copy", 2000);
    };

    const pre = document.createElement("pre");
    pre.textContent = content; // Code Formatting မပျက်အောင် textContent သုံးသည်

    div.appendChild(header);
    div.appendChild(copyBtn);
    div.appendChild(pre);
    historyDiv.prepend(div);
}

document.getElementById("clearInput").onclick = () => { textInput.value = ""; };
document.getElementById("clearHistory").onclick = () => { historyDiv.innerHTML = ""; fileListDiv.innerHTML = ""; };

document.getElementById("connectBtn").onclick = () => {
    const val = usernameInput.value.trim();
    if (val && ws.readyState === 1) ws.send(JSON.stringify({ type: "register", id: val }));
};

document.getElementById("sendText").onclick = () => {
    const text = textInput.value;
    const target = targetIdInput.value.trim();
    if (text && target) {
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text }));
        addHistory(`To ${target}:`, text);
        textInput.value = "";
    }
};

function startHeartbeat() {
    heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, 10000);
}
function stopHeartbeat() { clearInterval(heartbeatInterval); }

initWS();
