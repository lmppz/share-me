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
    ws.binaryType = "arraybuffer";

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

    ws.onmessage = async (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `Status: <b style="color:#22c55e">${data.id}</b> ဖြင့် Online ဖြစ်နေသည်။`;
                usernameInput.disabled = true;
                connectBtn.textContent = "Connected";
            }
            if (data.type === "status-update") {
                targetStatus.textContent = data.isOnline ? "Online" : "Offline";
                targetStatus.className = data.isOnline ? "online" : "offline";
            }
            if (data.type === "text" && data.from !== myId) {
                addHistory(`From ${data.from}:`, data.content, data.time);
            }
        }
    };
}

// Receiver ID စစ်ဆေးခြင်း
targetIdInput.addEventListener('input', () => {
    const target = targetIdInput.value.trim();
    if (target && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "check-status", id: target }));
    }
});

// အလိုအလျောက် Online Status စစ်ပေးခြင်း
setInterval(() => {
    const target = targetIdInput.value.trim();
    if (target && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "check-status", id: target }));
    }
}, 2000);

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
    }
};

// ဖိုင်ပို့ခြင်းနှင့် Speed Bar Logic
document.getElementById("sendFile").onclick = async () => {
    const fileInput = document.getElementById("fileInput");
    const files = fileInput.files;
    const target = targetIdInput.value.trim();

    if (files.length === 0 || !target) return alert("ဖိုင်ရွေးရန်နှင့် Receiver ID ထည့်ရန် လိုအပ်ပါသည်။");

    let isImage = Array.from(files).every(f => f.type.startsWith('image/'));
    if (isImage && files.length > 10) return alert("ဓာတ်ပုံကို ၁၀ ပုံအထိသာ ပို့နိုင်သည်။");
    if (!isImage && files.length > 4) return alert("ဖိုင်ကို ၄ ဖိုင်အထိသာ ပို့နိုင်သည်။");

    const progContainer = document.getElementById("progressContainer");
    const progBar = document.getElementById("progressBar");
    const speedText = document.getElementById("speedDisplay");
    const percentText = document.getElementById("percentDisplay");

    progContainer.style.display = "block";

    for (let file of files) {
        if (file.size > 50 * 1024 * 1024) {
            alert(`${file.name} က 50MB ကျော်နေပါသည်။`);
            continue;
        }

        ws.send(JSON.stringify({ type: "file-meta", from: myId, to: target, fileName: file.name, fileType: file.type, fileSize: file.size }));

        const reader = new FileReader();
        let startTime = Date.now();

        reader.onload = (e) => {
            const rawData = e.target.result;
            const chunkSize = 16384; 
            let offset = 0;

            const sendChunk = () => {
                if (offset < rawData.byteLength) {
                    const chunk = rawData.slice(offset, offset + chunkSize);
                    ws.send(chunk);
                    offset += chunkSize;

                    const percent = Math.min(100, Math.round((offset / rawData.byteLength) * 100));
                    const duration = (Date.now() - startTime) / 1000;
                    const speed = (offset / 1024 / (duration || 1)).toFixed(2);

                    progBar.style.width = percent + "%";
                    percentText.textContent = percent + "%";
                    speedText.textContent = `Speed: ${speed > 1024 ? (speed/1024).toFixed(2) + " MB/s" : speed + " KB/s"}`;

                    setTimeout(sendChunk, 1);
                } else {
                    if (files.length === 1) setTimeout(() => progContainer.style.display = "none", 2000);
                }
            };
            sendChunk();
        };
        reader.readAsArrayBuffer(file);
    }
};

function addHistory(title, content, time) {
    const div = document.createElement("div");
    div.className = "history-item";
    
    const pre = document.createElement("pre");
    pre.textContent = content;
    
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
    div.innerHTML += `<strong>${title}</strong>`;
    div.appendChild(pre);
    div.appendChild(timeDiv);
    historyDiv.prepend(div);
}

document.getElementById("clearInput").onclick = () => { textInput.value = ""; };

initWS();
