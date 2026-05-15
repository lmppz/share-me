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

    ws.onopen = () => { 
        statusDisplay.textContent = "Server နှင့် ချိတ်ဆက်မိပါပြီ။ ID ထည့်ပြီး Connect လုပ်ပါ။"; 
        // အကယ်၍ အရင်က Connect လုပ်ထားဖူးလျှင် Auto Re-register လုပ်ရန်
        if (myId) {
            ws.send(JSON.stringify({ type: "register", id: myId }));
        }
    };

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
            if (window.incomingFile) {
                addFileLink(window.incomingFile.fileName, url, window.incomingFile.from);
            }
        }
    };

    ws.onclose = () => {
        statusDisplay.textContent = "ချိတ်ဆက်မှု ပြတ်တောက်သွားသည်။ ပြန်လည်ချိတ်ဆက်နေပါသည်...";
        setTimeout(initWS, 3000); // ၃ စက္ကန့်အကြာတွင် အလိုအလျောက် ပြန်ချိတ်ဆက်ရန်
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
    if (!val) return alert("ကျေးဇူးပြု၍ မိမိ ID ကို ရိုက်ထည့်ပါ။");
    if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "register", id: val }));
    } else {
        alert("ဆာဗာသို့ မချိတ်ဆက်နိုင်သေးပါ။ ခေတ္တစောင့်ပေးပါ။");
    }
};

document.getElementById("sendText").onclick = () => {
    const text = textInput.value;
    const target = targetIdInput.value.trim();
    if (!myId) return alert("အရင်ဆုံး Connect ဖြစ်အောင် လုပ်ပါ။");
    if (text && target) {
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text }));
        addHistory(`To ${target}:`, text);
        textInput.value = "";
    }
};

document.getElementById("sendFile").onclick = () => {
    const file = fileInput.files[0];
    const target = targetIdInput.value.trim();
    if (!myId) return alert("အရင်ဆုံး Connect ဖြစ်အောင် လုပ်ပါ။");
    
    if (file && target) {
        // ပြင်ဆင်လိုက်သည့်နေရာ: ဖိုင်ဆိုဒ်ကို 150MB သို့ ပြောင်းလဲသတ်မှတ်ခြင်း
        if (file.size > 150 * 1024 * 1024) return alert("ဖိုင်ဆိုဒ်သည် အများဆုံး 150MB သာ ဖြစ်ရပါမည်။");

        ws.send(JSON.stringify({
            type: "file_meta",
            from: myId,
            to: target,
            fileName: file.name
        }));

        const reader = new FileReader();
        reader.onload = () => {
            ws.send(reader.result);
            alert("ဖိုင်ပေးပို့ခြင်း အောင်မြင်ပါသည်။");
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
