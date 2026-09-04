package graph

import "testing"

func TestWCCSeedGraph(t *testing.T) {
	got := WCC(SeedNodes(), SeedEdges())
	if len(got) != 1 || got[0].Size != 10 {
		t.Fatalf("expected one ten-node component, got %#v", got)
	}
}
func TestPageRankRanksAllNodes(t *testing.T) {
	got := PageRank(SeedNodes(), SeedEdges(), .85, 20)
	if len(got) != len(SeedNodes()) {
		t.Fatalf("got %d ranks", len(got))
	}
	if got[0].Score < got[len(got)-1].Score {
		t.Fatal("results are not descending")
	}
}
func TestShortestPath(t *testing.T) {
	got := ShortestPath("A-1047", "A-7314", SeedEdges())
	if len(got) < 2 || got[0] != "A-1047" || got[len(got)-1] != "A-7314" {
		t.Fatalf("unexpected path %#v", got)
	}
}
func TestNoPath(t *testing.T) {
	if got := ShortestPath("A", "Z", []Edge{{"A", "B", "USED", 0}}); got != nil {
		t.Fatalf("expected no path, got %#v", got)
	}
}
