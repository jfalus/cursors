package main

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	curPlayer *Player
	socket    *websocket.Conn
	writeLock *sync.Mutex
	id        uint16
}

func newClient(conn *websocket.Conn, id uint16) Client {
	player := newPlayer(id)
	client := Client{
		curPlayer: player,
		socket:    conn,
		writeLock: &sync.Mutex{},
		id:        id,
	}
	client.sendMessage(createPlayerIDMessage(*player))
	return client
}

func (client Client) sendMessage(message Message) {
	log.Println("Sending", message)
	client.writeLock.Lock()
	err := client.socket.WriteMessage(websocket.BinaryMessage, message.bin)
	client.writeLock.Unlock()
	if err == websocket.ErrCloseSent {
		log.Println("write err (socket close):", err)
	} else if err != nil {
		log.Fatal("write err:", err)
	}
}
