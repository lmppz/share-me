let ws;
// Cloudflare သို့မဟုတ် Hugging Face URL အလိုအလျောက် သိရှိစေရန်
const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const historyDiv = document.getElementById("history");
const fileListDiv = document.getElementById("fileList");
const fileInput = document.getElementById("fileInput");
const sendFileBtn = document.getElementById("sendFile");
const connectBtn = document.getElementById("connectBtn");

let myId = "";

function initWS() {
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => { 
        statusDisplay.textContent = "Server နှင့် ချိတ်ဆက်မိပါပြီ။ ID ပေး၍ Connect နှိပ်ပါ။"; 
    };

    ws.onmessage = async (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `ID: <b style="color:#22c55e">${data.id}</b> ဖြင့် ချိတ်ဆက်ထားသည်။`;
                connectBtn.textContent = "Connected ✅";
                connectBtn.classList.add("btn-active");
            }
            if (data.type === "text") {
                addHistory(`From ${data.from}:`, data.content);
            }
            if (data.type === "file_meta") {
                window.incomingFile = data;
            }
        } else {
            // Binary Data လက်ခံရရှိခြင်း
            const blob = new Blob([e.data]);
            const url = URL.createObjectURL(blob);
            addFileLink(window.incomingFile.fileName, url, window.incomingFile.from);
        }
    };

    ws.onclose = () => {
        statusDisplay.textContent = "ချိတ်ဆက်မှု ပြတ်တောက်သွားသည်။ Refresh လုပ်ပေးပါ။";
    };
}

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
    } else {
        alert("ID နှင့် စာသားကို စစ်ဆေးပါ။ (Connect လုပ်ရန် လိုနိုင်သည်)");
    }
};

sendFileBtn.onclick = () => {
    const file = fileInput.files[0];
    const target = targetIdInput.value.trim();
    
    if (myId && file && target) {
        if (file.size > 300 * 1024 * 1024) {
            alert("ဖိုင်ဆိုဒ် 300MB ထက် မကျော်ရပါ။");
            return;
        }

        // Metadata ကို အရင်ပို့
        ws.send(JSON.stringify({
            type: "file_meta",
            from: myId,
            to: target,
            fileName: file.name
        }));

        // Binary ကို ပို့
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

function addHistory(title, content) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>${title}</strong><pre>${content}</pre>`;
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
