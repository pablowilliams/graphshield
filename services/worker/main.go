package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/pablograph/graphshield/services/gds"
	"github.com/pablograph/graphshield/services/store"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		logger.Error("worker.config", "error", "DATABASE_URL is required")
		os.Exit(2)
	}
	repo, err := store.Open(ctx, databaseURL)
	if err != nil {
		logger.Error("worker.database", "error", err)
		os.Exit(1)
	}
	defer repo.Close()
	var executor gds.Executor = gds.Local{}
	if uri := os.Getenv("NEO4J_URI"); uri != "" {
		live, err := gds.OpenNeo4j(ctx, uri, env("NEO4J_USER", "neo4j"), os.Getenv("NEO4J_PASSWORD"), env("NEO4J_DATABASE", "neo4j"))
		if err != nil {
			logger.Error("worker.neo4j", "error", err)
			os.Exit(1)
		}
		executor = live
	}
	defer executor.Close(context.Background())
	workerID = env("WORKER_ID", "worker-local")
	logger.Info("worker.ready", "worker_id", workerID, "executor", executorName(executor))
	loop(ctx, logger, repo, executor, workerID)
}

var workerID string

func loop(ctx context.Context, logger *slog.Logger, repo *store.Postgres, executor gds.Executor, id string) {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			run, err := repo.ClaimRun(ctx, id, 30*time.Second)
			if errors.Is(err, store.ErrQueueEmpty) {
				continue
			}
			if err != nil {
				logger.Error("worker.claim", "error", err)
				continue
			}
			go execute(ctx, logger, repo, executor, id, run)
		}
	}
}
func execute(ctx context.Context, logger *slog.Logger, repo *store.Postgres, executor gds.Executor, id string, run *store.ClaimedRun) {
	heartbeatCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-heartbeatCtx.Done():
				return
			case <-ticker.C:
				if err := repo.Heartbeat(heartbeatCtx, run.ID, id, 30*time.Second); err != nil {
					logger.Error("worker.heartbeat", "run_id", run.ID, "error", err)
					cancel()
					return
				}
			}
		}
	}()
	if err := repo.Advance(ctx, run.ID, id, "COMPUTING", "Executing graph algorithm"); err != nil {
		return
	}
	result, err := executor.Execute(ctx, run.ID, run.Algorithm, run.Config)
	cleanupErr := executor.Cleanup(context.Background(), run.ID)
	if err != nil {
		_ = repo.Fail(ctx, run.ID, id, "GRAPH_COMPUTE_FAILED", safeError(err))
		return
	}
	if cleanupErr != nil {
		_ = repo.Fail(ctx, run.ID, id, "GRAPH_CLEANUP_FAILED", safeError(cleanupErr))
		return
	}
	if err := repo.Advance(ctx, run.ID, id, "WRITING", "Persisting canonical result rows"); err != nil {
		return
	}
	if err := repo.Complete(ctx, run.ID, id, result); err != nil {
		logger.Error("worker.complete", "run_id", run.ID, "error", err)
		return
	}
	logger.Info("worker.succeeded", "run_id", run.ID, "attempt", run.Attempt)
}
func safeError(err error) string {
	message := err.Error()
	if len(message) > 240 {
		return message[:240]
	}
	return message
}
func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
func executorName(executor gds.Executor) string {
	if _, ok := executor.(*gds.Neo4j); ok {
		return "neo4j-gds"
	}
	return "deterministic-local"
}
