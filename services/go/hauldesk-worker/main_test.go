package main

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func doRequest(t *testing.T, method, path, body string, header http.Header) *httptest.ResponseRecorder {
	t.Helper()
	var reader *strings.Reader
	if body == "" {
		reader = strings.NewReader("")
	} else {
		reader = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, path, reader)
	for k, vs := range header {
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}
	rec := httptest.NewRecorder()
	newMux().ServeHTTP(rec, req)
	return rec
}

func decodeBody(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("response is not JSON: %v (body %q)", err, rec.Body.String())
	}
	return payload
}

func TestNewServerTimeouts(t *testing.T) {
	// http.ListenAndServe's zero-value timeouts never close slow or idle
	// connections (slowloris exposure if the worker is ever reachable beyond
	// the LAN), so the deployed server must carry explicit limits. The write
	// timeout covers handler time on HTTP/1.1 and /route/miles waits up to
	// 10s on OSRM — it must stay above that or slow OSRM answers get cut off.
	srv := newServer(":8081")
	if srv.Addr != ":8081" {
		t.Fatalf("expected addr :8081, got %q", srv.Addr)
	}
	if srv.ReadHeaderTimeout <= 0 {
		t.Fatal("ReadHeaderTimeout must be set (slowloris guard)")
	}
	if srv.ReadTimeout <= 0 {
		t.Fatal("ReadTimeout must be set (slow-body guard)")
	}
	if srv.WriteTimeout <= 10*time.Second {
		t.Fatalf("WriteTimeout must exceed the 10s OSRM budget, got %v", srv.WriteTimeout)
	}
	if srv.IdleTimeout <= 0 {
		t.Fatal("IdleTimeout must be set (idle keep-alive guard)")
	}

	// The server must serve the real mux: /health answers through srv.Handler.
	rec := httptest.NewRecorder()
	srv.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("server handler must wire newMux; /health got %d", rec.Code)
	}
}

func TestHealthOpenWithSecretSet(t *testing.T) {
	t.Setenv("HAULDESK_SIDECAR_SECRET", "s3cret")
	rec := doRequest(t, http.MethodGet, "/health", "", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("/health must stay open for LB checks even with secret set; got %d", rec.Code)
	}
	if payload := decodeBody(t, rec); payload["status"] != "ok" {
		t.Fatalf("unexpected health payload: %v", payload)
	}
}

func TestSecretGate(t *testing.T) {
	const body = `{"origin":{"lat":0,"lng":0},"dest":{"lat":0,"lng":1}}`
	// Unreachable OSRM so the handler answers via fallback rather than the network.
	t.Setenv("OSRM_URL", "http://127.0.0.1:1")

	t.Run("401 without header", func(t *testing.T) {
		t.Setenv("HAULDESK_SIDECAR_SECRET", "s3cret")
		rec := doRequest(t, http.MethodPost, "/route/miles", body, nil)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 without X-Hauldesk-Secret, got %d", rec.Code)
		}
	})

	t.Run("401 with wrong header", func(t *testing.T) {
		t.Setenv("HAULDESK_SIDECAR_SECRET", "s3cret")
		rec := doRequest(t, http.MethodPost, "/route/miles", body,
			http.Header{"X-Hauldesk-Secret": []string{"wrong"}})
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 with wrong secret, got %d", rec.Code)
		}
	})

	t.Run("200 with matching header", func(t *testing.T) {
		t.Setenv("HAULDESK_SIDECAR_SECRET", "s3cret")
		rec := doRequest(t, http.MethodPost, "/route/miles", body,
			http.Header{"X-Hauldesk-Secret": []string{"s3cret"}})
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 with matching secret, got %d (body %s)", rec.Code, rec.Body.String())
		}
	})

	t.Run("open when secret unset", func(t *testing.T) {
		t.Setenv("HAULDESK_SIDECAR_SECRET", "")
		rec := doRequest(t, http.MethodPost, "/route/miles", body, nil)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 when no secret configured, got %d", rec.Code)
		}
	})
}

