package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrQueueEmpty = errors.New("run queue is empty")

type ClaimedRun struct {
	ID        string
	ProjectID string
	Algorithm string
	Config    map[string]any
	Attempt   int
}

type Postgres struct{ pool *pgxpool.Pool }

type RunSnapshot struct {
	ID         string          `json:"id"`
	ProjectID  string          `json:"projectId"`
	Algorithm  string          `json:"algorithm"`
	Status     string          `json:"status"`
	Progress   int             `json:"progress"`
	Result     json.RawMessage `json:"results,omitempty"`
	CreatedAt  time.Time       `json:"createdAt"`
	FinishedAt *time.Time      `json:"finishedAt,omitempty"`
}
type EventSnapshot struct {
	Sequence  int       `json:"sequence"`
	Type      string    `json:"type"`
	Detail    string    `json:"detail"`
	CreatedAt time.Time `json:"at"`
}

func Open(ctx context.Context, databaseURL string) (*Postgres, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}
	config.MaxConns = 10
	config.MaxConnLifetime = 30 * time.Minute
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Postgres{pool: pool}, nil
}

func (p *Postgres) Close() { p.pool.Close() }

func (p *Postgres) CreateProject(ctx context.Context, id, ownerID, name, sourceVersion string) error {
	now := time.Now().UTC()
	if _, err := p.pool.Exec(ctx, `INSERT INTO users (id,email,role,created_at) VALUES ($1,$2,'analyst',$3) ON CONFLICT (id) DO NOTHING`, ownerID, ownerID+"@graphshield.local", now); err != nil {
		return err
	}
	_, err := p.pool.Exec(ctx, `INSERT INTO projects (id,owner_id,name,status,source_version_id) VALUES ($1,$2,$3,'DRAFT',$4)`, id, ownerID, name, sourceVersion)
	return err
}

func (p *Postgres) ProjectExists(ctx context.Context, id, ownerID string) (bool, error) {
	var found bool
	err := p.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM projects WHERE id=$1 AND owner_id=$2)`, id, ownerID).Scan(&found)
	return found, err
}

func (p *Postgres) Enqueue(ctx context.Context, id, projectID, ownerID, algorithm, idempotencyKey string, config map[string]any) (*RunSnapshot, error) {
	raw, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	var run RunSnapshot
	err = p.pool.QueryRow(ctx, `INSERT INTO analysis_runs (id,project_id,algorithm,config_json,status,idempotency_key,created_at) VALUES ($1,$2,$3,$4,'QUEUED',$5,now()) ON CONFLICT (project_id,idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET idempotency_key=excluded.idempotency_key RETURNING id,project_id,algorithm,status,0,created_at`, id, projectID, algorithm, string(raw), idempotencyKey).Scan(&run.ID, &run.ProjectID, &run.Algorithm, &run.Status, &run.Progress, &run.CreatedAt)
	return &run, err
}

func (p *Postgres) GetRun(ctx context.Context, id, ownerID string) (*RunSnapshot, error) {
	var run RunSnapshot
	var raw []byte
	err := p.pool.QueryRow(ctx, `SELECT r.id,r.project_id,r.algorithm,r.status,CASE r.status WHEN 'QUEUED' THEN 5 WHEN 'PROJECTING' THEN 25 WHEN 'COMPUTING' THEN 70 WHEN 'WRITING' THEN 90 ELSE 100 END,COALESCE(r.result_json,'null'::jsonb),r.created_at,r.finished_at FROM analysis_runs r JOIN projects p ON p.id=r.project_id WHERE r.id=$1 AND p.owner_id=$2`, id, ownerID).Scan(&run.ID, &run.ProjectID, &run.Algorithm, &run.Status, &run.Progress, &raw, &run.CreatedAt, &run.FinishedAt)
	if err != nil {
		return nil, err
	}
	if string(raw) != "null" {
		run.Result = raw
	}
	return &run, nil
}

func (p *Postgres) CancelRun(ctx context.Context, id, ownerID string) error {
	tag, err := p.pool.Exec(ctx, `UPDATE analysis_runs r SET status='CANCELLED',finished_at=now() FROM projects p WHERE r.project_id=p.id AND r.id=$1 AND p.owner_id=$2 AND r.status IN ('QUEUED','PROJECTING','COMPUTING','WRITING')`, id, ownerID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return errors.New("run not cancellable")
	}
	return nil
}

func (p *Postgres) ListRuns(ctx context.Context, ownerID string, operator bool) ([]RunSnapshot, error) {
	query := `SELECT r.id,r.project_id,r.algorithm,r.status,CASE r.status WHEN 'QUEUED' THEN 5 WHEN 'PROJECTING' THEN 25 WHEN 'COMPUTING' THEN 70 WHEN 'WRITING' THEN 90 ELSE 100 END,COALESCE(r.result_json,'null'::jsonb),r.created_at,r.finished_at FROM analysis_runs r JOIN projects p ON p.id=r.project_id`
	args := []any{}
	if !operator {
		query += ` WHERE p.owner_id=$1`
		args = append(args, ownerID)
	}
	query += ` ORDER BY r.created_at DESC LIMIT 100`
	rows, err := p.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []RunSnapshot{}
	for rows.Next() {
		var run RunSnapshot
		var raw []byte
		if err := rows.Scan(&run.ID, &run.ProjectID, &run.Algorithm, &run.Status, &run.Progress, &raw, &run.CreatedAt, &run.FinishedAt); err != nil {
			return nil, err
		}
		if string(raw) != "null" {
			run.Result = raw
		}
		out = append(out, run)
	}
	return out, rows.Err()
}
func (p *Postgres) Events(ctx context.Context, runID, ownerID string) ([]EventSnapshot, error) {
	rows, err := p.pool.Query(ctx, `SELECT e.sequence,e.type,e.payload->>'detail',e.created_at FROM job_events e JOIN analysis_runs r ON r.id=e.run_id JOIN projects p ON p.id=r.project_id WHERE e.run_id=$1 AND p.owner_id=$2 ORDER BY e.sequence`, runID, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []EventSnapshot{}
	for rows.Next() {
		var event EventSnapshot
		if err := rows.Scan(&event.Sequence, &event.Type, &event.Detail, &event.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, event)
	}
	return out, rows.Err()
}

func (p *Postgres) ClaimRun(ctx context.Context, workerID string, lease time.Duration) (*ClaimedRun, error) {
	tx, err := p.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var run ClaimedRun
	var raw []byte
	err = tx.QueryRow(ctx, `
		SELECT id, project_id, algorithm, config_json, attempt + 1
		FROM analysis_runs
		WHERE status = 'QUEUED' OR (status IN ('PROJECTING','COMPUTING','WRITING') AND lease_expires_at < now())
		ORDER BY created_at
		FOR UPDATE SKIP LOCKED LIMIT 1`).Scan(&run.ID, &run.ProjectID, &run.Algorithm, &raw, &run.Attempt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrQueueEmpty
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &run.Config); err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE analysis_runs SET status='PROJECTING',attempt=$1,lease_owner=$2,lease_expires_at=$3,heartbeat_at=now() WHERE id=$4`, run.Attempt, workerID, time.Now().Add(lease), run.ID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &run, nil
}

