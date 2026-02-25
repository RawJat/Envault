package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/spf13/viper"
	"github.com/zalando/go-keyring"
)

type APIError struct {
	StatusCode int
	Body       string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("api error %d: %s", e.StatusCode, e.Body)
}

type Client struct {
	BaseURL string
	Token   string
	HTTP    *http.Client
}

func NewClient() *Client {
	baseURL := os.Getenv("ENVAULT_API_URL")
	if baseURL == "" {
		baseURL = "https://envault.tech/api/cli"
	}

	u, err := url.Parse(baseURL)
	if err != nil {
		fmt.Printf("Error: Invalid API URL: %v\n", err)
		os.Exit(1)
	}

	hostname := u.Hostname()
	isLocal := hostname == "localhost" || hostname == "127.0.0.1"

	if !isLocal && u.Scheme != "https" {
		fmt.Println("Error: Insecure connection (HTTP) is only allowed for localhost.")
		fmt.Println("       Please use HTTPS for remote servers.")
		os.Exit(1)
	}

	// 1. Check for Service Tokens via Envar
	token := os.Getenv("ENVAULT_TOKEN")
	if token == "" {
		token = os.Getenv("ENVAULT_SERVICE_TOKEN")
	}

	if token != "" {
		if strings.HasPrefix(token, "envault_svc_") {
			// CI Guardrail
			isCI := os.Getenv("CI") == "true" || os.Getenv("GITHUB_ACTIONS") == "true"
			isLoginCmd := len(os.Args) >= 2 && os.Args[1] == "login"

			if !isCI && !isLoginCmd {
				fmt.Println("Error: Service tokens are for CI environments only.")
				fmt.Println("Please run 'envault login' to authenticate your local machine.")
				os.Exit(1)
			}
		}
	} else {
		// Fallback to local session token
		token = viper.GetString("auth.token")
	}

	return &Client{
		BaseURL: baseURL,
		Token:   token,
		HTTP:    &http.Client{},
	}
}

func (c *Client) refreshToken(httpClient *http.Client) error {
	if httpClient == nil {
		httpClient = c.HTTP
	}
	if httpClient == nil {
		httpClient = &http.Client{}
	}

	rt, err := keyring.Get("envault", "cli")
	if err != nil || rt == "" {
		return fmt.Errorf("no refresh token found")
	}

	payload := map[string]interface{}{
		"refresh_token": rt,
	}
	jsonBody, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", c.BaseURL+"/auth/refresh", bytes.NewBuffer(jsonBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return &APIError{StatusCode: resp.StatusCode, Body: string(bodyBytes)}
	}

	var parsed map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return err
	}

	newToken, ok := parsed["access_token"].(string)
	if !ok || newToken == "" {
		return fmt.Errorf("invalid token response")
	}

	// Save new access token
	c.Token = newToken
	viper.Set("auth.token", newToken)
	_ = viper.WriteConfig()
	return nil
}

func (c *Client) Post(path string, body interface{}) ([]byte, error) {
	return c.doReqWithHTTP("POST", path, body, true, c.HTTP)
}

func (c *Client) Get(path string) ([]byte, error) {
	return c.doReqWithHTTP("GET", path, nil, true, c.HTTP)
}

func (c *Client) GetWithTimeout(path string, timeout time.Duration) ([]byte, error) {
	if timeout <= 0 {
		return c.Get(path)
	}

	return c.doReqWithHTTP("GET", path, nil, true, clientWithTimeout(c.HTTP, timeout))
}

func clientWithTimeout(base *http.Client, timeout time.Duration) *http.Client {
	if base == nil {
		return &http.Client{Timeout: timeout}
	}

	return &http.Client{
		Transport:     base.Transport,
		CheckRedirect: base.CheckRedirect,
		Jar:           base.Jar,
		Timeout:       timeout,
	}
}

func (c *Client) doReqWithHTTP(method, path string, body interface{}, canRetry bool, httpClient *http.Client) ([]byte, error) {
	if httpClient == nil {
		httpClient = c.HTTP
	}
	if httpClient == nil {
		httpClient = &http.Client{}
	}

	var bodyReader io.Reader
	var reqBody []byte

	if body != nil {
		var err error
		reqBody, err = json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewBuffer(reqBody)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 && canRetry {
		if c.Token != "" && !strings.HasPrefix(c.Token, "envault_svc_") {
			bodyBytes, _ := io.ReadAll(resp.Body) // consume old body
			errRefresh := c.refreshToken(httpClient)
			if errRefresh == nil {
				return c.doReqWithHTTP(method, path, body, false, httpClient)
			}
			return nil, fmt.Errorf("Refresh Token Exchange Failed: %v | (Original Auth Error: %s)", errRefresh, string(bodyBytes))
		}
	}

	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, &APIError{StatusCode: resp.StatusCode, Body: string(bodyBytes)}
	}

	return io.ReadAll(resp.Body)
}

func IsFallbackEligible(err error) bool {
	if err == nil {
		return false
	}

	var apiErr *APIError
	if errors.As(err, &apiErr) {
		return false
	}

	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}

	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		if urlErr.Timeout() {
			return true
		}
		return IsFallbackEligible(urlErr.Err)
	}

	var netErr net.Error
	if errors.As(err, &netErr) {
		return true
	}

	var opErr *net.OpError
	if errors.As(err, &opErr) {
		return true
	}

	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) {
		return true
	}

	return false
}
