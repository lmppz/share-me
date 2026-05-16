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
let pingInterval;
let receivedChunks = {}; // လက်ခံရရှိသော ဖိုင်အစိတ်အပိုင်းများကို စုဆောင်းရန်

function initWS() {
    if (pingInterval) clearInterval(pingInterval);
    
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => { 
        statusDisplay.textContent = "Server နှင့် ချိတ်ဆက်မိပါပြီ။ ID ထည့်ပြီး Connect လုပ်ပါ။"; 
        if (myId) {
            ws.send(JSON.stringify({ type: "register", id: myId }));
        }
        
        // Optimization: DNS/Firewall ကြောင့် လိုင်းမပြတ်သွားအောင် ၂၀ စက္ကန့်တစ်ခါ Ping ပို့ပေးသည့်စနစ်
        pingInterval = setInterval(() => {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ type: "ping" }));
            }
        }, 20000);
    };

    ws.onmessage = async (e) => {
        if (typeof e.data === "string") {
            const data = JSON.parse(e.data);
            
            if (data.type === "pong") return; // Heartbeat ကို ကျော်မည်
            
            if (data.type === "registered") {
                myId = data.id.toLowerCase();
                statusDisplay.innerHTML = `Connected as: <b style="color:#22c55e">${data.id}</b>`;
                usernameInput.disabled = true;
                document.getElementById("connectBtn").disabled = true;
                document.getElementById("connectBtn").textContent = "Connected";
                setInterval(checkOnline, 3000);
            }
            if (data.type === "status_update") {
                targetStatus.textContent = data.status.toUpperCase();
                targetStatus.style.color = data.status === "online" ? "#22c55e" : "#ef4444";
            }
            if (data.type === "text") {
                addHistory(`From ${data.from}:`, data.content);
            }
            if (data.type === "file_chunk_meta") {
                window.incomingFileMeta = data;
                if (!receivedChunks[data.fileId]) {
                    receivedChunks[data.fileId] = {
                        name: data.fileName,
                        from: data.from,
                        total: data.totalChunks,
                        chunks: []
                    };
                }
            }
        } else {
            // ဖိုင်အပိုင်းအစ (Binary Chunk) ကို လက်ခံရရှိခြင်း
            if (window.incomingFileMeta) {
                const fileId = window.incomingFileMeta.fileId;
                const fileInfo = receivedChunks[fileId];
                
                if (fileInfo) {
                    fileInfo.chunks.push(e.data);
                    
                    // ဖိုင်လက်ခံရရှိမှု Progress အခြေအနေပြသရန်
                    statusDisplay.textContent = `ဖိုင်လက်ခံရရှိနေသည်... (${fileInfo.chunks.length}/${fileInfo.total})`;

                    // အစိတ်အပိုင်းအားလုံး စုံလင်သွားပါက ဖိုင်ပြန်ပေါင်းပြီး Download Link ထုတ်ပေးခြင်း
                    if (fileInfo.chunks.length === fileInfo.total) {
                        const blob = new Blob(fileInfo.chunks);
                        const url = URL.createObjectURL(blob);
                        addFileLink(fileInfo.name, url, fileInfo.from);
                        statusDisplay.innerHTML = `Connected as: <b style="color:#22c55e">${myId}</b>`;
                        delete receivedChunks[fileId];
                    }
                }
            }
        }
    };

    ws.onclose = () => {
        clearInterval(pingInterval);
        statusDisplay.textContent = "ချိတ်ဆက်မှု ပြတ်တောက်သွားသည်။ ပြန်လည်ချိတ်ဆက်နေပါသည်...";
        setTimeout(initWS, 2000); // လိုင်းပြတ်ပါက ၂ စက္ကန့်အတွင်း အလိုအလျောက် ပြန်ချိတ်ရန်
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

// Optimization: 150MB ဖိုင်အထိ လိုင်းမကျဘဲ စီးဆင်းသွားစေမည့် Chunked Sender
document.getElementById("sendFile").onclick = async () => {
    const file = fileInput.files[0];
    const target = targetIdInput.value.trim();
    if (!myId) return alert("အရင်ဆုံး Connect ဖြစ်အောင် လုပ်ပါ။");
    if (!file || !target) return alert("ဖိုင်နှင့် ပို့မည့်သူ၏ ID ကို သေချာရွေးချယ်ပါ။");
    
    if (file.size > 150 * 1024 * 1024) return alert("ဖိုင်ဆိုဒ်သည် အများဆုံး 150MB သာ ဖြစ်ရပါမည်။");

    const chunkSize = 1024 * 1024; // 1MB စီ အပိုင်းခွဲမည်
    const totalChunks = Math.ceil(file.size / chunkSize);
    const fileId = Math.random().toString(36).substring(2, 9);

    document.getElementById("sendFile").disabled = true;

    for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        // ဆာဗာတွင် လမ်းကြောင်းမှန်စေရန် Chunk Meta ကို အရင်ဦးဆုံး ပို့လွှတ်ခြင်း
        ws.send(JSON.stringify({
            type: "file_chunk_meta",
            fileId: fileId,
            from: myId,
            to: target,
            fileName: file.name,
            chunkIndex: i,
            totalChunks: totalChunks
        }));

        // Binary ဒေတာအဖြစ် ပြောင်းလဲပြီး ချက်ချင်းပေးပို့ခြင်း
        const chunkBuffer = await chunk.arrayBuffer();
        ws.send(chunkBuffer);

        // ပေးပို့မှု အခြေအနေပြသရန်
        statusDisplay.textContent = `ဖိုင်ပေးပို့နေသည်... (${i + 1}/${totalChunks})`;
        
        // Network ပိတ်ဆို့မှုမရှိဘဲ ချောမွေ့စေရန် ခေတ္တ နားပေးခြင်း (Optimization)
        await new Promise(r => setTimeout(r, 15));
    }

    alert("ဖိုင်ပေးပို့ခြင်း အောင်မြင်စွာ ပြီးဆုံးပါပြီ။");
    statusDisplay.innerHTML = `Connected as: <b style="color:#22c55e">${myId}</b>`;
    document.getElementById("sendFile").disabled = false;
    fileInput.value = "";
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
