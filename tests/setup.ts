import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
const values = new Map<string,string>();
const storage = { getItem: (key:string) => values.get(key) ?? null, setItem: (key:string,value:string) => values.set(key,String(value)), removeItem: (key:string) => values.delete(key), clear: () => values.clear(), key: (index:number) => Array.from(values.keys())[index] ?? null, get length(){ return values.size; } };
Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { value: vi.fn(() => null), configurable: true });