// TestUnknownPathIs404 pins newMux's default-NotFound behavior, which no
// prior test exercised. Unlike the Rust sidecar (handle() in main.rs, whose
// secret gate covers every path except /health, so an unmatched path without
// the header answers 401 before routing ever runs), requireSecret here only
// wraps /route/miles: http.ServeMux's built-in NotFoundHandler answers
// unmatched paths directly, so a 404 never checks HAULDESK_SIDECAR_SECRET.
// That is an intentional deployment choice (this worker exposes exactly two
// routes, both already documented in docs/architecture/trilingual-stack.md,
// so there is nothing to enumerate) — pinned here so a future route-wiring
// change surfaces the tradeoff instead of silently altering it.
func TestUnknownPathIs404(t *testing.T) {
	t.Setenv("HAULDESK_SIDECAR_SECRET", "s3cret")
	if rec := doRequest(t, http.MethodGet, "/nope", "", nil); rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown path without a secret header, got %d", rec.Code)
	}
	if rec := doRequest(t, http.MethodGet, "/nope", "",
		http.Header{"X-Hauldesk-Secret": []string{"s3cret"}}); rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown path with a secret header, got %d", rec.Code)
	}
}

func TestRouteMilesRejectsBadInput(t *testing.T) {
	if rec := doRequest(t, http.MethodGet, "/route/miles", "", nil); rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for GET, got %d", rec.Code)
	}
	if rec := doRequest(t, http.MethodPost, "/route/miles", "{not json", nil); rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for malformed JSON, got %d", rec.Code)
	}
}

func TestRouteMilesRejectsOutOfRangeCoordinates(t *testing.T) {
	// Out-of-range coordinates are always a client bug (swapped lat/lng, meters
	// instead of degrees). Without the guard they were proxied to OSRM as
	// garbage, and on nonsense latitudes haversineMiles can leave asin's domain
	// and return NaN — json.Encode refuses NaN after the 200 header is written,
	// so the worker answered 200 with an EMPTY body (verified empirically:
	// lat ±13090.69 yields NaN). All of these must be a clean 400 instead.
	t.Setenv("OSRM_URL", "http://127.0.0.1:1")
	cases := map[string]string{
		"latitude beyond +90":  `{"origin":{"lat":91,"lng":0},"dest":{"lat":0,"lng":1}}`,
		"latitude below -90":   `{"origin":{"lat":0,"lng":0},"dest":{"lat":-90.0001,"lng":1}}`,
		"longitude beyond 180": `{"origin":{"lat":0,"lng":180.5},"dest":{"lat":0,"lng":1}}`,
		"longitude below -180": `{"origin":{"lat":0,"lng":0},"dest":{"lat":0,"lng":-181}}`,
		"swapped lat/lng":      `{"origin":{"lat":-122.3321,"lng":47.6062},"dest":{"lat":45.5152,"lng":-122.6784}}`,
		"NaN-producing pair":   `{"origin":{"lat":-13090.69,"lng":0},"dest":{"lat":13090.69,"lng":180}}`,
	}
	for name, body := range cases {
		t.Run(name, func(t *testing.T) {
			rec := doRequest(t, http.MethodPost, "/route/miles", body, nil)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400 for %s, got %d (body %q)", name, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestRouteMilesRejectsOversizedBody(t *testing.T) {
	// MaxBytesReader caps the body well above any legitimate two-coordinate
	// payload; a client streaming megabytes must get a clean 400, not tie up
	// the handler reading an unbounded body into memory.
	pad := strings.Repeat("a", 32<<10) // 32 KiB, double the 16 KiB cap
	body := `{"origin":{"lat":0,"lng":0},"dest":{"lat":0,"lng":1},"pad":"` + pad + `"}`
	rec := doRequest(t, http.MethodPost, "/route/miles", body, nil)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for oversized body, got %d", rec.Code)
	}
}

func TestRouteMilesAcceptsBoundaryCoordinates(t *testing.T) {
	// The poles and the antimeridian are legal coordinates — the range guard
	// must be inclusive, and the worker still answers (labeled fallback here,
	// since OSRM is unreachable in this test).
	t.Setenv("OSRM_URL", "http://127.0.0.1:1")
	rec := doRequest(t, http.MethodPost, "/route/miles",
		`{"origin":{"lat":90,"lng":-180},"dest":{"lat":-90,"lng":180}}`, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("boundary coordinates must be accepted, got %d (body %q)", rec.Code, rec.Body.String())
	}
	if payload := decodeBody(t, rec); payload["source"] != "haversine-fallback" {
		t.Fatalf("expected labeled fallback answer, got %v", payload)
	}
}

func TestRouteMilesOSRMSource(t *testing.T) {
	osrm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/route/v1/driving/") {
			t.Errorf("unexpected OSRM path %s", r.URL.Path)
		}
		// 100 miles in meters.
		_, _ = w.Write([]byte(`{"routes":[{"distance":160934.4}]}`))
	}))
	defer osrm.Close()
	t.Setenv("OSRM_URL", osrm.URL)

	rec := doRequest(t, http.MethodPost, "/route/miles",
		`{"origin":{"lat":47.6062,"lng":-122.3321},"dest":{"lat":45.5152,"lng":-122.6784}}`, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	payload := decodeBody(t, rec)
	if payload["source"] != "osrm" {
		t.Fatalf("expected source osrm, got %v", payload["source"])
	}
	if payload["miles"] != float64(100) {
		t.Fatalf("expected 100 miles from 160934.4 m, got %v", payload["miles"])
	}
}

