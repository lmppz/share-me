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

let myId = "";

// HTML Code တွေကို Formatting မပျက်အောင် ပြောင်းပေးသည့် Function
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

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
                setInterval(checkOnline, 2000);
            }
            if (data.type === "status_update") {
                targetStatus.textContent = data.status.toUpperCase();
                targetStatus.style.color = data.status === "online" ? "#22c55e" : "#ef4444";
            }
            if (data.type === "text") {
                addHistory(`From ${data.from}:`, data.content);
            }
        }
    };
}

function checkOnline() {
    const target = targetIdInput.value.trim();
    if (target && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "check_status", targetId: target }));
    }
}

// Connect နှိပ်ခြင်း
document.getElementById("connectBtn").onclick = () => {
    const val = usernameInput.value.trim();
    if (val && ws.readyState === 1) ws.send(JSON.stringify({ type: "register", id: val }));
};

// စာသားပို့ခြင်း (Code formatting မပျက်အောင် လုပ်ထားသည်)
document.getElementById("sendText").onclick = () => {
    const text = textInput.value;
    const target = targetIdInput.value.trim();
    if (text && target) {
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text }));
        addHistory(`To ${target}:`, text);
        textInput.value = ""; // ပို့ပြီးရင် ဖျက်မည်
    }
};

// မပို့ခင် စာသားဖျက်ချင်လျှင် နှိပ်ရန်
document.getElementById("clearInput").onclick = () => {
    textInput.value = "";
    textInput.focus();
};

function addHistory(title, content) {
    const div = document.createElement("div");
    div.className = "history-item";
    
    // innerHTML အစား textContent ကို သုံးပြီး formatting ထိန်းသိမ်းမည်
    const titleEl = document.createElement("strong");
    titleEl.textContent = title;
    
    const contentEl = document.createElement("pre"); // <pre> tag က code format ကို ထိန်းပေးသည်
    contentEl.style.whiteSpace = "pre-wrap";
    contentEl.style.wordBreak = "break-all";
    contentEl.style.marginTop = "5px";
    contentEl.textContent = content; 

    div.appendChild(titleEl);
    div.appendChild(contentEl);
    historyDiv.prepend(div);
}

// History တစ်ခုလုံး ဖျက်ရန်
document.getElementById("clearHistory").onclick = () => {
    historyDiv.innerHTML = "";
    fileListDiv.innerHTML = "";
};

initWS();
