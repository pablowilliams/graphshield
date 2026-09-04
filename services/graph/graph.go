package graph

import "sort"

type Node struct {
	ID   string `json:"id"`
	Kind string `json:"kind"`
}
type Edge struct {
	Source string  `json:"source"`
	Target string  `json:"target"`
	Type   string  `json:"type"`
	Weight float64 `json:"weight,omitempty"`
}
type Component struct {
	ID      int      `json:"componentId"`
	Size    int      `json:"size"`
	Members []string `json:"members"`
}
type Score struct {
	ID    string  `json:"id"`
	Score float64 `json:"score"`
	Rank  int     `json:"rank"`
}

func SeedNodes() []Node {
	return []Node{{"A-1047", "Account"}, {"A-2091", "Account"}, {"A-8832", "Account"}, {"A-4120", "Account"}, {"A-7314", "Account"}, {"A-3328", "Account"}, {"D-044", "Device"}, {"D-109", "Device"}, {"IP-77", "IpAddress"}, {"A-5502", "Account"}}
}
func SeedEdges() []Edge {
	return []Edge{{"A-1047", "A-2091", "TRANSFERRED_TO", 12400}, {"A-2091", "A-8832", "TRANSFERRED_TO", 9800}, {"A-8832", "A-4120", "TRANSFERRED_TO", 11150}, {"A-4120", "A-7314", "TRANSFERRED_TO", 7600}, {"A-7314", "A-3328", "TRANSFERRED_TO", 8750}, {"A-3328", "A-1047", "TRANSFERRED_TO", 10200}, {"A-2091", "D-044", "USED", 0}, {"A-3328", "D-044", "USED", 0}, {"A-4120", "D-109", "USED", 0}, {"A-7314", "D-109", "USED", 0}, {"A-1047", "IP-77", "CONNECTED_FROM", 0}, {"A-8832", "IP-77", "CONNECTED_FROM", 0}, {"A-5502", "A-4120", "TRANSFERRED_TO", 22500}}
}

func WCC(nodes []Node, edges []Edge) []Component {
	parent := map[string]string{}
	for _, n := range nodes {
		parent[n.ID] = n.ID
	}
	var find func(string) string
	find = func(x string) string {
		if parent[x] != x {
			parent[x] = find(parent[x])
		}
		return parent[x]
	}
	union := func(a, b string) {
		ra, rb := find(a), find(b)
		if ra != rb {
			parent[rb] = ra
		}
	}
	for _, e := range edges {
		if _, ok := parent[e.Source]; ok {
			if _, ok := parent[e.Target]; ok {
				union(e.Source, e.Target)
			}
		}
	}
	groups := map[string][]string{}
	for _, n := range nodes {
		r := find(n.ID)
		groups[r] = append(groups[r], n.ID)
	}
	out := make([]Component, 0, len(groups))
	i := 1
	for _, members := range groups {
		sort.Strings(members)
		out = append(out, Component{ID: i, Size: len(members), Members: members})
		i++
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Size > out[j].Size })
	return out
}
func PageRank(nodes []Node, edges []Edge, damping float64, iterations int) []Score {
	n := float64(len(nodes))
	scores := map[string]float64{}
	outgoing := map[string][]string{}
	for _, node := range nodes {
		scores[node.ID] = 1 / n
	}
	for _, e := range edges {
		if e.Type == "TRANSFERRED_TO" {
			outgoing[e.Source] = append(outgoing[e.Source], e.Target)
		}
	}
	for i := 0; i < iterations; i++ {
		next := map[string]float64{}
		for _, node := range nodes {
			next[node.ID] = (1 - damping) / n
		}
		for from, targets := range outgoing {
			share := damping * scores[from] / float64(len(targets))
			for _, to := range targets {
				next[to] += share
			}
		}
		scores = next
	}
	out := make([]Score, 0, len(nodes))
	for id, score := range scores {
		out = append(out, Score{ID: id, Score: score})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Score > out[j].Score })
	for i := range out {
		out[i].Rank = i + 1
	}
	return out
}
func ShortestPath(start, target string, edges []Edge) []string {
	adj := map[string][]string{}
	for _, e := range edges {
		adj[e.Source] = append(adj[e.Source], e.Target)
		adj[e.Target] = append(adj[e.Target], e.Source)
	}
	queue := []string{start}
	previous := map[string]string{start: ""}
	for len(queue) > 0 {
		x := queue[0]
		queue = queue[1:]
		if x == target {
			break
		}
		for _, next := range adj[x] {
			if _, seen := previous[next]; !seen {
				previous[next] = x
				queue = append(queue, next)
			}
		}
	}
	if _, ok := previous[target]; !ok {
		return nil
	}
	path := []string{}
	for at := target; at != ""; at = previous[at] {
		path = append(path, at)
	}
	for i, j := 0, len(path)-1; i < j; i, j = i+1, j-1 {
		path[i], path[j] = path[j], path[i]
	}
	return path
}
