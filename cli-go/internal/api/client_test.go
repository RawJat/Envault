package api

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"
)

func TestIsFallbackEligible(t *testing.T) {
	testCases := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "api error is not fallback eligible",
			err:  &APIError{StatusCode: 401, Body: "unauthorized"},
			want: false,
		},
		{
			name: "deadline exceeded is fallback eligible",
			err:  context.DeadlineExceeded,
			want: true,
		},
		{
			name: "dns error is fallback eligible",
			err: &url.Error{
				Op:  "Get",
				URL: "https://envault.tech",
				Err: &net.DNSError{Err: "lookup failed", Name: "envault.tech"},
			},
			want: true,
		},
		{
			name: "random error is not fallback eligible",
			err:  errors.New("bad request body"),
			want: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			got := IsFallbackEligible(tc.err)
			if got != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, got)
			}
		})
	}
}

func TestGetWithTimeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	client := &Client{
		BaseURL: server.URL,
		HTTP:    &http.Client{},
	}

	_, err := client.GetWithTimeout("/slow", 25*time.Millisecond)
	if err == nil {
		t.Fatalf("expected timeout error")
	}
	if !IsFallbackEligible(err) {
		t.Fatalf("timeout error should be fallback eligible, got: %v", err)
	}
}

func TestGetWithContext_CancelledContext(t *testing.T) {
	slow := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-r.Context().Done()
		w.WriteHeader(http.StatusOK)
	}))
	defer slow.Close()

	client := &Client{BaseURL: slow.URL, HTTP: &http.Client{}}

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // pre-cancel

	_, err := client.GetWithContext(ctx, "/")
	if err == nil {
		t.Fatal("expected error when context is already cancelled")
	}
}

func TestGetWithContextAndTimeout_TimesOut(t *testing.T) {
	slow := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer slow.Close()

	client := &Client{BaseURL: slow.URL, HTTP: &http.Client{}}

	_, err := client.GetWithContextAndTimeout(context.Background(), "/", 20*time.Millisecond)
	if err == nil {
		t.Fatal("expected timeout error")
	}
	if !IsFallbackEligible(err) {
		t.Fatalf("timeout from GetWithContextAndTimeout should be fallback eligible, got: %v", err)
	}
}

func TestPostWithContext_CancelledContext(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-r.Context().Done()
	}))
	defer srv.Close()

	client := &Client{BaseURL: srv.URL, HTTP: &http.Client{}}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := client.PostWithContext(ctx, "/", nil)
	if err == nil {
		t.Fatal("expected error when context is already cancelled")
	}
}

func TestDoReqCtx_ContextCancelledMidRequest(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cancel() // cancel mid-flight from the server handler
		time.Sleep(50 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	client := &Client{BaseURL: srv.URL, HTTP: &http.Client{}}
	// Should not panic; may return either a context error or a transport error.
	_, _ = client.GetWithContext(ctx, "/")
}

func TestGetWithContext_SuccessfulRequest(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()

	client := &Client{BaseURL: srv.URL, HTTP: &http.Client{}}
	body, err := client.GetWithContext(context.Background(), "/")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(body) != `{"ok":true}` {
		t.Fatalf("unexpected body: %s", body)
	}
}
