let ws;
const wsUrl = "wss://lucimmo-share-me-server.hf.space"; 

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const targetStatus = document.getElementById("targetStatus");
const historyDiv = document.getElementById("history");
const connectBtn = document.getElementById("connectBtn");
const sendTextBtn = document.getElementById("sendText");
const sendFileBtn = document.getElementById("sendFile");

let myId = "";
let isTargetOnline = false;
let incomingChunks = [];
let incomingInfo = null;

function initWS() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => { 
        statusDisplay.textContent = "Status: Server နှင့် ချိတ်ဆက်မိပါပြီ။";
        statusDisplay.style.color = "#38bdf8";
        if (myId) ws.send(JSON.stringify({ type: "register", id: myId }));
    };

    ws.onclose = () => {
        statusDisplay.textContent = "Status: Connection ပြတ်သွားသည်။ ပြန်ချိတ်နေသည်...";
        statusDisplay.style.color = "#ef4444";
        setTimeout(initWS, 3000); 
    };

    ws.onmessage = async (e) => {
        const data = JSON.parse(e.data);

        if (data.type === "registered") {
            myId = data.id.toLowerCase();
            statusDisplay.innerHTML = `Status: <b style="color:#22c55e">${data.id}</b> Online`;
            usernameInput.disabled = true;
            connectBtn.textContent = "Connected";
        }

        // တစ်ဖက်လူ Status Update ကို လက်ခံခြင်း
        if (data.type === "status-update") {
            const currentTarget = targetIdInput.value.trim().toLowerCase();
            if (data.id === currentTarget) {
                isTargetOnline = data.isOnline;
                updateStatusUI(isTargetOnline);
            }
        }

        // Real-time Tracking (Feedback)
        if (data.type === "feedback") {
            addHistory("System Tracking:", `<span style="color:#22c55e">${data.msg}</span>`, new Date().toLocaleTimeString());
        }

        if (data.type === "text") {
            addHistory(`From ${data.from}:`, data.content, data.time);
        }

        if (data.type === "error") {
            addHistory("Alert:", data.msg, "");
        }

        handleFileMessages(data);
    };
}

function updateStatusUI(online) {
    targetStatus.textContent = online ? "Online" : "Offline";
    targetStatus.className = online ? "online" : "offline";
    sendTextBtn.disabled = !online;
    sendFileBtn.disabled = !online;
}

// Receiver ID ရိုက်နေစဉ် Status ကို စစ်ဆေးရန်
targetIdInput.addEventListener("input", () => {
    const target = targetIdInput.value.trim();
    if (!target) {
        updateStatusUI(false);
        return;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "check-status", id: target }));
    }
});

connectBtn.onclick = () => {
    const id = usernameInput.value.trim();
    if (!id) return alert("ID အရင်ထည့်ပါ။");
    myId = id;
    if (!ws || ws.readyState !== WebSocket.OPEN) initWS();
    else ws.send(JSON.stringify({ type: "register", id: id }));
};

sendTextBtn.onclick = () => {
    const target = targetIdInput.value.trim();
    const text = textInput.value.trim();
    if (isTargetOnline && text) {
        const now = new Date().toLocaleTimeString();
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text, time: now }));
        addHistory(`To ${target}:`, text, now);
        textInput.value = "";
    }
};

async function handleFileMessages(data) {
    if (data.type === "file-start") {
        incomingInfo = data;
        incomingChunks = [];
        addHistory("File System:", `ဖိုင်စလက်ခံနေပြီ: ${data.fileName}`);
        ws.send(JSON.stringify({ type: "feedback", to: data.from, msg: `တစ်ဖက်လူဆီ ဖိုင်စတင်ရောက်ရှိနေပါပြီ...` }));
    }
    
    if (data.type === "file-chunk" && incomingInfo) {
        incomingChunks.push(data.chunk);
        if (incomingChunks.length === incomingInfo.total) {
            ws.send(JSON.stringify({ type: "feedback", to: incomingInfo.from, msg: `ဖိုင်ရောက်ရှိသွားပါပြီ။ တစ်ဖက်လူ Download ပြုလုပ်နေသည်...` }));
            
            const blob = new Blob(incomingChunks.map(c => Uint8Array.from(atob(c), char => char.charCodeAt(0))));
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = incomingInfo.fileName;
            a.click();
            
            ws.send(JSON.stringify({ type: "feedback", to: incomingInfo.from, msg: `✅ Download ပြီးဆုံးပါပြီ။` }));
            incomingInfo = null;
            incomingChunks = [];
        }
    }
}

sendFileBtn.onclick = async () => {
    const fileInput = document.getElementById("fileInput");
    const target = targetIdInput.value.trim();
    const file = fileInput.files[0];

    if (!file || !isTargetOnline) return alert("ဖိုင်ရွေးပါ (သို့) Receiver Offline ဖြစ်နေသည်။");

    const CHUNK_SIZE = 1024 * 512; 
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    document.getElementById("progressContainer").style.display = "block";
    
    ws.send(JSON.stringify({
        type: "file-start", from: myId, to: target, 
        fileName: file.name, total: totalChunks 
    }));

    for (let i = 0; i < totalChunks; i++) {
        const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const base64 = await new Promise(r => {
            const reader = new FileReader();
            reader.onload = () => r(reader.result.split(',')[1]);
            reader.readAsDataURL(chunk);
        });

        ws.send(JSON.stringify({ type: "file-chunk", to: target, chunk: base64 }));

        const percent = Math.round(((i + 1) / totalChunks) * 100);
        document.getElementById("progressBar").style.width = percent + "%";
        document.getElementById("percentDisplay").textContent = percent + "%";
    }
    
    addHistory("System:", `ဖိုင်ပို့ဆောင်မှု ပြီးဆုံးသည်။ တစ်ဖက်လူ Download လုပ်ရန် စောင့်နေသည်...`);
    setTimeout(() => { document.getElementById("progressContainer").style.display = "none"; }, 3000);
};

function addHistory(title, content, time) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<div class="history-header">${title}</div><pre>${content}</pre><div class="msg-time">🕒 ${time || ""}</div>`;
    historyDiv.prepend(div);
}

initWS();
