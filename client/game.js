


export function gameLoop(state) {
    state.ctx.clearRect(0, 0, state.box.width, state.box.height);

    drawLevel(state)

    state.ctx.fillStyle = "white";
    state.ctx.fillText(`(${state.localPlayer.X},${state.localPlayer.Y})`, 10, 10);

    state.ctx.fillStyle = "blue";
    state.ctx.fillRect(state.localPlayer.X - 1, state.localPlayer.Y - 1, 3, 3);

    state.ctx.fillStyle = "red";
    for (const player of Object.values(state.serverPlayers)) {
        state.ctx.fillRect(player.X - 1, player.Y - 1, 3, 3);
    }

    window.requestAnimationFrame(() => gameLoop(state));
}

function drawLevel(state){
    state.ctx.fillStyle = "cyan";
    state.ctx.fillRect(50,50,50,50)
}

// function onGameLoad(state:State){

// }



