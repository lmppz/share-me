const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname)));

// Store registered users: { userId: { online: true, socketId, ... } }
const registeredUsers = new Map();

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Register user
    socket.on('register', (userId, callback) => {
        const normalizedId = userId.trim().toLowerCase();
        if (!normalizedId) {
            callback({ success: false, reason: 'Invalid ID' });
            return;
        }

        // Store or update
        registeredUsers.set(normalizedId, {
            socketId: socket.id,
            online: true,
            userId: normalizedId
        });

        // Join room with their ID
        socket.join(normalizedId);
        
        callback({ success: true, id: normalizedId });
        
        // Broadcast to all senders that status changed
        io.emit('status-change', { id: normalizedId, online: true });
        console.log(`User registered: ${normalizedId}`);
    });

    // Unregister (on disconnect)
    socket.on('unregister', (userId) => {
        if (userId) {
            const normalized = userId.trim().toLowerCase();
            registeredUsers.delete(normalized);
            io.emit('status-change', { id: normalized, online: false });
            console.log(`User unregistered: ${normalized}`);
        }
    });

    // Check if user is online
    socket.on('check-online', (targetId, callback) => {
        const normalized = targetId.trim().toLowerCase();
        const user = registeredUsers.get(normalized);
        const isOnline = !!(user && user.online);
        callback({ online: isOnline });
    });

    // Send text message
    socket.on('send-text', (data, callback) => {
        const { targetId, message, senderId } = data;
        const normalizedTarget = targetId.trim().toLowerCase();
        const targetUser = registeredUsers.get(normalizedTarget);

        if (!targetUser || !targetUser.online) {
            callback({ success: false, reason: 'Receiver offline or not registered' });
            return;
        }

        io.to(targetUser.socketId).emit('receive-text', {
            from: senderId || 'Sender',
            message: message,
            timestamp: new Date().toISOString()
        });

        callback({ success: true });
        console.log(`Text sent to ${normalizedTarget}: ${message.substring(0, 50)}`);
    });

    // Send file (as base64)
    socket.on('send-file', (data, callback) => {
        const { targetId, fileName, fileData, fileType, senderId } = data;
        const normalizedTarget = targetId.trim().toLowerCase();
        const targetUser = registeredUsers.get(normalizedTarget);

        if (!targetUser || !targetUser.online) {
            callback({ success: false, reason: 'Receiver offline or not registered' });
            return;
        }

        io.to(targetUser.socketId).emit('receive-file', {
            from: senderId || 'Sender',
            fileName: fileName,
            fileData: fileData,
            fileType: fileType,
            timestamp: new Date().toISOString()
        });

        callback({ success: true });
        console.log(`File sent to ${normalizedTarget}: ${fileName}`);
    });

    // On disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Find and remove user
        for (let [userId, info] of registeredUsers.entries()) {
            if (info.socketId === socket.id) {
                registeredUsers.delete(userId);
                io.emit('status-change', { id: userId, online: false });
                console.log(`User ${userId} disconnected (offline)`);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
