import * as rrweb from "@yunyu/rrweb-patched";

export const initViewer = (roomName) => {
  const playerWrapper = document.getElementById("player");
  const connectingEl = document.createElement("div");
  connectingEl.textContent = "Waiting for host...";
  connectingEl.classList.add("connecting");
  playerWrapper.appendChild(connectingEl);

  const viewerCountEl = document.getElementById("viewer-count");

  const roomClosedTask = window.setTimeout(() => {
    connectingEl.textContent = "This session has already ended.";
  }, 3000);

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
      window.clearTimeout(roomClosedTask);

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

      console.log("replayFrames", replayFrames);
      const rrplayer = new rrweb.Replayer(
        replayFrames.map(([frame]) => frame),
        { liveMode: true, root: document.getElementById("player") }
      );

      const offset = lastReplayTimestamp - firstReplayTimestamp;
      console.log("offset", offset);
      playerWrapper.removeChild(connectingEl);
      rrplayer.play(offset);
      player = rrplayer;
    } else if (type === "FRAMES") {
      if (player !== null) {
        for (const [frame, isCheck] of message.frames) {
          player.addEvent(frame);
        }
      }
    } else if (type === "viewerCount") {
      const { value } = message;
      viewerCountEl.textContent = `${value} viewing this session`;
      viewerCountEl.classList.add("connected");
    }
  });

  ws.addEventListener("close", () => {
    const playerEl = document.getElementsByClassName("replayer-wrapper")[0];
    const doneEl = document.createElement("div");
    doneEl.textContent = "Session ended";
    doneEl.classList.add("ended");
    viewerCountEl.classList.remove("connected");
    playerEl.appendChild(doneEl);
  });
};
