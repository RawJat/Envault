package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

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

func (c *Client) refreshToken() error {
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

	resp, err := c.HTTP.Do(req)
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
	return c.doReq("POST", path, body, true)
}

func (c *Client) Get(path string) ([]byte, error) {
	return c.doReq("GET", path, nil, true)
}

func (c *Client) doReq(method, path string, body interface{}, canRetry bool) ([]byte, error) {
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

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 && canRetry {
		if c.Token != "" && !strings.HasPrefix(c.Token, "envault_svc_") {
			bodyBytes, _ := io.ReadAll(resp.Body) // consume old body
			errRefresh := c.refreshToken()
			if errRefresh == nil {
				return c.doReq(method, path, body, false)
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
