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
        statusDisplay.textContent = "Status: ပြတ်တောက်သွားသည်။ ပြန်ချိတ်နေသည်...";
        statusDisplay.style.color = "#ef4444";
        setTimeout(initWS, 3000); 
    };

    ws.onmessage = async (e) => {
        const data = JSON.parse(e.data);

        // ၁။ Register အောင်မြင်ခြင်း
        if (data.type === "registered") {
            myId = data.id.toLowerCase();
            statusDisplay.innerHTML = `Status: <b style="color:#22c55e">${data.id}</b> Online`;
            usernameInput.disabled = true;
            connectBtn.textContent = "Connected";
        }

        // ၂။ တစ်ဖက်လူ Status ကို Real-time စစ်ဆေးပြီး UI ပိတ်/ဖွင့်လုပ်ခြင်း
        if (data.type === "status-update") {
            const currentTarget = targetIdInput.value.trim().toLowerCase();
            if (data.id === currentTarget) {
                isTargetOnline = data.isOnline;
                targetStatus.textContent = isTargetOnline ? "Online" : "Offline";
                targetStatus.className = isTargetOnline ? "online" : "offline";
                
                // Offline ဖြစ်နေရင် ခလုတ်တွေနှိပ်လို့မရအောင် ပိတ်ထားမည်
                sendTextBtn.disabled = !isTargetOnline;
                sendFileBtn.disabled = !isTargetOnline;
            }
        }

        // ၃။ Real-time Feedback လက်ခံခြင်း (Sender ဘက်မှ မြင်ရမည့်အချက်များ)
        if (data.type === "feedback") {
            addHistory("Tracking:", data.msg, new Date().toLocaleTimeString());
        }

        // ၄။ စာသားလက်ခံရရှိခြင်း
        if (data.type === "text") {
            addHistory(`From ${data.from}:`, data.content, data.time);
        }

        // ၅။ ဖိုင်လက်ခံခြင်း (Chunking စနစ်)
        handleFileMessages(data);
    };
}

// Receiver ID ရိုက်နေစဉ် Status အမြဲစစ်နေရန်
targetIdInput.addEventListener("input", () => {
    const target = targetIdInput.value.trim();
    if (!target) {
        targetStatus.textContent = "Offline";
        targetStatus.className = "offline";
        sendTextBtn.disabled = true;
        sendFileBtn.disabled = true;
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

// စာသားပို့ခြင်း
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

// ဖိုင်လက်ခံခြင်း Logic
async function handleFileMessages(data) {
    if (data.type === "file-start") {
        incomingInfo = data;
        incomingChunks = [];
        addHistory("System:", `Incoming file: ${data.fileName}`);
        // Sender ဆီကို ဖိုင်စလက်ခံနေပြီဖြစ်ကြောင်း Feedback ပို့မည်
        ws.send(JSON.stringify({ type: "feedback", to: data.from, msg: `တစ်ဖက်လူဆီ ဖိုင်ရောက်ရှိနေပါပြီ...` }));
    }
    
    if (data.type === "file-chunk" && incomingInfo) {
        incomingChunks.push(data.chunk);
        if (incomingChunks.length === incomingInfo.total) {
            // Sender ဆီကို Download ဆွဲနေပြီဖြစ်ကြောင်း Feedback ပို့မည်
            ws.send(JSON.stringify({ type: "feedback", to: incomingInfo.from, msg: `တစ်ဖက်လူ ဖိုင်လက်ခံရရှိပြီး Download လုပ်နေပါပြီ။` }));
            
            const blob = new Blob(incomingChunks.map(c => Uint8Array.from(atob(c), c => c.charCodeAt(0))));
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = incomingInfo.fileName;
            a.click();
            
            ws.send(JSON.stringify({ type: "feedback", to: incomingInfo.from, msg: `✅ ဖိုင်ကို Download လုပ်ပြီးသွားပါပြီ။` }));
            incomingInfo = null;
            incomingChunks = [];
        }
    }
}

// 500MB Support ဖိုင်ပို့ခြင်း Logic
sendFileBtn.onclick = async () => {
    const fileInput = document.getElementById("fileInput");
    const target = targetIdInput.value.trim();
    const file = fileInput.files[0];

    if (!file || !isTargetOnline) return alert("ဖိုင်ရွေးပါ (သို့) တစ်ဖက်လူ Offline ဖြစ်နေသည်။");

    const CHUNK_SIZE = 1024 * 512; // 512KB chunks
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
    
    addHistory("System:", `ဖိုင်ပို့ဆောင်မှု ပြီးမြောက်သည်။ လက်ခံသူကို စောင့်ဆိုင်းနေသည်...`);
    setTimeout(() => { document.getElementById("progressContainer").style.display = "none"; }, 3000);
};

function addHistory(title, content, time) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<div class="history-header">${title}</div><pre>${content}</pre><div class="msg-time">🕒 ${time || ""}</div>`;
    historyDiv.prepend(div);
}

initWS();
