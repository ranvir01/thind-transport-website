// HaulDesk Go worker — routing proxy and (future) integration-sync jobs.
//
// Security: when HAULDESK_SIDECAR_SECRET is set, every route except /health
// requires a matching X-Hauldesk-Secret header. The TS gateway (sidecars.ts)
// sends it from the same env var. Never expose this service publicly without
// the secret — it has no user auth of its own.
//
// /route/miles proxies OSRM (OSRM_URL, defaulting to the public demo — same
// contract as src/lib/hub/routing.ts) and falls back to great-circle miles
// only when OSRM is unreachable, so pointing the gateway at this worker never
// gives worse answers than calling OSRM directly.
package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"strings"
	"time"
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
	mux.Handle("/route/miles", requireSecret(http.HandlerFunc(routeMilesHandler)))

	addr := ":8081"
	log.Printf("hauldesk-worker listening on %s (auth: %v)", addr, os.Getenv("HAULDESK_SIDECAR_SECRET") != "")
	log.Fatal(http.ListenAndServe(addr, mux))
}

// requireSecret gates work endpoints behind HAULDESK_SIDECAR_SECRET when set.
// Constant-time compare; /health stays open for load-balancer checks.
func requireSecret(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		secret := os.Getenv("HAULDESK_SIDECAR_SECRET")
		if secret != "" {
			got := r.Header.Get("X-Hauldesk-Secret")
			if subtle.ConstantTimeCompare([]byte(got), []byte(secret)) != 1 {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
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

	if miles, err := osrmMiles(r.Context(), req.Origin, req.Dest); err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"miles": miles, "source": "osrm"})
		return
	}

	// OSRM down/unreachable: great-circle is a floor, not an answer of record —
	// the TS gateway treats any reply here as authoritative, so mark the source.
	miles := math.Round(haversineMiles(req.Origin.Lat, req.Origin.Lng, req.Dest.Lat, req.Dest.Lng))
	writeJSON(w, http.StatusOK, map[string]any{"miles": miles, "source": "haversine-fallback"})
}

// osrmMiles calls OSRM route/v1/driving — the same contract routing.ts uses,
// so a self-hosted OSRM_URL removes the public demo's rate limit for both.
func osrmMiles(ctx context.Context, origin, dest latLng) (float64, error) {
	base := strings.TrimRight(os.Getenv("OSRM_URL"), "/")
	if base == "" {
		base = "https://router.project-osrm.org"
	}
	url := fmt.Sprintf("%s/route/v1/driving/%f,%f;%f,%f?overview=false",
		base, origin.Lng, origin.Lat, dest.Lng, dest.Lat)

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("osrm status %d", res.StatusCode)
	}

	var payload struct {
		Routes []struct {
			Distance float64 `json:"distance"`
		} `json:"routes"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return 0, err
	}
	if len(payload.Routes) == 0 || payload.Routes[0].Distance <= 0 {
		return 0, fmt.Errorf("osrm returned no route")
	}
	const metersPerMile = 1609.344
	return math.Round(payload.Routes[0].Distance / metersPerMile), nil
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
