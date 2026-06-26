package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"service": "hauldesk-api",
			"status":  "stub",
		})
	})
	log.Println("hauldesk-api stub listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
