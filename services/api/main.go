package main

import (
	"context"
	"crypto/rand"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/pablograph/graphshield/services/graph"
)

type Project struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Status        string `json:"status"`
	SourceVersion string `json:"sourceVersionId"`
}
type Event struct {
	Sequence int       `json:"sequence"`
	Type     string    `json:"type"`
	At       time.Time `json:"at"`
	Detail   string    `json:"detail"`
}
type Run struct {
	ID        string             `json:"id"`
	ProjectID string             `json:"projectId"`
	Algorithm string             `json:"algorithm"`
	Status    string             `json:"status"`
	Progress  int                `json:"progress"`
	CreatedAt time.Time          `json:"createdAt"`
	Events    []Event            `json:"events"`
	Results   any                `json:"results,omitempty"`
	Cancel    context.CancelFunc `json:"-"`
}
type API struct {
	mu          sync.RWMutex
	projects    map[string]*Project
	runs        map[string]*Run
	idempotency map[string]string
	logger      *slog.Logger
}

func newAPI() *API {
	return &API{projects: map[string]*Project{}, runs: map[string]*Run{}, idempotency: map[string]string{}, logger: slog.New(slog.NewJSONHandler(os.Stdout, nil))}
}
func id(prefix string) string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return prefix + hex.EncodeToString(b)
}

func main() {
	a := newAPI()
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", a.health)
	mux.HandleFunc("POST /api/v1/projects", a.createProject)
	mux.HandleFunc("GET /api/v1/projects/{id}/preview", a.preview)
	mux.HandleFunc("PUT /api/v1/projects/{id}/mapping", a.mapping)
	mux.HandleFunc("POST /api/v1/projects/{id}/runs", a.createRun)
	mux.HandleFunc("GET /api/v1/runs/{id}", a.getRun)
	mux.HandleFunc("GET /api/v1/runs/{id}/events", a.events)
	mux.HandleFunc("POST /api/v1/runs/{id}/cancel", a.cancelRun)
	mux.HandleFunc("POST /api/v1/runs/{id}/retry", a.retryRun)
	mux.HandleFunc("GET /api/v1/runs/{id}/results", a.getResults)
	mux.HandleFunc("GET /api/v1/runs/{id}/export", a.export)
	mux.HandleFunc("GET /api/v1/support/runs", a.supportRuns)
	h := requestMiddleware(cors(mux))
	addr := env("GRAPHSHIELD_API_ADDR", ":8080")
	a.logger.Info("api.ready", "addr", addr)
	if err := http.ListenAndServe(addr, h); err != nil {
		a.logger.Error("api.stopped", "error", err)
		os.Exit(1)
	}
}

func env(k, v string) string {
	if x := os.Getenv(k); x != "" {
		return x
	}
	return v
}
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", env("GRAPHSHIELD_WEB_ORIGIN", "http://localhost:3000"))
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key")
		if r.Method == http.MethodOptions {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}
func requestMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = id("req_")
		}
		w.Header().Set("X-Request-ID", requestID)
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}
func write(w http.ResponseWriter, status int, v any) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func problem(w http.ResponseWriter, status int, code, title, detail string) {
	write(w, status, map[string]any{"type": "https://graphshield.dev/problems/" + strings.ToLower(strings.ReplaceAll(code, "_", "-")), "title": title, "status": status, "detail": detail, "errors": []any{map[string]string{"code": code, "action": "Review the supplied configuration and try again."}}})
}
func decode(r *http.Request, v any) error {
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	return d.Decode(v)
}
func (a *API) health(w http.ResponseWriter, r *http.Request) {
	write(w, 200, map[string]any{"status": "ok", "version": "0.1.0", "time": time.Now().UTC()})
}
func (a *API) createProject(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name string `json:"name"`
	}
	if err := decode(r, &in); err != nil || strings.TrimSpace(in.Name) == "" {
		problem(w, 422, "INVALID_PROJECT", "Project name is required", "Provide a non-empty project name.")
		return
	}
	p := &Project{ID: id("prj_"), Name: in.Name, Status: "DRAFT", SourceVersion: id("src_")}
	a.mu.Lock()
	a.projects[p.ID] = p
	a.mu.Unlock()
	write(w, 201, p)
}
func (a *API) mapping(w http.ResponseWriter, r *http.Request) {
	if !a.hasProject(r.PathValue("id")) {
		problem(w, 404, "PROJECT_NOT_FOUND", "Project not found", "The requested project does not exist.")
		return
	}
	var m map[string]any
	if err := decode(r, &m); err != nil {
		problem(w, 400, "INVALID_JSON", "Mapping could not be read", err.Error())
		return
	}
	write(w, 200, map[string]any{"id": id("map_"), "version": 1, "valid": true, "diagnostics": []any{map[string]any{"code": "ORPHAN_ENDPOINT", "severity": "warning", "count": 43, "action": "Review unmatched device identifiers."}}})
}
func (a *API) preview(w http.ResponseWriter, r *http.Request) {
	if !a.hasProject(r.PathValue("id")) {
		problem(w, 404, "PROJECT_NOT_FOUND", "Project not found", "The requested project does not exist.")
		return
	}
	write(w, 200, map[string]any{"counts": map[string]int{"nodes": 4800, "relationships": 3957}, "sampleSeed": 90426, "nodes": graph.SeedNodes(), "edges": graph.SeedEdges(), "warnings": []string{"43 orphan device references excluded"}})
}
func (a *API) hasProject(projectID string) bool {
	a.mu.RLock()
	defer a.mu.RUnlock()
	_, ok := a.projects[projectID]
	return ok
}

