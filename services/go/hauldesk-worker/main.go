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
	"errors"
	"fmt"
	"log"
	"math"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"
)

// osrmBreaker trips after consecutive OSRM failures so a persistently
// unreachable router stops costing every caller the full dial timeout.
//
// Without it, an environment that can't reach OSRM at all (locked-down egress,
// OSRM down, no OSRM_URL configured on a private network) pays the connect
// budget on EVERY /route/miles call — measured at ~342ms per request against
// the public demo host from a sandbox that blocks it — before returning the
// same great-circle answer it could have returned instantly. Miles are
// unchanged either way; only the wasted wait goes away.
//
// Deliberately conservative: one success closes it, and it re-probes after the
// cooldown, so a transient blip degrades for at most one cooldown window
// rather than pinning the worker to haversine until restart.
type osrmBreaker struct {
	mu        sync.Mutex
	failures  int
	openedAt  time.Time
	threshold int
	cooldown  time.Duration
}

var breaker = &osrmBreaker{threshold: 3, cooldown: 60 * time.Second}

// allow reports whether an OSRM call should be attempted now.
func (b *osrmBreaker) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.failures < b.threshold {
		return true
	}
	// Open: stay shut until the cooldown elapses, then allow one probe.
	if time.Since(b.openedAt) >= b.cooldown {
		b.failures = b.threshold - 1 // one more failure re-opens immediately
		return true
	}
	return false
}

func (b *osrmBreaker) recordSuccess() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.failures = 0
}

// reset returns the breaker to its closed, never-failed state. The handler uses
// one package-level breaker (its whole point is state shared across requests),
// which would otherwise leak between tests and make them order-dependent — a
// test that exercises the unreachable-OSRM path would trip the breaker and the
// next test would see its stubbed OSRM skipped. The shared test helper calls
// this so every case starts closed.
func (b *osrmBreaker) reset() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.failures = 0
	b.openedAt = time.Time{}
}

func (b *osrmBreaker) recordFailure() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.failures++
	if b.failures == b.threshold {
		b.openedAt = time.Now()
	}
}

type latLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// valid reports whether the point is a real WGS84 coordinate. JSON cannot
// carry NaN/Inf, so a plain range check is sufficient. Out-of-range values
// are always a client bug (swapped lat/lng, meters instead of degrees) and
// must be rejected up front: they would otherwise be proxied to OSRM as
// garbage, and haversineMiles on nonsense latitudes can leave asin's domain
// and return NaN — which json.Encode refuses after the 200 header is already
// written, producing an empty-body 200.
func (p latLng) valid() bool {
	return p.Lat >= -90 && p.Lat <= 90 && p.Lng >= -180 && p.Lng <= 180
}

type routeMilesRequest struct {
	Origin latLng `json:"origin"`
	Dest   latLng `json:"dest"`
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	srv := newServer(":8081")
	ln, err := net.Listen("tcp", srv.Addr)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("hauldesk-worker listening on %s (auth: %v)", srv.Addr, os.Getenv("HAULDESK_SIDECAR_SECRET") != "")
	if err := run(ctx, srv, ln); err != nil {
		log.Fatal(err)
	}
}

// run serves srv on ln until ctx is canceled, then drains in-flight requests
// via Shutdown before returning, so a container restart/redeploy never cuts
// off a request mid-OSRM-call (a bare os.Exit on SIGTERM would). Kept
// separate from main so both the shutdown path (plain context cancellation,
// no real OS signal needed) and listener failures (a fake net.Listener) are
// testable by fault injection — main passes the real bound listener, tests
// pass one that fails on demand.
func run(ctx context.Context, srv *http.Server, ln net.Listener) error {
	serveErr := make(chan error, 1)
	go func() { serveErr <- srv.Serve(ln) }()

	select {
	case err := <-serveErr:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		// 10s: comfortably above /route/miles's 10s OSRM budget, so a request
		// mid-flight when shutdown starts gets to finish rather than being cut
		// off by the deadline.
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			return err
		}
		if err := <-serveErr; err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	}
}

// newServer builds the worker's HTTP server; main and the test suite share it
// so the timeout config is asserted as deployed. http.ListenAndServe's
// zero-value timeouts never close slow or idle connections (slowloris: a
// client trickling one header byte at a time holds a goroutine forever), so
// even a LAN-only sidecar gets explicit limits. WriteTimeout starts when the
// request header is read and therefore covers handler time — /route/miles
// waits up to 10s on OSRM, so it must stay well above that.
func newServer(addr string) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           newMux(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

// newMux wires all routes; main and the test suite share this exact wiring
// so the /health-stays-open and secret-gating properties are tested as built.
func newMux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.Handle("/route/miles", requireSecret(http.HandlerFunc(routeMilesHandler)))
	return mux
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

	// A route request is two coordinate pairs — nothing legitimate needs more
	// than a few hundred bytes. Cap it well above that so a client streaming
	// an unbounded body can't hold the handler reading forever (this worker
	// has no user auth of its own; only the TS gateway is meant to reach it,
	// but trusting the gateway doesn't mean trusting whatever reaches it).
	r.Body = http.MaxBytesReader(w, r.Body, 16<<10) // 16 KiB
	var req routeMilesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if !req.Origin.valid() || !req.Dest.valid() {
		http.Error(w, "coordinates out of range", http.StatusBadRequest)
		return
	}

	// Skip the call entirely while the breaker is open — the answer below is
	// what a failed call would have produced anyway, just without the wait.
	if breaker.allow() {
		if miles, err := osrmMiles(r.Context(), req.Origin, req.Dest); err == nil {
			breaker.recordSuccess()
			writeJSON(w, http.StatusOK, map[string]any{"miles": miles, "source": "osrm"})
			return
		} else {
			breaker.recordFailure()
		}
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
