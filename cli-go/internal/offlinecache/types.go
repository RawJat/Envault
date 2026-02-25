package offlinecache

import (
	"errors"
	"time"
)

const (
	cacheFileName = "offline_cache.enc"
	cacheVersion  = 1
)

var ErrCacheMiss = errors.New("offline cache entry not found")

type Secret struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type cacheEntry struct {
	Secrets  []Secret  `json:"secrets"`
	CachedAt time.Time `json:"cached_at"`
}

type cachePayload struct {
	Entries map[string]cacheEntry `json:"entries"`
}
