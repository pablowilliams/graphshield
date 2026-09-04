package main

import (
	"bytes"
	"net/http/httptest"
	"testing"
)

func TestCreateProjectValidation(t *testing.T) {
	a := newAPI()
	r := httptest.NewRequest("POST", "/api/v1/projects", bytes.NewBufferString(`{"name":""}`))
	w := httptest.NewRecorder()
	a.createProject(w, r)
	if w.Code != 422 {
		t.Fatalf("expected 422, got %d", w.Code)
	}
}
func TestFormulaSafeExport(t *testing.T) {
	for _, value := range []string{"=SUM(A1:A2)", "+cmd", "-2", "@import"} {
		if got := formulaSafe(value); got[0] != '\'' {
			t.Fatalf("unsafe export value %q", got)
		}
	}
	if got := formulaSafe("ordinary"); got != "ordinary" {
		t.Fatalf("changed safe value: %q", got)
	}
}
