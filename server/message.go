package main

import (
	"encoding/binary"
	"log"
)

const (
	LocalPlayer uint8 = 0
	Delta       uint8 = 1
	Snapshot    uint8 = 2
)

type Message struct {
	Type uint8
	Msg  any
	bin  []byte
}

func createMessage(message_type uint8, message_data any) Message {
	bin := make([]byte, binary.Size(message_type)+binary.Size(message_data))
	_, err := binary.Encode(bin, binary.NativeEndian, message_type)
	if err != nil {
		log.Fatal("Message_Type to Binary Error", err)
	}
	_, err = binary.Encode(bin[1:], binary.NativeEndian, message_data)
	if err != nil {
		log.Fatal("Message_Contents to Binary Error", err)
	}
	return Message{Type: message_type, Msg: message_data, bin: bin}
}

func createPlayerIDMessage(player Player) Message {
	return createMessage(LocalPlayer, player)
}

func createPlayerDeltaMessage(players []Player) Message {
	return createMessage(Delta, players)
}

func createPlayerSnapshotMessage(players []Player) Message {
	return createMessage(Snapshot, players)
}
