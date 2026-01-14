package httpapi

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

type propertyStats struct {
	Total    int            `json:"total"`
	ByStatus map[string]int `json:"by_status"`
}

type costStats struct {
	TotalPlanned  float64 `json:"total_planned"`
	TotalPaid     float64 `json:"total_paid"`
	OverdueCount  int     `json:"overdue_count"`
	OverdueAmount float64 `json:"overdue_amount"`
	Upcoming7Days int     `json:"upcoming_7_days"`
}

type scheduleStats struct {
	TotalItems      int     `json:"total_items"`
	CompletedItems  int     `json:"completed_items"`
	OverdueItems    int     `json:"overdue_items"`
	Upcoming7Days   int     `json:"upcoming_7_days"`
	ProgressPercent float64 `json:"progress_percent"`
}

type upcomingItem struct {
	ID           string  `json:"id"`
	Type         string  `json:"type"` // "cost" or "schedule"
	PropertyID   string  `json:"property_id"`
	PropertyName string  `json:"property_name"`
	Title        string  `json:"title"`
	Amount       float64 `json:"amount,omitempty"`
	DueDate      string  `json:"due_date"`
	DaysUntil    int     `json:"days_until"` // negative = overdue
}

type dashboardTimelineEvent struct {
	ID           string          `json:"id"`
	PropertyID   string          `json:"property_id"`
	PropertyName string          `json:"property_name"`
	EventType    string          `json:"event_type"`
	Payload      json.RawMessage `json:"payload,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
}

type dashboardResponse struct {
	Properties    propertyStats            `json:"properties"`
	Costs         costStats                `json:"costs"`
	Schedule      scheduleStats            `json:"schedule"`
	UpcomingItems []upcomingItem           `json:"upcoming_items"`
	RecentEvents  []dashboardTimelineEvent `json:"recent_events"`
}

func (a *api) handleWorkspaceDashboard(w http.ResponseWriter, r *http.Request, workspaceID string) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "Missing user"})
		return
	}

	// Verify membership
	var membershipExists bool
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT EXISTS(SELECT 1 FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2)`,
		workspaceID, userID,
	).Scan(&membershipExists)
	if err != nil || !membershipExists {
		writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "Access denied"})
		return
	}

	resp := dashboardResponse{
		Properties: propertyStats{
			Total:    0,
			ByStatus: make(map[string]int),
		},
		Costs:         costStats{},
		Schedule:      scheduleStats{},
		UpcomingItems: []upcomingItem{},
		RecentEvents:  []dashboardTimelineEvent{},
	}

	// 1. Property stats
	rows, err := a.db.QueryContext(
		r.Context(),
		`SELECT status_pipeline, COUNT(*)
		 FROM properties
		 WHERE workspace_id = $1
		 GROUP BY status_pipeline`,
		workspaceID,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var status string
			var count int
			if err := rows.Scan(&status, &count); err == nil {
				resp.Properties.ByStatus[status] = count
				resp.Properties.Total += count
			}
		}
	}

	// 2. Cost stats
	today := time.Now().Truncate(24 * time.Hour)
	in7Days := today.AddDate(0, 0, 7)

	err = a.db.QueryRowContext(
		r.Context(),
		`SELECT
			COALESCE(SUM(CASE WHEN status = 'planned' THEN amount ELSE 0 END), 0) as total_planned,
			COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
			COUNT(CASE WHEN status = 'planned' AND due_date < $2 THEN 1 END) as overdue_count,
			COALESCE(SUM(CASE WHEN status = 'planned' AND due_date < $2 THEN amount ELSE 0 END), 0) as overdue_amount,
			COUNT(CASE WHEN status = 'planned' AND due_date >= $2 AND due_date <= $3 THEN 1 END) as upcoming_7_days
		 FROM costs c
		 JOIN properties p ON p.id = c.property_id
		 WHERE p.workspace_id = $1`,
		workspaceID, today, in7Days,
	).Scan(
		&resp.Costs.TotalPlanned,
		&resp.Costs.TotalPaid,
		&resp.Costs.OverdueCount,
		&resp.Costs.OverdueAmount,
		&resp.Costs.Upcoming7Days,
	)
	if err != nil {
		// Continue with zeros if query fails
	}

	// 3. Schedule stats
	err = a.db.QueryRowContext(
		r.Context(),
		`SELECT
			COUNT(*) as total_items,
			COUNT(CASE WHEN done_at IS NOT NULL THEN 1 END) as completed_items,
			COUNT(CASE WHEN done_at IS NULL AND planned_date < $2 THEN 1 END) as overdue_items,
			COUNT(CASE WHEN done_at IS NULL AND planned_date >= $2 AND planned_date <= $3 THEN 1 END) as upcoming_7_days
		 FROM schedule_items s
		 JOIN properties p ON p.id = s.property_id
		 WHERE p.workspace_id = $1`,
		workspaceID, today.Format("2006-01-02"), in7Days.Format("2006-01-02"),
	).Scan(
		&resp.Schedule.TotalItems,
		&resp.Schedule.CompletedItems,
		&resp.Schedule.OverdueItems,
		&resp.Schedule.Upcoming7Days,
	)
	if err == nil && resp.Schedule.TotalItems > 0 {
		resp.Schedule.ProgressPercent = float64(resp.Schedule.CompletedItems) / float64(resp.Schedule.TotalItems) * 100
	}

	// 4. Upcoming items (overdue + next 7 days) - max 8 items
	// 4a. Overdue and upcoming costs
	costRows, err := a.db.QueryContext(
		r.Context(),
		`SELECT c.id, c.property_id, COALESCE(p.address, p.neighborhood, 'Imovel') as property_name,
		        COALESCE(c.category, c.cost_type) as title, c.amount, c.due_date::text,
		        ($2::date - c.due_date::date) as days_until
		 FROM costs c
		 JOIN properties p ON p.id = c.property_id
		 WHERE p.workspace_id = $1
		   AND c.status = 'planned'
		   AND c.due_date <= $3
		 ORDER BY c.due_date ASC
		 LIMIT 10`,
		workspaceID, today.Format("2006-01-02"), in7Days.Format("2006-01-02"),
	)
	if err == nil {
		defer costRows.Close()
		for costRows.Next() {
			var item upcomingItem
			var daysUntil int
			if err := costRows.Scan(&item.ID, &item.PropertyID, &item.PropertyName, &item.Title, &item.Amount, &item.DueDate, &daysUntil); err == nil {
				item.Type = "cost"
				item.DaysUntil = -daysUntil // Flip sign: negative means overdue
				resp.UpcomingItems = append(resp.UpcomingItems, item)
			}
		}
	}

	// 4b. Overdue and upcoming schedule items
	scheduleRows, err := a.db.QueryContext(
		r.Context(),
		`SELECT s.id, s.property_id, COALESCE(p.address, p.neighborhood, 'Imovel') as property_name,
		        s.title, COALESCE(s.estimated_cost, 0) as amount, s.planned_date,
		        ($2::date - s.planned_date::date) as days_until
		 FROM schedule_items s
		 JOIN properties p ON p.id = s.property_id
		 WHERE p.workspace_id = $1
		   AND s.done_at IS NULL
		   AND s.planned_date <= $3
		 ORDER BY s.planned_date ASC
		 LIMIT 10`,
		workspaceID, today.Format("2006-01-02"), in7Days.Format("2006-01-02"),
	)
	if err == nil {
		defer scheduleRows.Close()
		for scheduleRows.Next() {
			var item upcomingItem
			var daysUntil int
			if err := scheduleRows.Scan(&item.ID, &item.PropertyID, &item.PropertyName, &item.Title, &item.Amount, &item.DueDate, &daysUntil); err == nil {
				item.Type = "schedule"
				item.DaysUntil = -daysUntil // Flip sign: negative means overdue
				resp.UpcomingItems = append(resp.UpcomingItems, item)
			}
		}
	}

	// Sort upcoming items by days_until (overdue first, then by proximity)
	// and limit to 8 items
	if len(resp.UpcomingItems) > 1 {
		// Simple bubble sort for small list
		for i := 0; i < len(resp.UpcomingItems)-1; i++ {
			for j := i + 1; j < len(resp.UpcomingItems); j++ {
				if resp.UpcomingItems[i].DaysUntil > resp.UpcomingItems[j].DaysUntil {
					resp.UpcomingItems[i], resp.UpcomingItems[j] = resp.UpcomingItems[j], resp.UpcomingItems[i]
				}
			}
		}
	}
	if len(resp.UpcomingItems) > 8 {
		resp.UpcomingItems = resp.UpcomingItems[:8]
	}

	// 5. Recent timeline events
	eventRows, err := a.db.QueryContext(
		r.Context(),
		`SELECT t.id, t.property_id, COALESCE(p.address, p.neighborhood, 'Imovel') as property_name,
		        t.event_type, t.payload, t.created_at
		 FROM timeline_events t
		 JOIN properties p ON p.id = t.property_id
		 WHERE t.workspace_id = $1
		 ORDER BY t.created_at DESC
		 LIMIT 10`,
		workspaceID,
	)
	if err == nil {
		defer eventRows.Close()
		for eventRows.Next() {
			var ev dashboardTimelineEvent
			if err := eventRows.Scan(&ev.ID, &ev.PropertyID, &ev.PropertyName, &ev.EventType, &ev.Payload, &ev.CreatedAt); err == nil {
				resp.RecentEvents = append(resp.RecentEvents, ev)
			}
		}
	}

	writeJSON(w, http.StatusOK, resp)
}
