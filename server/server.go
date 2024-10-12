package main

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Server struct {
	clients            map[uint16]*Client
	clientsLock        *sync.RWMutex
	delta_ticker       <-chan time.Time
	snapshot_ticker    <-chan time.Time
	changedPlayers     map[uint16]*Player
	changedPlayersLock *sync.RWMutex
}

const DELTA_SPEED = 1 * time.Second

// const DELTA_SPEED = 16 * time.Millisecond

const SNAPSHOT_SPEED = 10 * time.Second

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

func newServer() *Server {
	delta_ticker := time.Tick(DELTA_SPEED)
	snapshot_ticker := time.Tick(SNAPSHOT_SPEED)
	server := Server{
		clients:            map[uint16]*Client{},
		changedPlayers:     map[uint16]*Player{},
		delta_ticker:       delta_ticker,
		snapshot_ticker:    snapshot_ticker,
		clientsLock:        &sync.RWMutex{},
		changedPlayersLock: &sync.RWMutex{}}
	go server.publishServerDeltas()
	go server.publishServerSnapshots()
	return &server
}

func (server *Server) newClient(conn *websocket.Conn) Client {
	server.clientsLock.Lock()
	var picked_id uint16
	for id := range uint16(1000) {
		if _, ok := server.clients[id]; !ok {
			log.Println("id found", id)
			picked_id = id
			break
		}
	}
	if picked_id >= 1000 {
		log.Fatal("No IDs left")
	}
	log.Println("ID", picked_id)
	client := newClient(conn, picked_id)
	server.clients[client.id] = &client
	server.clientsLock.Unlock()
	return client
}

func (server *Server) removeClient(client Client) {
	server.clientsLock.Lock()
	delete(server.clients, client.id)
	server.clientsLock.Unlock()
}

func (server *Server) updatePlayer(player *Player, bytes []byte) {
	player.updatePosition(bytes)
	server.changedPlayersLock.Lock()
	server.changedPlayers[player.Id] = player
	server.changedPlayersLock.Unlock()
}

func (server *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	socketConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal("upgrade err:", err)
		return
	}
	defer socketConn.Close()

	client := server.newClient(socketConn)
	defer server.removeClient(client)

	for {
		_, message, err := socketConn.ReadMessage()

		if err != nil {
			log.Println("read err:", err)
			break
		}

		if len(message) == 4 {
			server.updatePlayer(client.curPlayer, message)
		}
	}
}

func (server *Server) publishServerDeltas() {
	for range server.delta_ticker {
		if len(server.changedPlayers) == 0 {
			continue
		}

		server.changedPlayersLock.Lock()
		localPlayers := server.changedPlayers
		server.changedPlayers = map[uint16]*Player{}
		server.changedPlayersLock.Unlock()

		players := make([]Player, len(localPlayers))

		i := 0
		for _, player := range localPlayers {
			players[i] = *player
			i++
		}

		message := createPlayerDeltaMessage(players)

		server.clientsLock.RLock()
		for _, client := range server.clients {
			go client.sendMessage(message)
		}
		server.clientsLock.RUnlock()
	}
}

func (server Server) publishServerSnapshots() {
	for range server.snapshot_ticker {
		if len(server.clients) == 0 {
			continue
		}

		server.clientsLock.RLock()

		players := make([]Player, len(server.clients))
		i := 0
		for _, client := range server.clients {
			players[i] = *client.curPlayer
			i++
		}

		server.clientsLock.RUnlock()

		message := createPlayerSnapshotMessage(players)

		server.clientsLock.RLock()
		for _, client := range server.clients {
			go client.sendMessage(message)
		}
		server.clientsLock.RUnlock()
	}
}