func TestRouteMilesFallbackLabeled(t *testing.T) {
	// OSRM reachable but erroring must NOT silently pass off great-circle miles
	// as routed miles — the TS gateway needs the fallback label to warn users.
	osrm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer osrm.Close()
	t.Setenv("OSRM_URL", osrm.URL)

	rec := doRequest(t, http.MethodPost, "/route/miles",
		`{"origin":{"lat":0,"lng":0},"dest":{"lat":0,"lng":1}}`, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 fallback answer, got %d", rec.Code)
	}
	payload := decodeBody(t, rec)
	if payload["source"] != "haversine-fallback" {
		t.Fatalf("expected source haversine-fallback, got %v", payload["source"])
	}
	want := math.Round(haversineMiles(0, 0, 0, 1))
	if payload["miles"] != want {
		t.Fatalf("expected %v haversine miles, got %v", want, payload["miles"])
	}
}

func TestRouteMilesFallbackOnEmptyRoutes(t *testing.T) {
	// OSRM 200s but returns no route (e.g. unreachable dest) — osrmMiles must
	// treat "no route" the same as "unreachable" rather than panicking on
	// payload.Routes[0], and the gateway still gets a labeled fallback answer.
	osrm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"routes":[]}`))
	}))
	defer osrm.Close()
	t.Setenv("OSRM_URL", osrm.URL)

	rec := doRequest(t, http.MethodPost, "/route/miles",
		`{"origin":{"lat":0,"lng":0},"dest":{"lat":0,"lng":1}}`, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 fallback answer, got %d", rec.Code)
	}
	if payload := decodeBody(t, rec); payload["source"] != "haversine-fallback" {
		t.Fatalf("expected source haversine-fallback, got %v", payload["source"])
	}
}

func TestRouteMilesFallbackOnZeroDistance(t *testing.T) {
	// A zero/negative distance is as unusable as no route at all.
	osrm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"routes":[{"distance":0}]}`))
	}))
	defer osrm.Close()
	t.Setenv("OSRM_URL", osrm.URL)

	rec := doRequest(t, http.MethodPost, "/route/miles",
		`{"origin":{"lat":0,"lng":0},"dest":{"lat":0,"lng":1}}`, nil)
	if payload := decodeBody(t, rec); payload["source"] != "haversine-fallback" {
		t.Fatalf("expected source haversine-fallback, got %v", payload["source"])
	}
}

