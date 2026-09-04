# ADR 001: Preserve an API/worker boundary

Status: accepted. Analysis submission returns immediately, while computation advances through append-only stages. The portfolio binary runs the worker in-process to keep setup instant, but the service boundary and cancellable execution context allow it to move to a queue-backed worker without changing the client contract.
