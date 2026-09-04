package main

import (
	"bytes"
	"net/http"
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

func TestDecodeRejectsUnknownAndTrailingFields(t *testing.T) {
	for _, body := range []string{`{"name":"case","unexpected":true}`, `{"name":"case"}{"name":"second"}`} {
		request := httptest.NewRequest("POST", "/", bytes.NewBufferString(body))
		var input struct {
			Name string `json:"name"`
		}
		if err := decode(request, &input); err == nil {
			t.Fatalf("accepted invalid body %s", body)
		}
	}
}

func TestSecurityHeaders(t *testing.T) {
	handler := requestMiddleware(security(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(204) })))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest("GET", "/healthz", nil))
	for _, header := range []string{"X-Content-Type-Options", "Content-Security-Policy", "Permissions-Policy", "X-Request-ID"} {
		if response.Header().Get(header) == "" {
			t.Errorf("missing %s", header)
		}
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