func TestRouteMilesFallbackOnMalformedOSRMBody(t *testing.T) {
	// OSRM reachable and 200 but replies with garbage — decode error must fall
	// back rather than surfacing a 500 to the TS gateway.
	osrm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("not json"))
	}))
	defer osrm.Close()
	t.Setenv("OSRM_URL", osrm.URL)

	rec := doRequest(t, http.MethodPost, "/route/miles",
		`{"origin":{"lat":0,"lng":0},"dest":{"lat":0,"lng":1}}`, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 fallback answer, got %d", rec.Code)
	}
	if payload := decodeBody(t, rec); payload["source"] != "haversine-fallback" {
		t.Fatalf("expected source haversine-fallback, got %v", payload["source"])
	}
}

func TestOsrmMilesDefaultsToPublicDemoWhenURLUnset(t *testing.T) {
	// Unset OSRM_URL must fall through to the public demo host rather than an
	// empty base — verified via an already-canceled context so the assertion
	// stays fast and offline instead of depending on real network reachability.
	t.Setenv("OSRM_URL", "")
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := osrmMiles(ctx, latLng{Lat: 0, Lng: 0}, latLng{Lat: 0, Lng: 1})
	if err == nil {
		t.Fatal("expected error from canceled context")
	}
	if !strings.Contains(err.Error(), "router.project-osrm.org") {
		t.Fatalf("expected default OSRM_URL in error, got: %v", err)
	}
}

func TestOsrmMilesRequestConstructionError(t *testing.T) {
	// A malformed OSRM_URL (e.g. from a bad env var) must surface as a plain
	// error from osrmMiles/the fallback path, not a panic on a nil request.
	t.Setenv("OSRM_URL", "http://example.com/\x7f")
	_, err := osrmMiles(context.Background(), latLng{Lat: 0, Lng: 0}, latLng{Lat: 0, Lng: 1})
	if err == nil {
		t.Fatal("expected error for malformed OSRM_URL")
	}
}

func TestHaversineMiles(t *testing.T) {
	if got := haversineMiles(47.6062, -122.3321, 47.6062, -122.3321); got != 0 {
		t.Fatalf("zero distance expected for identical points, got %f", got)
	}
	// One degree of longitude on the equator: earthRadius * pi/180 ≈ 69.09 mi.
	if got := haversineMiles(0, 0, 0, 1); math.Abs(got-69.093) > 0.01 {
		t.Fatalf("equator degree should be ~69.09 mi, got %f", got)
	}
	a := haversineMiles(47.6062, -122.3321, 45.5152, -122.6784)
	b := haversineMiles(45.5152, -122.6784, 47.6062, -122.3321)
	if math.Abs(a-b) > 1e-9 {
		t.Fatalf("distance must be symmetric: %f vs %f", a, b)
	}
	if a < 140 || a > 150 {
		t.Fatalf("Seattle-Portland great-circle should be ~145 mi, got %f", a)
	}
}

// TestHaversineMilesGoldenParityWithTS pins the same Kent-WA-to-Denver-CO
// fixture as geo.test.ts's "computes great-circle distance between two known
// cities" (toBeCloseTo(1008.69, 1)) — the Go worker's fallback path and the
// TS gateway's own haversineMiles (src/lib/hub/geo.ts) must never drift,
// since routing.ts falls back to the TS formula whenever the worker itself
// is unset, so both must agree with the shared golden distance.
func TestHaversineMilesGoldenParityWithTS(t *testing.T) {
	got := haversineMiles(47.3809, -122.2348, 39.7392, -104.9903)
	if math.Abs(got-1008.69) > 0.05 {
		t.Fatalf("expected TS golden 1008.69 mi (±0.05), got %f", got)
	}
}
