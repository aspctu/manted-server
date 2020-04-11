const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

/*
rooms: Map<string, {host: WSCLient, guests: WSClient[]}>
*/

const rooms = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const message = JSON.parse(msg);
    if (message.type === "makeRoom") {
      const { roomName } = message;
      if (!rooms.has(roomName)) {
        console.log(`Making room ${roomName}`);
        rooms.set(roomName, { host: ws, guests: [] });
      }
    } else if (message.type === "joinRoom") {
      const { roomName } = message;
      if (rooms.has(roomName)) {
        rooms.get(roomName).guests.push(ws);
      }
    } else if (message.type === "sendFrame") {
    } else if (message.type === "sendDelta") {
    }
  });
});
