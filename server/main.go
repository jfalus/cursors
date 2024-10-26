package main

import (
	"fmt"
	"net/http"
)

func hello(w http.ResponseWriter, req *http.Request) {
	fmt.Fprintf(w, "hello\n")
}

func main() {
	PORT := 8090

	server := newServer()

	http.HandleFunc("/hello", hello)
	http.HandleFunc("/websocket", server.handleWebSocket)

	fs := http.FileServer(http.Dir("../client"))
	http.Handle("/", fs)

	address := fmt.Sprintf("localhost:%v", PORT)

	fmt.Printf("Listening on %v\n", address)

	http.ListenAndServe(address, nil)
}
