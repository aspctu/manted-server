import * as rrweb from "@yunyu/rrweb-patched";

export const initViewer = (roomName) => {
  const ws = new WebSocket("ws://" + window.location.host);
  ws.addEventListener("open", () => {
    console.log("opened");
    ws.send(JSON.stringify({ type: "joinRoom", roomName }));
  });

  let player = null;
  let queuedFrames = [];

  ws.addEventListener("message", (msg) => {
    const { type, ...message } = JSON.parse(msg.data);
    if (type === "REPLAY_BATCH") {
      const replayFrames = message.frames;
      const lastReplayTimestamp =
        replayFrames[replayFrames.length - 1][0].timestamp;
      for (const frame of queuedFrames) {
        if (frame[0].timestamp > lastReplayTimestamp) {
          replayFrames.push(frame);
        }
      }
      queuedFrames = [];
      player = new rrweb.Replayer(replayFrames.map(([frame]) => frame));
      player.play();
    }
  });
};
