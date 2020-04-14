const WebSocket = require("ws");
const express = require("express");
const http = require("http");

const app = express();
app.use(express.static("client/public"));
const server = http.createServer(app);

const wss = new WebSocket.Server({
  server,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024,
  },
});

/*
rooms: Map<string, {host: WSCLient, guests: WSClient[], replayFrames: any[] }>
*/

const rooms = new Map();

wss.on("connection", (ws) => {
  let roomName = null;
  let connectedRoom = null;

  const sendViewerCount = () => {
    if (!connectedRoom) {
      return;
    }

    // console.log("sending viewer count: ", connectedRoom.guests.length);
    ws.send(
      JSON.stringify({
        type: "viewerCount",
        value: connectedRoom.guests.length,
      })
    );
  };

  const viewerCountInterval = setInterval(sendViewerCount, 1000);
  sendViewerCount();

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
      if (connectedRoom) {
        for (const guest of connectedRoom.guests) {
          guest.send(
            JSON.stringify({ type: "FRAMES", frames: message.frames })
          );
        }

        for (const frame of message.frames) {
          // Replay frame start
          if (frame[1]) {
            connectedRoom.replayFrames = [];
          }
          // console.log(frame);
          connectedRoom.replayFrames.push(frame);
        }
      }
    }
  });

  ws.on("close", () => {
    if (viewerCountInterval !== null) {
      clearInterval(viewerCountInterval);
    }
    if (!connectedRoom) return;

    if (connectedRoom.host === ws) {
      rooms.delete(roomName);
      for (const guest of connectedRoom.guests) {
        guest.close();
      }
      console.log(`Host stopped sharing for ${roomName}`);
    } else {
      const idx = connectedRoom.guests.indexOf(ws);
      if (idx > -1) {
        connectedRoom.guests.splice(idx, 1);
      }
      console.log(`Disconnected client from ${roomName}`);
    }
  });
});

server.listen(process.env.PORT ? parseInt(process.env.PORT) : 8082);
