import WebSocket from "ws";
import express from "express";
import http from "http";

const app = express();
app.use(express.static("dist/client"));
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

type RoomName = string | null;
interface Room {
  host: WebSocket;
  guests: WebSocket[];
  replayFrames?: any[];
}

const rooms = new Map<RoomName, Room>();

wss.on("connection", (ws: WebSocket) => {
  if (!ws) {
    console.log("huh");
  }
  let roomName: RoomName = null;
  let connectedRoom: Room | undefined = undefined;

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

  ws.on("message", (msg: string) => {
    const { type, ...message } = JSON.parse(msg);
    if (type === "makeRoom") {
      roomName = message.roomName;
      if (!rooms.has(roomName)) {
        console.log(`Making room ${roomName}`);
        connectedRoom = { host: ws, guests: [] };
        if (!connectedRoom) {
          return;
        }
        rooms.set(roomName, connectedRoom);
      }
    } else if (type === "joinRoom") {
      roomName = message.roomName;

      if (rooms.has(roomName)) {
        connectedRoom = rooms.get(roomName);
        if (!connectedRoom) {
          return;
        }
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

          connectedRoom.replayFrames?.push(frame);
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
