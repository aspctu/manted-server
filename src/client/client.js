import { initViewer } from "./init-viewer";

const params = new URLSearchParams(window.location.search);
const roomName = params.get("roomName");

if (roomName) {
  console.log("initting viewer");
  initViewer(roomName);
}
