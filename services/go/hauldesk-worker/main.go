package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
)

type latLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type routeMilesRequest struct {
	Origin latLng `json:"origin"`
	Dest   latLng `json:"dest"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/route/miles", routeMilesHandler)

	addr := ":8081"
	log.Printf("hauldesk-worker listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"service": "hauldesk-worker",
		"status":  "ok",
	})
}

func routeMilesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req routeMilesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// Stub: great-circle miles until OSRM/GraphHopper proxy is wired here.
	miles := math.Round(haversineMiles(req.Origin.Lat, req.Origin.Lng, req.Dest.Lat, req.Dest.Lng))
	writeJSON(w, http.StatusOK, map[string]any{
		"miles":  miles,
		"source": "stub-haversine",
		"note":   "Replace with OSRM route/v1/driving proxy",
	})
}

func haversineMiles(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadiusMiles = 3958.7613
	toRad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthRadiusMiles * math.Asin(math.Sqrt(a))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
