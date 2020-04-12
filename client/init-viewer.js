import * as rrweb from "@yunyu/rrweb-patched";

export const initViewer = (roomName) => {
  const ws = new WebSocket("ws://" + window.location.host);
  ws.addEventListener("open", () => {
    console.log("opened");
    ws.send(JSON.stringify({ type: "joinRoom", roomName }));
  });

  ws.addEventListener("message", (msg) => {
    const { type, ...message } = JSON.parse(msg.data);
    console.log(type, message);
  });
};
