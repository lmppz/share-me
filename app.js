let ws;
const wsUrl = "wss://lucimmo-share-me-server.hf.space"; 

const usernameInput = document.getElementById("usernameInput");
const targetIdInput = document.getElementById("targetIdInput");
const textInput = document.getElementById("textInput");
const statusDisplay = document.getElementById("status");
const targetStatus = document.getElementById("targetStatus");
const historyDiv = document.getElementById("history");

let myId = "";

function initWS() {
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => { 
        statusDisplay.textContent = "Server နှင့် ချိတ်ဆက်မိပါပြီ။"; 
        statusDisplay.style.color = "#22c55e";
    };

    ws.onmessage = async (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `ID: <b style="color:#22c55e">${data.id}</b> (Online)`;
            }

            if (data.type === "status-update") {
                targetStatus.textContent = data.isOnline ? "Online" : "Offline";
                targetStatus.className = data.isOnline ? "online" : "offline";
            }

            if (data.type === "text") {
                // တစ်ဖက်လူပို့တဲ့စာမှသာ History ထဲထည့်မည်
                if (data.from !== myId) {
                    addHistory(`From ${data.from}:`, data.content);
                }
            }
            // ... file logic များ ...
        }
    };
}

// Target ID ရိုက်နေစဉ် Online ရှိမရှိ စစ်ရန်
targetIdInput.addEventListener('input', () => {
    const target = targetIdInput.value.trim();
    if (target && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "check-status", id: target }));
    }
});

document.getElementById("sendText").onclick = () => {
    const text = textInput.value;
    const target = targetIdInput.value.trim();
    if (text && target) {
        ws.send(JSON.stringify({ type: "text", from: myId, to: target, content: text }));
        // *** ဤနေရာတွင် addHistory ကို ဖြုတ်လိုက်ခြင်းဖြင့် မိမိပို့တာ မိမိပြန်မမြင်ရတော့ပါ ***
        textInput.value = "";
        alert("စာသားပေးပို့ပြီးပါပြီ။");
    }
};

function addHistory(title, content) {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>${title}</strong><pre>${content}</pre>`;
    
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = () => navigator.clipboard.writeText(content);
    
    div.prepend(copyBtn);
    historyDiv.prepend(div);
}

initWS();
