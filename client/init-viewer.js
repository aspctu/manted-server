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
    console.log("recv", type);
    if (type === "REPLAY_BATCH") {
      const replayFrames = message.frames;
      const firstReplayTimestamp = replayFrames[0][0].timestamp;
      const lastReplayTimestamp =
        replayFrames[replayFrames.length - 1][0].timestamp;

      for (const frame of queuedFrames) {
        if (frame[0].timestamp > lastReplayTimestamp) {
          replayFrames.push(frame);
        }
      }
      queuedFrames = [];
      const rrplayer = new rrweb.Replayer(
        replayFrames.map(([frame]) => frame),
        { liveMode: true }
      );
      const offset = lastReplayTimestamp - firstReplayTimestamp;
      console.log("offset", offset);
      rrplayer.play(offset);
      player = rrplayer;
    } else if (type === "FRAMES") {
      if (player !== null) {
        for (const [frame, isCheck] of message.frames) {
          if (isCheck) {
            console.log("check frame recv");
          }
          player.addEvent(frame);
        }
      }
    }
  });
};