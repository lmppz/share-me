let ws;
const wsUrl = "wss://lucimmo-share-me-server.hf.space"; // သင့် URL ကို ဤနေရာတွင် ထည့်သွင်းထားသည်

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const historyDiv = document.getElementById("history");
const fileListDiv = document.getElementById("fileList");

let myId = "";

function initWS() {
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => { statusDisplay.textContent = "Server နှင့် ချိတ်ဆက်မိပါပြီ။"; };

    ws.onmessage = async (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `ID: <b style="color:#22c55e">${data.id}</b> (Connected)`;
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
            // Binary data (File) လက်ခံရရှိခြင်း
            const blob = new Blob([e.data], { type: window.incomingFileMeta.fileType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = window.incomingFileMeta.fileName;
            a.className = "download-btn";
            a.textContent = `⬇️ Download: ${window.incomingFileMeta.fileName}`;
            fileListDiv.prepend(a);
            
            // Auto-cleanup memory
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        }
    };
}

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

document.getElementById("sendFile").onclick = () => {
    const file = document.getElementById("fileInput").files[0];
    const target = targetIdInput.value.trim();
    if (file && target) {
        ws.send(JSON.stringify({ type: "file-meta", from: myId, to: target, fileName: file.name, fileType: file.type }));
        const reader = new FileReader();
        reader.onload = (e) => ws.send(e.target.result);
        reader.readAsArrayBuffer(file);
    }
};

function addHistory(title, content) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>${title}</strong><pre>${content}</pre>`;
    historyDiv.prepend(div);
}

initWS();
