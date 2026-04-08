package ui

import (
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"
)

type LoaderTheme string

const (
	LoaderThemePulse  LoaderTheme = "pulse"
	LoaderThemeFetch  LoaderTheme = "fetch"
	LoaderThemeDeploy LoaderTheme = "deploy"
	LoaderThemeCheck  LoaderTheme = "check"
	LoaderThemeAuth   LoaderTheme = "auth"
	LoaderThemeSync   LoaderTheme = "sync"
)

type Loader struct {
	frames   []string
	interval time.Duration
	painter  func(string) string
	message  string
	enabled  bool
	writer   io.Writer

	mu      sync.Mutex
	stop    chan struct{}
	running bool
	wg      sync.WaitGroup
}

type loaderSpec struct {
	frames   []string
	interval time.Duration
	painter  func(string) string
}

func NewLoader(theme LoaderTheme, message string) *Loader {
	spec := resolveLoaderSpec(theme)
	return &Loader{
		frames:   spec.frames,
		interval: spec.interval,
		painter:  spec.painter,
		message:  message,
		enabled:  supportsAnimation(os.Stderr),
		writer:   os.Stderr,
		stop:     make(chan struct{}),
	}
}

func (l *Loader) Start() {
	if l == nil || !l.enabled {
		return
	}

	l.mu.Lock()
	if l.running {
		l.mu.Unlock()
		return
	}
	l.running = true
	l.mu.Unlock()

	l.wg.Add(1)
	go func() {
		defer l.wg.Done()
		ticker := time.NewTicker(l.interval)
		defer ticker.Stop()

		frameIndex := 0
		for {
			select {
			case <-l.stop:
				fmt.Fprint(l.writer, "\r\033[K")
				return
			case <-ticker.C:
				l.mu.Lock()
				msg := l.message
				l.mu.Unlock()
				frame := l.frames[frameIndex%len(l.frames)]
				frameIndex++
				fmt.Fprintf(l.writer, "\r%s %s", l.painter(frame), msg)
			}
		}
	}()
}

func (l *Loader) Stop() {
	if l == nil || !l.enabled {
		return
	}

	l.mu.Lock()
	if !l.running {
		l.mu.Unlock()
		return
	}
	l.running = false
	l.mu.Unlock()

	close(l.stop)
	l.wg.Wait()
}

func (l *Loader) SetMessage(message string) {
	if l == nil {
		return
	}
	l.mu.Lock()
	l.message = message
	l.mu.Unlock()
}

func (l *Loader) Enabled() bool {
	if l == nil {
		return false
	}
	return l.enabled
}

func resolveLoaderSpec(theme LoaderTheme) loaderSpec {
	scanFrames := []string{"⠀⠀⠀⠀", "⡇⠀⠀⠀", "⣿⠀⠀⠀", "⢸⡇⠀⠀", "⠀⣿⠀⠀", "⠀⢸⡇⠀", "⠀⠀⣿⠀", "⠀⠀⢸⡇", "⠀⠀⠀⣿", "⠀⠀⠀⢸"}

	switch theme {
	case LoaderThemeFetch:
		return loaderSpec{
			frames: []string{
				"⡀⠀⠀", "⡄⠀⠀", "⡆⠀⠀", "⡇⠀⠀", "⣇⠀⠀", "⣧⠀⠀", "⣷⠀⠀", "⣿⠀⠀",
				"⣿⡀⠀", "⣿⡄⠀", "⣿⡆⠀", "⣿⡇⠀", "⣿⣇⠀", "⣿⣧⠀", "⣿⣷⠀", "⣿⣿⠀",
				"⣿⣿⡀", "⣿⣿⡄", "⣿⣿⡆", "⣿⣿⡇", "⣿⣿⣇", "⣿⣿⣧", "⣿⣿⣷", "⣿⣿⣿",
				"⣿⣿⣿", "⠀⠀⠀",
			},
			interval: 60 * time.Millisecond,
			painter:  func(s string) string { return ColorCyan(s) },
		}
	case LoaderThemeDeploy:
		return loaderSpec{
			frames: []string{
				"⢌⣉⢎⣉", "⣉⡱⣉⡱", "⣉⢎⣉⢎", "⡱⣉⡱⣉", "⢎⣉⢎⣉", "⣉⡱⣉⡱", "⣉⢎⣉⢎", "⡱⣉⡱⣉",
				"⢎⣉⢎⣉", "⣉⡱⣉⡱", "⣉⢎⣉⢎", "⡱⣉⡱⣉", "⢎⣉⢎⣉", "⣉⡱⣉⡱", "⣉⢎⣉⢎", "⡱⣉⡱⣉",
			},
			interval: 80 * time.Millisecond,
			painter:  func(s string) string { return ColorGreen(s) },
		}
	case LoaderThemeCheck:
		return loaderSpec{
			frames: []string{
				"⠀⠀⠀⠀", "⠀⠀⠀⠀", "⠁⠀⠀⠀", "⠋⠀⠀⠀", "⠞⠁⠀⠀", "⡴⠋⠀⠀", "⣠⠞⠁⠀",
				"⢀⡴⠋⠀", "⠀⣠⠞⠁", "⠀⢀⡴⠋", "⠀⠀⣠⠞", "⠀⠀⢀⡴", "⠀⠀⠀⣠", "⠀⠀⠀⢀",
			},
			interval: 60 * time.Millisecond,
			painter:  func(s string) string { return ColorBlue(s) },
		}
	case LoaderThemeAuth:
		return loaderSpec{
			frames:   []string{"⡡⠊⢔⠡", "⠊⡰⡡⡘", "⢔⢅⠈⢢", "⡁⢂⠆⡍", "⢔⠨⢑⢐", "⠨⡑⡠⠊"},
			interval: 150 * time.Millisecond,
			painter:  func(s string) string { return ColorYellow(s) },
		}
	case LoaderThemeSync:
		return loaderSpec{
			frames: []string{
				"⠖⠉⠉⠑", "⡠⠖⠉⠉", "⣠⡠⠖⠉", "⣄⣠⡠⠖", "⠢⣄⣠⡠", "⠙⠢⣄⣠", "⠉⠙⠢⣄", "⠊⠉⠙⠢",
				"⠜⠊⠉⠙", "⡤⠜⠊⠉", "⣀⡤⠜⠊", "⢤⣀⡤⠜", "⠣⢤⣀⡤", "⠑⠣⢤⣀", "⠉⠑⠣⢤", "⠋⠉⠑⠣",
			},
			interval: 90 * time.Millisecond,
			painter:  func(s string) string { return ColorDim(s) },
		}
	default:
		return loaderSpec{
			frames:   scanFrames,
			interval: 70 * time.Millisecond,
			painter:  func(s string) string { return ColorCyan(s) },
		}
	}
}

func supportsAnimation(file *os.File) bool {
	if file == nil {
		return false
	}
	if strings.TrimSpace(os.Getenv("CI")) != "" {
		return false
	}
	if strings.TrimSpace(os.Getenv("ENVAULT_NO_ANIMATION")) == "1" {
		return false
	}
	term := strings.ToLower(strings.TrimSpace(os.Getenv("TERM")))
	if term == "" || term == "dumb" {
		return false
	}

	info, err := file.Stat()
	if err != nil {
		return false
	}
	return info.Mode()&os.ModeCharDevice != 0
}
