import { gameLoop } from './game.js'

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function setup() {
    console.clear()
    const game = document.getElementById("game");
    game.width = CANVAS_WIDTH
    game.height = CANVAS_HEIGHT
    const state = {
        box: game.getBoundingClientRect(),
        localPlayer: { X: 0, Y: 0, Id: -1 },
        ctx: game.getContext("2d"),
        socket: new WebSocket("ws://localhost:8090/websocket"),
        serverPlayers: {},
    };
    state.socket.binaryType = "arraybuffer"
    const listner = (e) => updatePosition(state, e);
    game.addEventListener("mousemove", listner);
    game.addEventListener("mouseenter", listner);
    game.addEventListener("mouseleave", listner);


    // Listen for messages
    state.socket.addEventListener("message", (e) => handleSocket(state, e.data))

    window.requestAnimationFrame(() => gameLoop(state));
}

function parseAsPlayer(data) {
    console.assert(data.length == 3, `parse as player has length=${data.length}`)
    return {
        X: data[0],
        Y: data[1],
        Id: data[2],
    }
}

function handleSocket(state, data) {
    console.log(data)
    const messageType = new Uint8Array(data.slice(0, 1))[0];
    const uint16Arr = new Uint16Array(data.slice(1))

    switch (messageType) {
        case 0: //"LocalPlayer"
            const player = parseAsPlayer(uint16Arr);
            state.localPlayer = player
            state.serverPlayers[player.Id] = player
            break
        case 1: //"Delta"
            for (let i = 0; i < uint16Arr.length / 3; i++) {
                const player = parseAsPlayer(uint16Arr.slice(i * 3, (i + 1) * 3));
                state.serverPlayers[player.Id] = player
            }
            break
        case 2: //"Snapshot"
            const newServerPlayers = {}
            for (let i = 0; i < uint16Arr.length / 3; i++) {
                const player = parseAsPlayer(uint16Arr.slice(i * 3, (i + 1) * 3))
                newServerPlayers[player.Id] = player
            }
            state.serverPlayers = newServerPlayers
            break
        default:
            console.error(`Invalid message type: ${messageType}`)
    }
}

function clamp(n, min, max) {
    return n > max ? max : n < min ? min : n;
}

function updatePosition(state, e) {
    const localPlayer = state.localPlayer
    localPlayer.X = clamp(e.offsetX, 0, CANVAS_WIDTH)
    localPlayer.Y = clamp(e.offsetY, 0, CANVAS_HEIGHT)
    state.socket.send(new Int16Array([localPlayer.X, localPlayer.Y]));
}

function draw(state) {
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
