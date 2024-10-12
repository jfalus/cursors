type Player = { X: number; Y: number, Id: number };

type State = {
  box: DOMRect;
  localPlayer: Player;
  ctx: CanvasRenderingContext2D;
  socket: WebSocket;
  serverPlayers: { [index: string]: Player };
};

function setup() {
  const game = document.getElementsByTagName("canvas")[0];
  const state: State = {
    box: game.getBoundingClientRect(),
    localPlayer: { X: 0, Y: 0, Id: -1 },
    ctx: game.getContext("2d")!,
    socket: new WebSocket("ws://localhost:8090/websocket"),
    serverPlayers: {},
  };
  state.socket.binaryType = "arraybuffer"
  const listner = (e: MouseEvent) => updatePosition(state, e);
  game.addEventListener("mousemove", listner);
  game.addEventListener("mouseenter", listner);
  game.addEventListener("mouseleave", listner);


  // Listen for messages
  state.socket.addEventListener("message", (e) => handleSocket(state, e.data))

  window.requestAnimationFrame(() => draw(state));
}

function parseAsPlayer(data: Uint16Array): Player {
  console.assert(data.length == 3, `parse as player has length=${data.length}`)
  return {
    X: data[0],
    Y: data[1],
    Id: data[2],
  }
}

function handleSocket(state: State, data: ArrayBuffer) {
  console.log(data)
  const messageType = new Uint8Array(data.slice(0, 1))[0];
  const uint16Arr = new Uint16Array(data.slice(1))

  switch (messageType) {
    case 0: //"LocalPlayer"
      const player: Player = parseAsPlayer(uint16Arr);
      console.log(player)
      state.localPlayer = player
      state.serverPlayers[player.Id] = player
      break
    case 1: //"Delta"
      const deltas: Player[] = [];
      for (let i = 0; i < uint16Arr.length / 3; i++) {
        deltas.push(parseAsPlayer(uint16Arr.slice(i * 3, (i + 1) * 3)))
      }
      for (const player of deltas) {
        state.serverPlayers[player.Id] = player
      }
      break
    case 2: //"Snapshot"
      const snapshot: Player[] = [];
      for (let i = 0; i < uint16Arr.length / 3; i++) {
        snapshot.push(parseAsPlayer(uint16Arr.slice(i * 3, (i + 1) * 3)))
      }
      state.serverPlayers = {}
      for (const player of snapshot) {
        state.serverPlayers[player.Id] = player
      }
      break
    default:
      console.error(`Invalid message type: ${messageType}`)
  }
}

function clamp(n: number, min: number, max: number) {
  return n > max ? max : n < min ? min : n;
}

function updatePosition(state: State, e: MouseEvent) {
  state.localPlayer.X = clamp(e.clientX - state.box.left, 0, 600)
  state.localPlayer.Y = clamp(e.clientY - state.box.top, 0, 400)
  state.socket.send(new Int16Array([state.localPlayer.X, state.localPlayer.Y]));
}

function draw(state: State) {
  state.ctx.clearRect(0, 0, state.box.width, state.box.height);
  state.ctx.fillStyle = "white";
  state.ctx.fillText(`(${state.localPlayer.X},${state.localPlayer.Y})`, 10, 10);
  state.ctx.fillStyle = "blue";
  state.ctx.fillRect(state.localPlayer.X - 1, state.localPlayer.Y - 1, 3, 3);
  state.ctx.fillStyle = "red";
  for (const player of Object.values(state.serverPlayers)) {
    state.ctx.fillRect(player.X - 1, player.Y - 1, 3, 3);
  }
  window.requestAnimationFrame(() => draw(state));
}

window.addEventListener("load", setup);
