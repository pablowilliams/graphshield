package gds

import (
	"context"
	"fmt"
	"regexp"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/pablograph/graphshield/services/graph"
)

type Executor interface {
	Execute(context.Context, string, string, map[string]any) (any, error)
	Cleanup(context.Context, string) error
	Close(context.Context) error
}

type Local struct{}

func (Local) Execute(_ context.Context, _ string, algorithm string, config map[string]any) (any, error) {
	switch algorithm {
	case "WCC":
		return graph.WCC(graph.SeedNodes(), graph.SeedEdges()), nil
	case "PAGERANK":
		return graph.PageRank(graph.SeedNodes(), graph.SeedEdges(), .85, 20), nil
	case "SHORTEST_PATH":
		start, target := "A-1047", "A-7314"
		if x, ok := config["source"].(string); ok {
			start = x
		}
		if x, ok := config["target"].(string); ok {
			target = x
		}
		return graph.ShortestPath(start, target, graph.SeedEdges()), nil
	default:
		return nil, fmt.Errorf("unsupported algorithm %s", algorithm)
	}
}
func (Local) Cleanup(context.Context, string) error { return nil }
func (Local) Close(context.Context) error           { return nil }

type Neo4j struct {
	driver   neo4j.DriverWithContext
	database string
}

func OpenNeo4j(ctx context.Context, uri, user, password, database string) (*Neo4j, error) {
	driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(user, password, ""))
	if err != nil {
		return nil, err
	}
	if err := driver.VerifyConnectivity(ctx); err != nil {
		driver.Close(ctx)
		return nil, err
	}
	return &Neo4j{driver: driver, database: database}, nil
}
func (n *Neo4j) Close(ctx context.Context) error { return n.driver.Close(ctx) }

var safeName = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_]{0,62}$`)

func graphName(runID string) string {
	clean := regexp.MustCompile(`[^A-Za-z0-9_]`).ReplaceAllString(runID, "_")
	return "gs_" + clean
}
func (n *Neo4j) Execute(ctx context.Context, runID, algorithm string, config map[string]any) (any, error) {
	name := graphName(runID)
	if _, err := neo4j.ExecuteQuery(ctx, n.driver, `CALL gds.graph.project($name,['Account','Device','IpAddress'],{TRANSFERRED_TO:{orientation:'NATURAL',properties:'amount'},USED:{orientation:'UNDIRECTED'},CONNECTED_FROM:{orientation:'UNDIRECTED'}})`, map[string]any{"name": name}, neo4j.EagerResultTransformer, neo4j.ExecuteQueryWithDatabase(n.database)); err != nil {
		return nil, err
	}
	switch algorithm {
	case "WCC":
		return n.query(ctx, `CALL gds.wcc.stream($name) YIELD nodeId, componentId RETURN gds.util.asNode(nodeId).accountId AS entityId, componentId ORDER BY componentId, entityId`, name, nil)
	case "PAGERANK":
		return n.query(ctx, `CALL gds.pageRank.stream($name,{relationshipTypes:['TRANSFERRED_TO'],dampingFactor:$damping,maxIterations:$iterations}) YIELD nodeId, score RETURN gds.util.asNode(nodeId).accountId AS entityId, score ORDER BY score DESC`, name, map[string]any{"damping": number(config, "dampingFactor", .85), "iterations": int(number(config, "maxIterations", 20))})
	case "SHORTEST_PATH":
		return n.query(ctx, `MATCH (source:Account {accountId:$source}),(target:Account {accountId:$target}) CALL gds.shortestPath.dijkstra.stream($name,{sourceNode:source,targetNodes:target,relationshipTypes:['TRANSFERRED_TO']}) YIELD totalCost,nodeIds RETURN totalCost,[id IN nodeIds | gds.util.asNode(id).accountId] AS path`, name, map[string]any{"source": stringValue(config, "source", "A-1047"), "target": stringValue(config, "target", "A-7314")})
	default:
		return nil, fmt.Errorf("unsupported algorithm %s", algorithm)
	}
}
func (n *Neo4j) query(ctx context.Context, cypher, name string, extra map[string]any) ([]map[string]any, error) {
	params := map[string]any{"name": name}
	for k, v := range extra {
		params[k] = v
	}
	result, err := neo4j.ExecuteQuery(ctx, n.driver, cypher, params, neo4j.EagerResultTransformer, neo4j.ExecuteQueryWithDatabase(n.database))
	if err != nil {
		return nil, err
	}
	rows := make([]map[string]any, 0, len(result.Records))
	for _, record := range result.Records {
		row := map[string]any{}
		for i, key := range record.Keys {
			row[key] = record.Values[i]
		}
		rows = append(rows, row)
	}
	return rows, nil
}
func (n *Neo4j) Cleanup(ctx context.Context, runID string) error {
	name := graphName(runID)
	_, err := neo4j.ExecuteQuery(ctx, n.driver, `CALL gds.graph.drop($name,false) YIELD graphName RETURN graphName`, map[string]any{"name": name}, neo4j.EagerResultTransformer, neo4j.ExecuteQueryWithDatabase(n.database))
	return err
}
func number(m map[string]any, key string, fallback float64) float64 {
	if v, ok := m[key].(float64); ok {
		return v
	}
	return fallback
}
func stringValue(m map[string]any, key, fallback string) string {
	if v, ok := m[key].(string); ok && safeName.MatchString(v) {
		return v
	}
	return fallback
}
