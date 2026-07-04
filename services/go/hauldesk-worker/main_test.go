package main

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
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

func TestRouteMilesRejectsBadInput(t *testing.T) {
	if rec := doRequest(t, http.MethodGet, "/route/miles", "", nil); rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for GET, got %d", rec.Code)
	}
	if rec := doRequest(t, http.MethodPost, "/route/miles", "{not json", nil); rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for malformed JSON, got %d", rec.Code)
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
