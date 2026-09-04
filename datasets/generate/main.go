package main

import (
	"encoding/csv"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

const seed int64 = 90426

func main() {
	rng := rand.New(rand.NewSource(seed))
	dir := "datasets/generated"
	if err := os.MkdirAll(dir, 0755); err != nil {
		panic(err)
	}
	accounts := make([][]string, 0, 301)
	for i := 1; i <= 300; i++ {
		risk := []string{"Low", "Low", "Medium", "High"}[rng.Intn(4)]
		accounts = append(accounts, []string{fmt.Sprintf("A-%04d", i), fmt.Sprintf("C-%04d", 1+rng.Intn(220)), time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, rng.Intn(600)).Format("2006-01-02"), "active", risk})
	}
	write(filepath.Join(dir, "accounts.csv"), []string{"account_id", "customer_id", "opened_at", "status", "risk_band"}, accounts)
	transfers := make([][]string, 0, 1200)
	for i := 0; i < 1200; i++ {
		from, to := 1+rng.Intn(300), 1+rng.Intn(300)
		if from == to {
			to = to%300 + 1
		}
		transfers = append(transfers, []string{fmt.Sprintf("T-%06d", i+1), fmt.Sprintf("A-%04d", from), fmt.Sprintf("A-%04d", to), strconv.FormatFloat(20+rng.Float64()*9000, 'f', 2, 64), "EUR", time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC).Add(time.Duration(rng.Intn(31*24)) * time.Hour).Format(time.RFC3339)})
	}
	for i := 1; i <= 14; i++ {
		transfers = append(transfers, []string{fmt.Sprintf("RING-%02d", i), fmt.Sprintf("A-%04d", i), fmt.Sprintf("A-%04d", i%14+1), "9800.00", "EUR", time.Date(2026, 8, 20, i, 0, 0, 0, time.UTC).Format(time.RFC3339)})
	}
	write(filepath.Join(dir, "transfers.csv"), []string{"transfer_id", "sender_id", "recipient_id", "amount", "currency", "occurred_at"}, transfers)
	fmt.Printf("generated deterministic demo data with seed %d in %s\n", seed, dir)
}
func write(path string, header []string, rows [][]string) {
	f, err := os.Create(path)
	if err != nil {
		panic(err)
	}
	defer f.Close()
	w := csv.NewWriter(f)
	defer w.Flush()
	_ = w.Write(header)
	_ = w.WriteAll(rows)
}
