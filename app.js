let ws;
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const historyDiv = document.getElementById("history");
const fileListDiv = document.getElementById("fileList");
const fileInput = document.getElementById("fileInput");
const sendFileBtn = document.getElementById("sendFile");

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

sendFileBtn.onclick = () => {
    const file = fileInput.files[0];
    const target = targetIdInput.value.trim();
    
    if (file && target) {
        if (file.size > 300 * 1024 * 1024) { // 300MB Check
            alert("ဖိုင်ဆိုဒ် 300MB ထက် မကျော်ရပါ။");
            return;
        }

        ws.send(JSON.stringify({
            type: "file_meta",
            from: myId,
            to: target,
            fileName: file.name,
            fileSize: file.size
        }));

        const reader = new FileReader();
        reader.onload = () => {
            ws.send(reader.result);
            alert("ဖိုင်ပို့ပြီးပါပြီ။");
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("ပို့မည့်သူ ID နှင့် ဖိုင်ကို ရွေးချယ်ပါ။");
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
    contentEl.style.marginTop = "5px";
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
