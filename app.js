let ws;
// အရေးကြီးသည်- Hugging Face URL ကို wss:// ဖြင့် တိုက်ရိုက်သတ်မှတ်ပါ
const wsUrl = "wss://lucimmo-share-me-server.hf.space"; 

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const historyDiv = document.getElementById("history");
const fileListDiv = document.getElementById("fileList");

let myId = "";
let heartbeatInterval;

function initWS() {
    // WebSocket စတင်ချိတ်ဆက်ခြင်း
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => { 
        statusDisplay.textContent = "Server နှင့် ချိတ်ဆက်မိပါပြီ။"; 
        statusDisplay.style.color = "#22c55e";
        
        // ချိတ်ဆက်မှုမပြတ်တောက်စေရန် Heartbeat စနစ်စတင်ခြင်း (၁၀ စက္ကန့်တစ်ခါ)
        startHeartbeat();
    };

    ws.onclose = () => {
        statusDisplay.textContent = "ချိတ်ဆက်မှု ပြတ်တောက်သွားသည်။ ပြန်ချိတ်နေသည်...";
        statusDisplay.style.color = "#ef4444";
        stopHeartbeat();
        setTimeout(initWS, 3000); // ၃ စက္ကန့်အကြာတွင် ပြန်ချိတ်မည်
    };

    ws.onerror = (err) => {
        console.error("WebSocket Error: ", err);
    };

    ws.onmessage = async (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            
            // Server က ပို့တဲ့ Ping ကို ပြန်တုံ့ပြန်စရာမလိုပါ (သို့မဟုတ် log ထုတ်ကြည့်နိုင်သည်)
            if (data.type === "pong") return;

            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `ID: <b style="color:#22c55e">${data.id}</b> (Online)`;
                usernameInput.disabled = true;
                document.getElementById("connectBtn").disabled = true;
            }
            if (data.type === "text") {
                addHistory(`From ${data.from}:`, data.content);
            }
            if (data.type === "file-meta") {
                window.incomingFileMeta = data;
            }
        } else {
            // ဖိုင်လက်ခံရရှိခြင်း
            if (window.incomingFileMeta) {
                const blob = new Blob([e.data], { type: window.incomingFileMeta.fileType });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = window.incomingFileMeta.fileName;
                a.className = "download-btn";
                a.innerHTML = `<span>⬇️ Download: ${window.incomingFileMeta.fileName}</span>`;
                fileListDiv.prepend(a);
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
            }
        }
    };
}

// Heartbeat စနစ် (Server မအိပ်သွားအောင် ၁၀ စက္ကန့်တစ်ခါ အချက်ပြပို့ခြင်း)
function startHeartbeat() {
    heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
        }
    }, 10000);
}

function stopHeartbeat() {
    clearInterval(heartbeatInterval);
}

// History ပြသရန် Function
function addHistory(title, content) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>${title}</strong><pre style="white-space: pre-wrap; word-break: break-all; background: #0f172a; padding: 10px; border-radius: 5px; margin-top: 5px; color: #38bdf8;">${content}</pre>`;
    historyDiv.prepend(div);
}

// ခလုတ်များ၏ လုပ်ဆောင်ချက်များ
document.getElementById("connectBtn").onclick = () => {
    const val = usernameInput.value.trim();
    if (val && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "register", id: val }));
    }
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

document.getElementById("sendFile").onclick = () => {
    const file = document.getElementById("fileInput").files[0];
    const target = targetIdInput.value.trim();
    if (file && target) {
        ws.send(JSON.stringify({ 
            type: "file-meta", 
            from: myId, 
            to: target, 
            fileName: file.name, 
            fileType: file.type 
        }));
        const reader = new FileReader();
        reader.onload = (e) => ws.send(e.target.result);
        reader.readAsArrayBuffer(file);
        alert("ဖိုင်ပေးပို့နေပါသည်...");
    }
};

// စတင် Run ခြင်း
initWS();
