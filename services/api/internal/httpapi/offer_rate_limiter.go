package httpapi

import (
	"math"
	"sync"
	"time"
)

type offerRateLimitWindow struct {
	startedAt time.Time
	count     int
}

type offerRateLimiter struct {
	mu      sync.Mutex
	windows map[string]offerRateLimitWindow
}

func newOfferRateLimiter() *offerRateLimiter {
	return &offerRateLimiter{
		windows: make(map[string]offerRateLimitWindow),
	}
}

func (l *offerRateLimiter) Allow(workspaceID string, limitPerMinute int) (bool, int) {
	if workspaceID == "" {
		return true, 0
	}
	if limitPerMinute <= 0 {
		limitPerMinute = 10
	}

	now := time.Now().UTC()
	windowSize := 60 * time.Second

	l.mu.Lock()
	defer l.mu.Unlock()

	window := l.windows[workspaceID]
	if window.startedAt.IsZero() || now.Sub(window.startedAt) >= windowSize {
		window = offerRateLimitWindow{startedAt: now, count: 0}
	}

	if window.count >= limitPerMinute {
		elapsed := now.Sub(window.startedAt)
		retryAfter := int(math.Ceil((windowSize - elapsed).Seconds()))
		if retryAfter < 1 {
			retryAfter = 1
		}
		l.windows[workspaceID] = window
		return false, retryAfter
	}

	window.count++
	l.windows[workspaceID] = window

	if len(l.windows) > 5000 {
		for key, value := range l.windows {
			if now.Sub(value.startedAt) > 5*windowSize {
				delete(l.windows, key)
			}
		}
	}

	return true, 0
}
