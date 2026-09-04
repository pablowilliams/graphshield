import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GraphShieldApp } from "../app/GraphShieldApp";

describe("GraphShield investigation shell", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline"))); });

  it("enters the seeded investigation with a resilient backend fallback", async () => {
    const user = userEvent.setup();
    render(<GraphShieldApp />);
    await user.click(screen.getByRole("button", { name: /open sample investigation/i }));
    expect(await screen.findByRole("heading", { name: /choose your evidence/i })).toBeInTheDocument();
    expect(screen.getByText(/resilient demo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /use this evidence/i })).toBeEnabled();
  });

  it("has no serious automated accessibility violations on the landing page", async () => {
    const { container } = render(<GraphShieldApp />);
    const result = await axe(container);
    expect(result.violations.filter(v => ["serious", "critical"].includes(v.impact || ""))).toEqual([]);
  });

  it("restores completed workflow state without blocking first render", async () => {
    localStorage.setItem("graphshield-screen", "analyze");
    localStorage.setItem("graphshield-completed", "3");
    render(<GraphShieldApp />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /what do you want to investigate/i })).toBeInTheDocument());
  });
});
