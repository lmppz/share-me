let ws;
// မှတ်ချက် - URL ကို သေချာစစ်ပါ။ HTTPS သုံးထားရင် WSS သုံးရပါမယ်။
const wsUrl = "wss://lucimmo-share-me-server.hf.space"; 

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const targetStatus = document.getElementById("targetStatus");
const historyDiv = document.getElementById("history");
const connectBtn = document.getElementById("connectBtn");
const sendTextBtn = document.getElementById("sendText");

let myId = "";
let isTargetOnline = false;

function initWS() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => { 
        statusDisplay.textContent = "Status: Server နှင့် ချိတ်ဆက်မိပါပြီ။";
        statusDisplay.style.color = "#38bdf8";
        // အကယ်၍ ID ရှိပြီးသားဆိုရင် တန်းပြီး Register လုပ်မယ်
        if (myId) ws.send(JSON.stringify({ type: "register", id: myId }));
    };

    ws.onclose = () => {
        statusDisplay.textContent = "Status: Connection ပြတ်သွားသည်။";
        statusDisplay.style.color = "#ef4444";
        setTimeout(initWS, 3000); // ၃ စက္ကန့်နေရင် ပြန်ချိတ်မယ်
    };

    ws.onmessage = async (e) => {
        const data = JSON.parse(e.data);

        // Register အောင်မြင်ရင်
        if (data.type === "registered") {
            myId = data.id.toLowerCase();
            statusDisplay.innerHTML = `Status: <b style="color: #22c55e">Online (${data.id})</b>`;
        }

        // တစ်ဖက်လူ Status ကို စောင့်ကြည့်ခြင်း
        if (data.type === "status-update") {
            const currentTarget = targetIdInput.value.trim().toLowerCase();
            if (data.id === currentTarget) {
                updateTargetUI(data.isOnline);
            }
        }

        // စာသားလက်ခံရရှိခြင်း
        if (data.type === "text") {
            addHistory(`From ${data.from}:`, data.content, new Date().toLocaleTimeString());
        }
    };
}

function updateTargetUI(isOnline) {
    if (isOnline) {
        targetStatus.textContent = "Online";
        targetStatus.style.color = "#22c55e";
        isTargetOnline = true;
    } else {
        targetStatus.textContent = "Offline";
        targetStatus.style.color = "#ef4444";
        isTargetOnline = false;
    }
}

// Connect Button Logic
connectBtn.onclick = () => {
    const id = usernameInput.value.trim();
    if (!id) return alert("ကျေးဇူးပြု၍ ID အရင်ရိုက်ပါ");
    myId = id.toLowerCase();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        initWS();
    } else {
        ws.send(JSON.stringify({ type: "register", id: myId }));
    }
};

// Receiver ID ရိုက်နေတုန်းမှာ Online ရှိမရှိ လှမ်းမေးမယ်
targetIdInput.addEventListener("input", () => {
    const target = targetIdInput.value.trim().toLowerCase();
    if (target && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "check-status", id: target }));
    } else {
        updateTargetUI(false);
    }
});

// စာသားပို့ခြင်း
sendTextBtn.onclick = () => {
    const target = targetIdInput.value.trim().toLowerCase();
    const content = textInput.value.trim();
    
    if (!target || !content) return alert("ID နှင့် စာသား ပြည့်စုံအောင်ဖြည့်ပါ");
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content }));
        addHistory("Me:", content, new Date().toLocaleTimeString());
        textInput.value = "";
    } else {
        alert("Server နှင့် connection မရှိသေးပါ");
    }
};

function addHistory(title, content, time) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>${title}</strong><pre>${content}</pre><small>${time}</small>`;
    historyDiv.prepend(div);
}

// စစချင်းမှာ Connection စလုပ်မယ်
initWS();
