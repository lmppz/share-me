let ws;
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const historyDiv = document.getElementById("history");
const fileListDiv = document.getElementById("fileList");
const connectBtn = document.getElementById("connectBtn");

let myId = "";

function initWS() {
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => { 
        statusDisplay.textContent = "Server ချိတ်ဆက်ပြီးပါပြီ။ ID သတ်မှတ်ပါ။"; 
    };

    ws.onmessage = async (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            
            // Server က ID လက်ခံလိုက်သည့်အခါ
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `Connected as: <b style="color:#22c55e">${data.id}</b>`;
                usernameInput.disabled = true;
                connectBtn.disabled = true;
                connectBtn.textContent = "Connected";
            }
            
            if (data.type === "text") {
                addHistory(`From ${data.from}:`, data.content);
            }
            
            if (data.type === "file_meta") {
                window.incomingFile = data;
            }
        } else {
            // Binary data (File) လက်ခံရရှိခြင်း
            const blob = new Blob([e.data]);
            const url = URL.createObjectURL(blob);
            addFileLink(window.incomingFile.fileName, url, window.incomingFile.from);
        }
    };
    
    ws.onclose = () => {
        statusDisplay.textContent = "ချိတ်ဆက်မှု ပြတ်တောက်သွားသည်။ Refresh လုပ်ပါ။";
        connectBtn.disabled = false;
    };
}

// Connect နှိပ်လျှင် ID register လုပ်ခြင်း
connectBtn.onclick = () => {
    const val = usernameInput.value.trim();
    if (val && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "register", id: val }));
    } else {
        alert("ID ရိုက်ထည့်ရန် လိုအပ်ပါသည်။");
    }
};

document.getElementById("sendText").onclick = () => {
    const text = textInput.value;
    const target = targetIdInput.value.trim();
    if (myId && text && target) {
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text }));
        addHistory(`To ${target}:`, text);
        textInput.value = "";
    } else if (!myId) {
        alert("အရင်ဆုံး Connect လုပ်ပါ။");
    }
};

document.getElementById("sendFile").onclick = () => {
    const file = document.getElementById("fileInput").files[0];
    const target = targetIdInput.value.trim();
    
    if (myId && file && target) {
        if (file.size > 300 * 1024 * 1024) { // 300MB limit
            alert("300MB ထက် ပိုကြီးသော ဖိုင်များကို ခွင့်မပြုပါ။");
            return;
        }

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
    } else {
        alert("အချက်အလက်များ ပြည့်စုံအောင် ဖြည့်ပါ။");
    }
};

function addHistory(title, content) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>${title}</strong><pre style="white-space:pre-wrap; word-break:break-all;">${content}</pre>`;
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

initWS();
