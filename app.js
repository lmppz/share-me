const socket = io();

// DOM Elements
const targetIdInput = document.getElementById('targetIdInput');
const checkOnlineBtn = document.getElementById('checkOnlineBtn');
const receiverOnlineStatus = document.getElementById('receiverOnlineStatus');
const senderTextMsg = document.getElementById('senderTextMsg');
const fileInputSender = document.getElementById('fileInputSender');
const chooseFileBtn = document.getElementById('chooseFileBtn');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const sendTextBtn = document.getElementById('sendTextBtn');
const sendFileBtn = document.getElementById('sendFileBtn');
const senderLogArea = document.getElementById('senderLogArea');

const registerNameInput = document.getElementById('registerNameInput');
const registerBtn = document.getElementById('registerBtn');
const registeredIdDisplay = document.getElementById('registeredIdDisplay');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const receiverInbox = document.getElementById('receiverInbox');
const copyAllBtn = document.getElementById('copyAllReceiverTextBtn');
const clearInboxBtn = document.getElementById('clearReceiverInboxBtn');
const receiverSelfStatusIcon = document.getElementById('receiverSelfStatusIcon');

let currentReceiverId = null;
let receivedMessages = []; // store text messages for copying

// Helper: add log to sender
function addSenderLog(msg, isError = false) {
    const div = document.createElement('div');
    div.className = 'chat-bubble';
    div.style.borderLeftColor = isError ? '#ef4444' : '#3b82f6';
    div.innerHTML = `📡 ${new Date().toLocaleTimeString()} - ${msg}`;
    senderLogArea.appendChild(div);
    senderLogArea.scrollTop = senderLogArea.scrollHeight;
    if (senderLogArea.children.length > 12) senderLogArea.removeChild(senderLogArea.children[0]);
}

