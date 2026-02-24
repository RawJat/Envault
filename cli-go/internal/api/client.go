package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/spf13/viper"
	"io"
	"net/http"
	"net/url"
	"os"
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

	return &Client{
		BaseURL: baseURL,
		Token:   viper.GetString("auth.token"),
		HTTP:    &http.Client{},
	}
}

func (c *Client) Post(path string, body interface{}) ([]byte, error) {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", c.BaseURL+path, bytes.NewBuffer(jsonBody))
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

	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, &APIError{StatusCode: resp.StatusCode, Body: string(bodyBytes)}
	}

	return io.ReadAll(resp.Body)
}

func (c *Client) Get(path string) ([]byte, error) {
	req, err := http.NewRequest("GET", c.BaseURL+path, nil)
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

	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, &APIError{StatusCode: resp.StatusCode, Body: string(bodyBytes)}
	}

	return io.ReadAll(resp.Body)
}
