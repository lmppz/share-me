// ---------- DOM elements ----------
const myIdInput = document.getElementById('myIdInput');
const registerBtn = document.getElementById('registerBtn');
const selfDot = document.getElementById('selfDot');
const selfStatusText = document.getElementById('selfStatusText');
const contactListDiv = document.getElementById('contactList');
const chatWithLabel = document.getElementById('chatWithLabel');
const targetStatusHint = document.getElementById('targetStatusHint');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const chooseFileBtn = document.getElementById('chooseFileBtn');
const fileInput = document.getElementById('fileInput');
const fileNameSpan = document.getElementById('fileNameSpan');
const sendTextBtn = document.getElementById('sendTextBtn');
const sendFileBtn = document.getElementById('sendFileBtn');
const copyReceivedTextBtn = document.getElementById('copyReceivedTextBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const toast = document.getElementById('toastMsg');

// ---------- App state ----------
let myId = null;                // current user's registered ID (lowercase)
let online = false;
let selectedContactId = null;   // currently selected contact ID
let allUsers = new Map();       // key: id (string), value: { online: boolean }
let receivedPlainTexts = [];    // store only message text (no sender, no timestamp) for copy button

// ---------- Cross‑tab communication ----------
const channel = new BroadcastChannel('super_share_channel');

function broadcast(type, payload) {
    channel.postMessage({ type, from: myId, payload });
}

channel.onmessage = (e) => {
    const { type, from, payload } = e.data;
    if (from === myId) return; // ignore own messages

    switch (type) {
        case 'register':
            allUsers.set(payload.id, { online: true });
            renderContactList();
            addSystemMessage(`🟢 ${payload.id} is now ONLINE`);
            break;
        case 'unregister':
            if (allUsers.has(payload.id)) {
                allUsers.get(payload.id).online = false;
                renderContactList();
                addSystemMessage(`🔴 ${payload.id} went offline`);
                if (selectedContactId === payload.id) updateTargetStatusHint(false);
            }
            break;
        case 'text':
            // received text message from another tab
            receivedPlainTexts.push(payload.text);  // store only pure text
            displayMessage(payload.fromId, payload.text, false);
            break;
        case 'file':
            displayFileMessage(payload.fromId, payload.fileName, payload.fileDataURL);
            break;
        case 'syncUsers':
            // full sync of user list
            for (let u of payload.usersList) {
                allUsers.set(u.id, { online: u.online });
            }
            renderContactList();
            break;
    }
};

// ---------- UI helpers ----------
function addSystemMessage(msg) {
    const div = document.createElement('div');
    div.className = 'msg-bubble info';
    div.innerHTML = `ℹ️ ${msg}`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function displayMessage(senderId, text, isOwn = false) {
    const div = document.createElement('div');
    div.className = 'msg-bubble';
    if (isOwn) div.style.borderLeftColor = '#facc15';
    div.innerHTML = `<strong>${isOwn ? 'You' : senderId}:</strong> ${escapeHtml(text)}`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function displayFileMessage(senderId, fileName, dataURL) {
    const div = document.createElement('div');
    div.className = 'msg-bubble';
    div.style.borderLeftColor = '#f97316';
    div.innerHTML = `<strong>📎 ${senderId}:</strong> ${fileName}<br>
                     <a href="${dataURL}" download="${fileName}">⬇️ Download file</a>`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showToastMessage(msg) {
    toast.innerText = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 1500);
}

// ---------- Contact list rendering ----------
function renderContactList() {
    if (!myId) {
        contactListDiv.innerHTML = '<div class="placeholder-msg">Register to see contacts</div>';
        return;
    }
    const otherUsers = Array.from(allUsers.entries())
        .filter(([id]) => id !== myId)
        .map(([id, info]) => ({ id, online: info.online }));
    
    if (otherUsers.length === 0) {
        contactListDiv.innerHTML = '<div class="placeholder-msg">No other users yet.<br>Open another tab and register.</div>';
        return;
    }
    
    let html = '';
    for (let u of otherUsers) {
        const isSelected = (selectedContactId === u.id);
        html += `
            <div class="contact-item ${isSelected ? 'selected' : ''}" data-id="${u.id}">
                <span class="contact-name">${escapeHtml(u.id)}</span>
                <span class="contact-status ${u.online ? 'online' : 'offline'}">${u.online ? '● Online' : '○ Offline'}</span>
            </div>
        `;
    }
    contactListDiv.innerHTML = html;
    // attach click events
    document.querySelectorAll('.contact-item').forEach(el => {
        el.addEventListener('click', () => {
            const cid = el.getAttribute('data-id');
            selectContact(cid);
        });
    });
    // update target status hint if contact exists
    if (selectedContactId && allUsers.has(selectedContactId)) {
        updateTargetStatusHint(allUsers.get(selectedContactId).online);
    } else if (selectedContactId) {
        targetStatusHint.innerText = '⚠️ User offline or not registered';
    }
}

function selectContact(contactId) {
    selectedContactId = contactId;
    renderContactList(); // re-render to highlight selected
    const isOnline = allUsers.has(contactId) ? allUsers.get(contactId).online : false;
    chatWithLabel.innerText = `💬 Chat with ${contactId}`;
    updateTargetStatusHint(isOnline);
}

function updateTargetStatusHint(isOnline) {
    if (isOnline) targetStatusHint.innerHTML = '✅ Online · ready to send';
    else targetStatusHint.innerHTML = '❌ Offline (cannot send)';
}

// ---------- Registration ----------
function registerMe() {
    let newId = myIdInput.value.trim().toLowerCase();
    if (!newId) {
        alert('Please enter a valid ID (letters/numbers only)');
        return;
    }
    // unregister previous if any
    if (myId) {
        broadcast('unregister', { id: myId });
    }
    myId = newId;
    online = true;
    selfDot.classList.add('online');
    selfStatusText.innerText = 'Online';
    allUsers.set(myId, { online: true });
    
    // broadcast registration and full list for sync
    broadcast('register', { id: myId });
    const userListForSync = Array.from(allUsers.entries()).map(([id, info]) => ({ id, online: info.online }));
    broadcast('syncUsers', { usersList: userListForSync });
    
    renderContactList();
    addSystemMessage(`✅ Registered as "${myId}" — You are now ONLINE`);
    if (selectedContactId && !allUsers.has(selectedContactId)) selectedContactId = null;
}

// ---------- Send text ----------
function sendText() {
    if (!myId) { alert('Register first (left panel)'); return; }
    if (!selectedContactId) { alert('Select a contact from the left list'); return; }
    const targetOnline = allUsers.has(selectedContactId) ? allUsers.get(selectedContactId).online : false;
    if (!targetOnline) { alert('Selected user is offline. Cannot send.'); return; }
    const text = messageInput.value.trim();
    if (!text) return;
    
    broadcast('text', { fromId: myId, text: text });
    displayMessage(myId, text, true);
    messageInput.value = '';
}

// ---------- Send file ----------
let selectedFile = null;
chooseFileBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => {
    if (fileInput.files.length) {
        selectedFile = fileInput.files[0];
        fileNameSpan.innerText = selectedFile.name;
    } else {
        selectedFile = null;
        fileNameSpan.innerText = 'No file';
    }
};

function sendFile() {
    if (!myId) { alert('Register first'); return; }
    if (!selectedContactId) { alert('Select a contact'); return; }
    const targetOnline = allUsers.has(selectedContactId) ? allUsers.get(selectedContactId).online : false;
    if (!targetOnline) { alert('Target offline'); return; }
    if (!selectedFile) { alert('Choose a file first'); return; }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
        const dataURL = ev.target.result;
        broadcast('file', { fromId: myId, fileName: selectedFile.name, fileDataURL: dataURL });
        displayFileMessage(myId, selectedFile.name, dataURL);
        selectedFile = null;
        fileInput.value = '';
        fileNameSpan.innerText = 'No file';
    };
    reader.readAsDataURL(selectedFile);
}

// ---------- Copy ONLY text (no timestamps, no sender) ----------
function copyTextOnly() {
    if (receivedPlainTexts.length === 0) {
        showToastMessage('No text messages to copy');
        return;
    }
    const plainText = receivedPlainTexts.join('\n');
    navigator.clipboard.writeText(plainText).then(() => {
        showToastMessage(`📋 Copied ${receivedPlainTexts.length} text message(s)`);
    }).catch(() => alert('Copy failed'));
}

function clearChat() {
    messagesContainer.innerHTML = '<div class="msg-bubble info">✨ Chat cleared</div>';
    receivedPlainTexts = [];   // also clear the stored text for copy button
    showToastMessage('Chat cleared');
}

// ---------- Event listeners ----------
registerBtn.addEventListener('click', registerMe);
sendTextBtn.addEventListener('click', sendText);
sendFileBtn.addEventListener('click', sendFile);
copyReceivedTextBtn.addEventListener('click', copyTextOnly);
clearChatBtn.addEventListener('click', clearChat);

// Initial placeholder
addSystemMessage('👋 Register your ID (left panel). Open another tab, register another ID, then start sharing.');