// Add to receiver inbox
function addToInbox(from, text, isFile = false, fileName = null, fileDataURL = null) {
    const div = document.createElement('div');
    div.className = 'chat-bubble';
    if (isFile && fileDataURL) {
        div.innerHTML = `<strong>📎 ${from}</strong> sent file: <strong>${fileName}</strong><br><a href="${fileDataURL}" download="${fileName}">⬇️ Download ${fileName}</a>`;
        receivedMessages.push({ type: 'file', from, fileName, timestamp: Date.now() });
    } else {
        div.innerHTML = `<strong>💬 ${from}:</strong> ${escapeHtml(text)}`;
        receivedMessages.push({ type: 'text', from, content: text, timestamp: Date.now() });
    }
    receiverInbox.appendChild(div);
    receiverInbox.scrollTop = receiverInbox.scrollHeight;
    if (receiverInbox.children.length > 20) receiverInbox.removeChild(receiverInbox.children[0]);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

function updateSelfStatus() {
    const isRegistered = currentReceiverId !== null;
    if (isRegistered) {
        statusDot.className = 'status-dot online';
        statusText.innerText = 'Online';
        receiverSelfStatusIcon.className = 'status-dot online';
        registeredIdDisplay.innerHTML = `✅ Registered: <strong>${currentReceiverId}</strong> (visible to senders)`;
    } else {
        statusDot.className = 'status-dot offline';
        statusText.innerText = 'Offline';
        receiverSelfStatusIcon.className = 'status-dot offline';
        registeredIdDisplay.innerHTML = `⚠️ Not registered — Senders cannot reach you.`;
    }
}

// Register receiver
function registerReceiver() {
    const id = registerNameInput.value.trim();
    if (!id) {
        alert('Please enter an ID (e.g., luci, ppz)');
        return;
    }
    socket.emit('register', id, (response) => {
        if (response.success) {
            if (currentReceiverId) {
                socket.emit('unregister', currentReceiverId);
            }
            currentReceiverId = response.id;
            updateSelfStatus();
            addToInbox('System', `✅ Registered as "${currentReceiverId}" — You are ONLINE`, false);
        } else {
            alert('Registration failed: ' + response.reason);
        }
    });
}

// Check online status
function checkOnline() {
    const targetId = targetIdInput.value.trim();
    if (!targetId) {
        receiverOnlineStatus.innerHTML = '⚠️ Enter receiver ID';
        return;
    }
    socket.emit('check-online', targetId, (res) => {
        if (res.online) {
            receiverOnlineStatus.innerHTML = `✅ "${targetId}" is <span style="color:#4ade80;">ONLINE</span>`;
        } else {
            receiverOnlineStatus.innerHTML = `❌ "${targetId}" is <span style="color:#f87171;">OFFLINE</span> or not registered`;
        }
    });
}

// Send text
function sendText() {
    const targetId = targetIdInput.value.trim();
    const message = senderTextMsg.value.trim();
    if (!targetId || !message) {
        addSenderLog('❌ Please enter receiver ID and message', true);
        return;
    }
    socket.emit('send-text', { targetId, message, senderId: 'Sender' }, (res) => {
        if (res.success) {
            addSenderLog(`✅ Text sent to "${targetId}": "${message.substring(0, 50)}"`);
            senderTextMsg.value = '';
        } else {
            addSenderLog(`❌ Failed: ${res.reason}`, true);
            checkOnline();
        }
    });
}

// File handling
let selectedFile = null;
chooseFileBtn.onclick = () => fileInputSender.click();
fileInputSender.onchange = (e) => {
    selectedFile = e.target.files[0];
    fileNameDisplay.innerText = selectedFile ? selectedFile.name : 'No file selected';
};

function sendFile() {
    const targetId = targetIdInput.value.trim();
    if (!targetId || !selectedFile) {
        addSenderLog('❌ Enter receiver ID and select a file', true);
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        const fileData = ev.target.result; // base64
        socket.emit('send-file', {
            targetId,
            fileName: selectedFile.name,
            fileData: fileData,
            fileType: selectedFile.type,
            senderId: 'Sender'
        }, (res) => {
            if (res.success) {
                addSenderLog(`📁 File "${selectedFile.name}" sent to ${targetId}`);
                selectedFile = null;
                fileInputSender.value = '';
                fileNameDisplay.innerText = 'No file selected';
            } else {
                addSenderLog(`❌ File send failed: ${res.reason}`, true);
            }
        });
    };
    reader.readAsDataURL(selectedFile);
}

// Copy all text messages
function copyAllTextMessages() {
    const textOnly = receivedMessages.filter(m => m.type === 'text');
    if (textOnly.length === 0) {
        showToast('No text messages to copy');
        return;
    }
    let output = '';
    textOnly.forEach(m => {
        output += `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.from}: ${m.content}\n`;
    });
    navigator.clipboard.writeText(output).then(() => showToast(`📋 Copied ${textOnly.length} text message(s)`));
}

function clearInbox() {
    receiverInbox.innerHTML = '<div class="chat-bubble empty">✨ Inbox cleared</div>';
    receivedMessages = [];
}

function showToast(msg) {
    const toast = document.getElementById('toastMsg');
    toast.innerText = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 1800);
}

// Socket event listeners
socket.on('receive-text', (data) => {
    addToInbox(data.from, data.message, false);
    addSenderLog(`📩 Message from ${data.from} delivered to receiver`);
});

socket.on('receive-file', (data) => {
    addToInbox(data.from, null, true, data.fileName, data.fileData);
    addSenderLog(`📩 File "${data.fileName}" from ${data.from} received`);
});

socket.on('status-change', (data) => {
    const targetCheck = targetIdInput.value.trim().toLowerCase();
    if (targetCheck === data.id) checkOnline();
});

// Button events
checkOnlineBtn.onclick = checkOnline;
sendTextBtn.onclick = sendText;
sendFileBtn.onclick = sendFile;
registerBtn.onclick = registerReceiver;
copyAllBtn.onclick = copyAllTextMessages;
clearInboxBtn.onclick = clearInbox;

addSenderLog('✨ Connected to server. Register as receiver first, then sender can reach you.');
