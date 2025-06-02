const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let users = [];
let messages = [];

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send existing messages
  ws.send(JSON.stringify({ type: 'init', messages }));

  // Broadcast user list
  const broadcastUsers = () => {
    wss.clients.forEach((client) => {
      client.send(
        JSON.stringify({
          type: 'users',
          users: users.map((u) => ({ ...u, status: 'online' })),
        })
      );
    });
  };

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'login') {
        const { username } = data;
        if (!users.find((u) => u.name === username)) {
          users.push({ name: username });
        }
        broadcastUsers();
      } else if (data.type === 'message') {
        const messageWithTimestamp = {
          ...data.payload,
          timestamp: Date.now(),
        };
        messages.push(messageWithTimestamp);

        // Broadcast to all clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'message', payload: messageWithTimestamp }));
          }
        });
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  });

  // Remove user on disconnect
  ws.on('close', () => {
    const index = users.findIndex((u) => u.status === 'offline');
    users = users.filter((u) => u.status !== 'offline');

    users = users.map((u) => ({
      ...u,
      status: 'offline',
    }));

    setTimeout(() => {
      users = users.filter((u) => u.status === 'online');
      broadcastUsers();
    }, 5000);
  });
});

console.log('WebSocket server running on ws://localhost:8080');