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
let statusCheckInterval;

function initWS() {
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => { 
        statusDisplay.textContent = "Status: Server နှင့် ချိတ်ဆက်မိပါပြီ။";
        statusDisplay.style.color = "#38bdf8";
        connectBtn.disabled = false;
        
        // Connection ပြတ်သွားပြီး ပြန်ချိတ်မိပါက အလိုအလျောက် ပြန် Register လုပ်ရန်
        if (myId) {
            ws.send(JSON.stringify({ type: "register", id: myId }));
        }
    };

    ws.onclose = () => {
        statusDisplay.textContent = "Status: ပြတ်တောက်သွားသည်။ ပြန်ချိတ်နေသည်...";
        statusDisplay.style.color = "#ef4444";
        setTimeout(initWS, 3000); 
    };

    ws.onmessage = async (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);

            // ၁။ Register အောင်မြင်ခြင်း
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `Status: <b style="color:#22c55e">${data.id}</b> Online`;
                usernameInput.disabled = true;
                connectBtn.textContent = "Connected";
                startAutoStatusCheck();
            }

            // ၂။ တစ်ဖက်လူ Status ပြောင်းလဲမှုကို စစ်ဆေးခြင်း
            if (data.type === "status-update") {
                const currentTarget = targetIdInput.value.trim().toLowerCase();
                if (data.id === currentTarget) {
                    targetStatus.textContent = data.isOnline ? "Online" : "Offline";
                    targetStatus.className = data.isOnline ? "online" : "offline";
                }
            }

            // ၃။ စာသားလက်ခံရရှိခြင်း
            if (data.type === "text") {
                addHistory(`From ${data.from}:`, data.content, data.time);
            }

            // ၄။ ဖိုင်လက်ခံခြင်း Logic (Chunks)
            handleFileMessages(data);
        }
    };
}

// Status ကို ၂ စက္ကန့်တစ်ခါ စစ်ပေးရန်
function startAutoStatusCheck() {
    if (statusCheckInterval) clearInterval(statusCheckInterval);
    statusCheckInterval = setInterval(() => {
        const target = targetIdInput.value.trim();
        if (target && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "check-status", id: target }));
        }
    }, 2000);
}

// Receiver ID ရိုက်နေစဉ်မှာတင် ချက်ချင်း Status စစ်ရန်
targetIdInput.addEventListener("input", () => {
    const target = targetIdInput.value.trim();
    if (!target) {
        targetStatus.textContent = "Offline";
        targetStatus.className = "offline";
        return;
    }
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "check-status", id: target }));
    }
});

connectBtn.onclick = () => {
    const id = usernameInput.value.trim();
    if (!id) return alert("ID တစ်ခုခုအရင်ထည့်ပါ။");
    myId = id;
    if (!ws || ws.readyState !== WebSocket.OPEN) initWS();
    ws.send(JSON.stringify({ type: "register", id: id }));
};

// စာသားပို့ရန်
document.getElementById("sendText").onclick = () => {
    const target = targetIdInput.value.trim();
    const text = textInput.value.trim();
    if (target && text && ws.readyState === WebSocket.OPEN) {
        const now = new Date().toLocaleTimeString();
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text, time: now }));
        addHistory(`To ${target}:`, text, now);
        textInput.value = "";
    }
};

// --- ဖိုင်ပို့ခြင်းနှင့် လက်ခံခြင်း Logic (Chunking) ---
let incomingFileInfo = null;
let receivedChunks = [];

async function handleFileMessages(data) {
    if (data.type === "file-start") {
        incomingFileInfo = data;
        receivedChunks = [];
        addHistory("System:", `Incoming: ${data.fileName} (${(data.fileSize/1024/1024).toFixed(2)} MB)`);
    }
    
    if (data.type === "file-chunk" && incomingFileInfo) {
        receivedChunks.push(data.chunkData);
        if (receivedChunks.length === incomingFileInfo.totalChunks) {
            const blob = b64toBlob(receivedChunks.join(""));
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = incomingFileInfo.fileName;
            a.click();
            addHistory("Success:", `Received ${incomingFileInfo.fileName}`);
            incomingFileInfo = null;
            receivedChunks = [];
        }
    }
}

document.getElementById("sendFile").onclick = async () => {
    const fileInput = document.getElementById("fileInput");
    const target = targetIdInput.value.trim();
    if (!fileInput.files[0] || !target) return alert("ဖိုင်နှင့် Receiver ID ထည့်ပါ။");

    const file = fileInput.files[0];
    const chunkSize = 1024 * 512; // 512KB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    document.getElementById("progressContainer").style.display = "block";
    
    ws.send(JSON.stringify({
        type: "file-start", to: target, from: myId, 
        fileName: file.name, fileSize: file.size, totalChunks: totalChunks
    }));

    for (let i = 0; i < totalChunks; i++) {
        const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
        const reader = new FileReader();
        reader.readAsDataURL(chunk);
        await new Promise(r => reader.onload = r);
        
        ws.send(JSON.stringify({
            type: "file-chunk", to: target, 
            chunkData: reader.result.split(",")[1], chunkIndex: i
        }));

        const percent = Math.round(((i + 1) / totalChunks) * 100);
        document.getElementById("progressBar").style.width = percent + "%";
        document.getElementById("percentDisplay").textContent = percent + "%";
    }
    
    setTimeout(() => { document.getElementById("progressContainer").style.display = "none"; }, 2000);
};

function b64toBlob(b64Data) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let i = 0; i < byteCharacters.length; i += 512) {
        const slice = byteCharacters.slice(i, i + 512);
        const byteNumbers = new Array(slice.length);
        for (let j = 0; j < slice.length; j++) byteNumbers[j] = slice.charCodeAt(j);
        byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays);
}

function addHistory(title, content, time) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<div class="history-header">${title}</div><pre>${content}</pre><div class="msg-time">🕒 ${time || ""}</div>`;
    
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = () => navigator.clipboard.writeText(content).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => copyBtn.textContent = "Copy", 2000);
    });
    
    div.appendChild(copyBtn);
    historyDiv.prepend(div);
}

initWS();
