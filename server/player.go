package main

import (
	"encoding/binary"
	"fmt"
)

type Player struct {
	X  uint16
	Y  uint16
	Id uint16
}

func newPlayer(id uint16) *Player {
	return &Player{Id: id}
}

func (p Player) String() string {
	return fmt.Sprintf("%v:(%v,%v)", p.Id, p.X, p.Y)
}

func (p *Player) updatePosition(bytes []byte) {
	p.X = binary.LittleEndian.Uint16(bytes[:2])
	p.Y = binary.LittleEndian.Uint16(bytes[2:])
}
