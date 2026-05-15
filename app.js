// ... (အပေါ်က Variable များအတိုင်းထားပါ)
const fileInput = document.getElementById("fileInput");
const sendFileBtn = document.getElementById("sendFile");

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
            }
            if (data.type === "text") {
                addHistory(`From ${data.from}:`, data.content);
            }
            if (data.type === "file_meta") {
                // File metadata ရရင် နောက်လာမည့် binary ကို စောင့်ဖမ်းရန် ပြင်ဆင်ခြင်း
                window.incomingFile = data;
            }
        } else {
            // Binary data ရလာလျှင် Download link လုပ်ပေးခြင်း
            const blob = new Blob([e.data]);
            const url = URL.createObjectURL(blob);
            addFileLink(window.incomingFile.fileName, url, window.incomingFile.from);
        }
    };
}

// ဖိုင်ပို့သည့်အပိုင်း (Max 300MB ခန့်မှန်း)
sendFileBtn.onclick = () => {
    const file = fileInput.files[0];
    const target = targetIdInput.value.trim();
    
    if (file && target) {
        if (file.size > 300 * 1024 * 1024) {
            alert("ဖိုင်ဆိုဒ် 300MB ထက် မကျော်ရပါ။");
            return;
        }

        // ၁။ ဖိုင်အချက်အလက်ကို အရင်ပို့
        ws.send(JSON.stringify({
            type: "file_meta",
            from: myId,
            to: target,
            fileName: file.name,
            fileSize: file.size
        }));

        // ၂။ Binary data ကို ပို့
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

function addFileLink(name, url, from) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.className = "download-btn";
    a.innerHTML = `<span>📁 ${name} (From: ${from})</span> <span>Download</span>`;
    fileListDiv.prepend(a);
}

// status_update logic များကို ဖြုတ်လိုက်ပါပြီ
// ... (ကျန်သည့် function များ အတူတူပင်ဖြစ်သည်)