func (a *API) createRun(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")
	if !a.hasProject(projectID) {
		problem(w, 404, "PROJECT_NOT_FOUND", "Project not found", "The requested project does not exist.")
		return
	}
	key := r.Header.Get("Idempotency-Key")
	if key == "" {
		problem(w, 400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency key required", "Provide a unique Idempotency-Key header.")
		return
	}
	var in struct {
		Analysis string `json:"analysis"`
	}
	if err := decode(r, &in); err != nil {
		problem(w, 400, "INVALID_JSON", "Run configuration could not be read", err.Error())
		return
	}
	if in.Analysis != "WCC" && in.Analysis != "PAGERANK" && in.Analysis != "SHORTEST_PATH" {
		problem(w, 422, "UNSUPPORTED_ANALYSIS", "Choose a supported analysis", "Use WCC, PAGERANK, or SHORTEST_PATH.")
		return
	}
	a.mu.Lock()
	if existing := a.idempotency[key]; existing != "" {
		run := a.runs[existing]
		a.mu.Unlock()
		write(w, 202, run)
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	run := &Run{ID: id("run_"), ProjectID: projectID, Algorithm: in.Analysis, Status: "QUEUED", CreatedAt: time.Now().UTC(), Cancel: cancel}
	a.runs[run.ID] = run
	a.idempotency[key] = run.ID
	a.mu.Unlock()
	go a.execute(ctx, run)
	write(w, 202, map[string]any{"id": run.ID, "status": run.Status, "statusUrl": "/api/v1/runs/" + run.ID})
}
func (a *API) event(run *Run, state, detail string, progress int) {
	a.mu.Lock()
	defer a.mu.Unlock()
	run.Status = state
	run.Progress = progress
	run.Events = append(run.Events, Event{Sequence: len(run.Events) + 1, Type: state, At: time.Now().UTC(), Detail: detail})
	a.logger.Info("run.stage", "run_id", run.ID, "stage", state, "progress", progress)
}
func (a *API) execute(ctx context.Context, run *Run) {
	stages := []struct {
		s, d string
		p    int
		wait time.Duration
	}{{"PROJECTING", "Building deterministic in-memory graph", 25, 40 * time.Millisecond}, {"COMPUTING", "Running " + run.Algorithm, 70, 60 * time.Millisecond}, {"WRITING", "Persisting result rows", 90, 30 * time.Millisecond}}
	for _, stage := range stages {
		select {
		case <-ctx.Done():
			a.event(run, "CANCELLED", "Cancellation completed; projection cleaned", 100)
			return
		default:
		}
		a.event(run, stage.s, stage.d, stage.p)
		time.Sleep(stage.wait)
	}
	switch run.Algorithm {
	case "WCC":
		run.Results = graph.WCC(graph.SeedNodes(), graph.SeedEdges())
	case "PAGERANK":
		run.Results = graph.PageRank(graph.SeedNodes(), graph.SeedEdges(), .85, 20)
	case "SHORTEST_PATH":
		run.Results = graph.ShortestPath("A-1047", "A-7314", graph.SeedEdges())
	}
	a.event(run, "SUCCEEDED", "Results persisted; projection cleaned", 100)
}
func (a *API) run(id string) (*Run, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	x, ok := a.runs[id]
	return x, ok
}
func (a *API) getRun(w http.ResponseWriter, r *http.Request) {
	run, ok := a.run(r.PathValue("id"))
	if !ok {
		problem(w, 404, "RUN_NOT_FOUND", "Run not found", "The requested run does not exist.")
		return
	}
	write(w, 200, run)
}
func (a *API) events(w http.ResponseWriter, r *http.Request) {
	run, ok := a.run(r.PathValue("id"))
	if !ok {
		problem(w, 404, "RUN_NOT_FOUND", "Run not found", "The requested run does not exist.")
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	for _, e := range run.Events {
		b, _ := json.Marshal(e)
		fmt.Fprintf(w, "id: %d\nevent: progress\ndata: %s\n\n", e.Sequence, b)
	}
}
func (a *API) cancelRun(w http.ResponseWriter, r *http.Request) {
	run, ok := a.run(r.PathValue("id"))
	if !ok {
		problem(w, 404, "RUN_NOT_FOUND", "Run not found", "The requested run does not exist.")
		return
	}
	if run.Status == "SUCCEEDED" || run.Status == "FAILED" || run.Status == "CANCELLED" {
		problem(w, 409, "TERMINAL_RUN", "Run is already complete", "Terminal runs cannot be cancelled.")
		return
	}
	a.event(run, "CANCELLING", "Cancellation requested", run.Progress)
	run.Cancel()
	write(w, 202, map[string]string{"id": run.ID, "status": "CANCELLING"})
}
func (a *API) retryRun(w http.ResponseWriter, r *http.Request) {
	old, ok := a.run(r.PathValue("id"))
	if !ok {
		problem(w, 404, "RUN_NOT_FOUND", "Run not found", "The requested run does not exist.")
		return
	}
	key := r.Header.Get("Idempotency-Key")
	if key == "" {
		problem(w, 400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency key required", "Provide a unique Idempotency-Key header.")
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	run := &Run{ID: id("run_"), ProjectID: old.ProjectID, Algorithm: old.Algorithm, Status: "QUEUED", CreatedAt: time.Now().UTC(), Cancel: cancel}
	a.mu.Lock()
	a.runs[run.ID] = run
	a.idempotency[key] = run.ID
	a.mu.Unlock()
	go a.execute(ctx, run)
	write(w, 202, map[string]any{"id": run.ID, "retryOf": old.ID, "status": run.Status})
}
func (a *API) getResults(w http.ResponseWriter, r *http.Request) {
	run, ok := a.run(r.PathValue("id"))
	if !ok {
		problem(w, 404, "RUN_NOT_FOUND", "Run not found", "The requested run does not exist.")
		return
	}
	if run.Status != "SUCCEEDED" {
		problem(w, 409, "RESULT_NOT_READY", "Results are not ready", "Wait for the run to succeed.")
		return
	}
	write(w, 200, map[string]any{"items": run.Results, "nextCursor": nil})
}
func (a *API) export(w http.ResponseWriter, r *http.Request) {
	run, ok := a.run(r.PathValue("id"))
	if !ok || run.Status != "SUCCEEDED" {
		problem(w, 409, "RESULT_NOT_READY", "Results are not ready", "Wait for a successful run.")
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=graphshield-"+run.ID+".csv")
	cw := csv.NewWriter(w)
	defer cw.Flush()
	_ = cw.Write([]string{"run_id", run.ID})
	_ = cw.Write([]string{"algorithm", run.Algorithm})
	_ = cw.Write([]string{"source_checksum", "a93f0c2e"})
	_ = cw.Write([]string{"results_json"})
	b, _ := json.Marshal(run.Results)
	_ = cw.Write([]string{formulaSafe(string(b))})
}
func formulaSafe(s string) string {
	if len(s) > 0 && strings.ContainsRune("=+-@", rune(s[0])) {
		return "'" + s
	}
	return s
}
func (a *API) supportRuns(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-GraphShield-Role") != "operator" {
		problem(w, 403, "OPERATOR_REQUIRED", "Operator access required", "Ask an administrator for the operator role.")
		return
	}
	a.mu.RLock()
	defer a.mu.RUnlock()
	items := make([]*Run, 0, len(a.runs))
	for _, run := range a.runs {
		items = append(items, run)
	}
	write(w, 200, map[string]any{"items": items, "count": len(items)})
}
