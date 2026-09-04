package gds

import (
	"context"
	"testing"
)

func TestLocalExecutorSupportsProductionContract(t *testing.T) {
	executor := Local{}
	for _, algorithm := range []string{"WCC", "PAGERANK", "SHORTEST_PATH"} {
		result, err := executor.Execute(context.Background(), "run_test", algorithm, map[string]any{"source": "A-1047", "target": "A-7314"})
		if err != nil {
			t.Fatalf("%s failed: %v", algorithm, err)
		}
		if result == nil {
			t.Fatalf("%s returned nil", algorithm)
		}
	}
}
func TestLocalExecutorRejectsUnknownAlgorithm(t *testing.T) {
	_, err := Local{}.Execute(context.Background(), "run_test", "LOUVAIN", nil)
	if err == nil {
		t.Fatal("expected unsupported algorithm error")
	}
}
func TestGraphNameSanitizesRunID(t *testing.T) {
	if got := graphName("run-123/drop"); got != "gs_run_123_drop" {
		t.Fatalf("unexpected graph name %q", got)
	}
}
