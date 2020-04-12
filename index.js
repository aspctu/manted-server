const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8082 });

/*
rooms: Map<string, {host: WSCLient, guests: WSClient[]}>
*/

const rooms = new Map();

wss.on("connection", (ws) => {
  // let connectedRoom = null;

  ws.on("message", (msg) => {
    const { type, ...message } = JSON.parse(msg);
    if (type === "makeRoom") {
      const { roomName } = message;
      console.log("room receive", roomName);
      if (!rooms.has(roomName)) {
        console.log(`Making room ${roomName}`);
        rooms.set(roomName, { host: ws, guests: [] });
      }
    } else if (type === "joinRoom") {
      const { roomName } = message;
      if (rooms.has(roomName)) {
        rooms.get(roomName).guests.push(ws);
        connectedRoom = roomName;
      }
    } else if (type === "frames") {
      console.log(message);
    }
  });

  /*
  ws.on("close", (ws) => {
    const room = rooms.get(connectedRoom) || [];
    const idx = room.indexOf(idx);
    if (idx > -1) {
      room.splice(idx, 1);
    }
    clientsToRooms.delete(ws);
  });
  */
});
