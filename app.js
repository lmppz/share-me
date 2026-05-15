let ws;
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const targetStatus = document.getElementById("targetStatus");
const historyDiv = document.getElementById("history");
const fileListDiv = document.getElementById("fileList");
const fileInput = document.getElementById("fileInput");

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
                statusDisplay.innerHTML = `Connected as: <b style="color:#22c55e">${data.id}</b>`;
                usernameInput.disabled = true;
                document.getElementById("connectBtn").disabled = true;
                document.getElementById("connectBtn").textContent = "Connected";
                setInterval(checkOnline, 2000);
            }
            if (data.type === "status_update") {
                targetStatus.textContent = data.status.toUpperCase();
                targetStatus.style.color = data.status === "online" ? "#22c55e" : "#ef4444";
            }
            if (data.type === "text") {
                addHistory(`From ${data.from}:`, data.content);
            }
            if (data.type === "file_meta") {
                window.incomingFile = data;
            }
        } else {
            const blob = new Blob([e.data]);
            const url = URL.createObjectURL(blob);
            addFileLink(window.incomingFile.fileName, url, window.incomingFile.from);
        }
    };
}

function checkOnline() {
    const target = targetIdInput.value.trim();
    if (target && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "check_status", targetId: target }));
    }
}

document.getElementById("connectBtn").onclick = () => {
    const val = usernameInput.value.trim();
    if (val && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "register", id: val }));
    }
};

document.getElementById("sendText").onclick = () => {
    const text = textInput.value;
    const target = targetIdInput.value.trim();
    if (!myId) return alert("အရင်ဆုံး Connect လုပ်ပါ။");
    if (text && target) {
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text }));
        addHistory(`To ${target}:`, text);
        textInput.value = "";
    }
};

document.getElementById("sendFile").onclick = () => {
    const file = fileInput.files[0];
    const target = targetIdInput.value.trim();
    if (!myId) return alert("အရင်ဆုံး Connect လုပ်ပါ။");
    
    if (file && target) {
        if (file.size > 300 * 1024 * 1024) return alert("Max 300MB သာ ခွင့်ပြုပါသည်။");

        ws.send(JSON.stringify({
            type: "file_meta",
            from: myId,
            to: target,
            fileName: file.name
        }));

        const reader = new FileReader();
        reader.onload = () => {
            ws.send(reader.result);
            alert("ဖိုင်ပို့ပြီးပါပြီ။");
        };
        reader.readAsArrayBuffer(file);
    }
};

document.getElementById("clearInput").onclick = () => {
    textInput.value = "";
    textInput.focus();
};

function addHistory(title, content) {
    const div = document.createElement("div");
    div.className = "history-item";
    const titleEl = document.createElement("strong");
    titleEl.textContent = title;
    const contentEl = document.createElement("pre");
    contentEl.style.whiteSpace = "pre-wrap";
    contentEl.style.wordBreak = "break-all";
    contentEl.textContent = content; 
    div.appendChild(titleEl);
    div.appendChild(contentEl);
    historyDiv.prepend(div);
}

function addFileLink(name, url, from) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.className = "download-btn";
    a.innerHTML = `<span>📁 ${name} (From: ${from})</span> <span>Download</span>`;
    fileListDiv.prepend(a);
}

document.getElementById("clearHistory").onclick = () => {
    historyDiv.innerHTML = "";
    fileListDiv.innerHTML = "";
};

initWS();
