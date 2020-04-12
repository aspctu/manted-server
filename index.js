const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8082 });

/*
rooms: Map<string, {host: WSCLient, guests: WSClient[], replayFrames: any[] }>
*/

const rooms = new Map();

wss.on("connection", (ws) => {
  let roomName = null;
  let connectedRoom = null;

  ws.on("message", (msg) => {
    const { type, ...message } = JSON.parse(msg);
    if (type === "makeRoom") {
      roomName = message.roomName;
      if (!rooms.has(roomName)) {
        console.log(`Making room ${roomName}`);
        connectedRoom = { host: ws, guests: [] };
        rooms.set(roomName, connectedRoom);
      }
    } else if (type === "joinRoom") {
      roomName = message.roomName;
      if (rooms.has(roomName)) {
        connectedRoom = rooms.get(roomName);
        connectedRoom.guests.push(ws);
        ws.send(
          JSON.stringify({
            type: "REPLAY_BATCH",
            frames: connectedRoom.replayFrames,
          })
        );
      }
    } else if (type === "frames") {
      for (const guest of connectedRoom.guests) {
        guest.send(JSON.stringify({ type: "FRAMES", frames: message.frames }));
      }

      for (const frame of message.frames) {
        // Replay frame start
        if (frame[1]) {
          connectedRoom.replayFrames = [];
        }
        connectedRoom.replayFrames.push(frame);
      }
    }
  });

  ws.on("close", (ws) => {
    if (connectedRoom.host === ws) {
      rooms.delete(roomName);
      for (const guest of connectedRoom.guests) {
        guest.close();
      }
    } else {
      const idx = connectedRoom.guests.indexOf(ws);
      if (idx > -1) {
        connectedRoom.guests.splice(idx, 1);
      }
    }
  });
});