func (p *Postgres) Heartbeat(ctx context.Context, runID, workerID string, lease time.Duration) error {
	tag, err := p.pool.Exec(ctx, `UPDATE analysis_runs SET heartbeat_at=now(),lease_expires_at=$1 WHERE id=$2 AND lease_owner=$3 AND status NOT IN ('SUCCEEDED','FAILED','CANCELLED')`, time.Now().Add(lease), runID, workerID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return errors.New("worker lease lost")
	}
	return nil
}

func (p *Postgres) Advance(ctx context.Context, runID, workerID, state, detail string) error {
	return p.withEvent(ctx, runID, workerID, state, detail, nil, nil)
}
func (p *Postgres) Complete(ctx context.Context, runID, workerID string, result any) error {
	raw, err := json.Marshal(result)
	if err != nil {
		return err
	}
	return p.withEvent(ctx, runID, workerID, "SUCCEEDED", "Results persisted and projection cleaned", raw, nil)
}
func (p *Postgres) Fail(ctx context.Context, runID, workerID, code, detail string) error {
	return p.withEvent(ctx, runID, workerID, "FAILED", detail, nil, &code)
}

func (p *Postgres) withEvent(ctx context.Context, runID, workerID, state, detail string, result []byte, errorCode *string) error {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var sequence int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(sequence),0)+1 FROM job_events WHERE run_id=$1`, runID).Scan(&sequence); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `UPDATE analysis_runs SET status=$1,result_json=COALESCE($2::jsonb,result_json),error_code=$3,finished_at=CASE WHEN $1 IN ('SUCCEEDED','FAILED','CANCELLED') THEN now() ELSE finished_at END WHERE id=$4 AND lease_owner=$5`, state, result, errorCode, runID, workerID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return errors.New("worker lease lost")
	}
	_, err = tx.Exec(ctx, `INSERT INTO job_events (id,run_id,sequence,type,payload) VALUES (gen_random_uuid()::text,$1,$2,$3,jsonb_build_object('detail',$4))`, runID, sequence, state, detail)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
