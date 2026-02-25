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
