let ws;
// အရေးကြီးသည်- Hugging Face Space နာမည်ကို အတိအကျ စစ်ဆေးပါ။ 
// အကယ်၍ Space နာမည်က share-me ဆိုရင် အောက်ပါအတိုင်း ရေးပါ-
const wsUrl = "wss://lucimmo-share-me.hf.space"; 

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

    ws.onopen = () => { 
        statusDisplay.textContent = "Server နှင့် ချိတ်ဆက်မိပါပြီ။"; 
        statusDisplay.style.color = "#22c55e";
    };

    ws.onclose = () => {
        statusDisplay.textContent = "ချိတ်ဆက်မှု ပြတ်တောက်သွားသည်။ ပြန်ချိတ်နေသည်...";
        statusDisplay.style.color = "#ef4444";
        setTimeout(initWS, 3000); 
    };

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

// ပျောက်နေသော addHistory function ကို ဤနေရာတွင် ထည့်သွင်းထားသည်
function addHistory(title, content) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>${title}</strong><pre style="white-space: pre-wrap; word-break: break-all; background: #0f172a; padding: 10px; border-radius: 5px; margin-top: 5px; color: #38bdf8;">${content}</pre>`;
    historyDiv.prepend(div);
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

initWS();
