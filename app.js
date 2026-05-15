let ws;
const wsUrl = "wss://lucimmo-share-me-server.hf.space"; 

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const targetStatus = document.getElementById("targetStatus");
const historyDiv = document.getElementById("history");
const connectBtn = document.getElementById("connectBtn");
const sendTextBtn = document.getElementById("sendText");
const sendFileBtn = document.getElementById("sendFile");

let myId = "";
let isTargetOnline = false;

function initWS() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => { 
        statusDisplay.textContent = "Status: Server နှင့် ချိတ်ဆက်မိပါပြီ။";
        statusDisplay.style.color = "#38bdf8";
        if (myId) ws.send(JSON.stringify({ type: "register", id: myId }));
    };

    ws.onclose = () => {
        statusDisplay.textContent = "Status: Connection ပြတ်သွားသည်။ ပြန်ချိတ်နေသည်...";
        statusDisplay.style.color = "#ef4444";
        setTimeout(initWS, 3000); 
    };

    ws.onmessage = async (e) => {
        const data = JSON.parse(e.data);

        // Register အောင်မြင်မှု
        if (data.type === "registered") {
            myId = data.id.toLowerCase();
            statusDisplay.innerHTML = `Status: <b style="color: #22c55e">Online (${data.id})</b>`;
        }

        // Real-time Status Update လက်ခံခြင်း
        if (data.type === "status-update") {
            const currentTarget = targetIdInput.value.trim().toLowerCase();
            if (data.id === currentTarget) {
                if (data.isOnline) {
                    targetStatus.textContent = "Online";
                    targetStatus.className = "online";
                    isTargetOnline = true;
                } else {
                    targetStatus.textContent = "Offline";
                    targetStatus.className = "offline";
                    isTargetOnline = false;
                }
            }
        }

        // စာသားလက်ခံရရှိခြင်း
        if (data.type === "text") {
            addHistory(`From ${data.from}:`, data.content, new Date().toLocaleTimeString());
        }

        // ဖိုင်လက်ခံခြင်းဆိုင်ရာ logic များ (Chunk လက်ခံခြင်း စသည်...)
        // ... (သင်ယခင်ရေးထားသော ဖိုင်လက်ခံသည့် logic ကို ဒီနေရာမှာ ဆက်ထားနိုင်ပါတယ်)
    };
}

// Connect Button နှိပ်ခြင်း
connectBtn.onclick = () => {
    const id = usernameInput.value.trim();
    if (!id) return alert("ID တစ်ခုခု ရိုက်ထည့်ပါ");
    myId = id.toLowerCase();
    if (!ws || ws.readyState !== WebSocket.OPEN) initWS();
    else ws.send(JSON.stringify({ type: "register", id: myId }));
};

// Receiver ID ရိုက်သည့်အခါ Real-time စစ်ဆေးခြင်း
targetIdInput.addEventListener("input", () => {
    const target = targetIdInput.value.trim().toLowerCase();
    if (target && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "check-status", id: target }));
    } else {
        targetStatus.textContent = "Offline";
        targetStatus.className = "offline";
        isTargetOnline = false;
    }
});

// စာသားပို့ခြင်း
sendTextBtn.onclick = () => {
    const target = targetIdInput.value.trim().toLowerCase();
    const content = textInput.value.trim();
    if (!target || !content) return alert("Receiver ID နှင့် စာသား ဖြည့်ပါ");
    if (!isTargetOnline) return alert("တစ်ဖက်လူ Offline ဖြစ်နေသည်");

    ws.send(JSON.stringify({ type: "text", from: myId, to: target, content }));
    addHistory("Me:", content, new Date().toLocaleTimeString());
    textInput.value = "";
};

function addHistory(title, content, time) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<div class="history-header">${title}</div><pre>${content}</pre><div class="msg-time">${time || ''}</div>`;
    historyDiv.prepend(div);
}

initWS();
