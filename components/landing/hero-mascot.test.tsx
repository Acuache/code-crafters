// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { launchConfetti } from "@/components/gamification/celebrate";

import { HeroMascot } from "./hero-mascot";
import { HERO_POSE_CYCLE } from "./mascot-poses";

vi.mock("@/components/gamification/celebrate", () => ({
  launchConfetti: vi.fn(() => Promise.resolve()),
}));

function visiblePose(): string | null {
  return document.querySelector("[data-pose]")?.getAttribute("data-pose") ?? null;
}

beforeEach(() => {
  vi.mocked(launchConfetti).mockClear();
});

afterEach(cleanup);

describe("HeroMascot", () => {
  it("empieza con el cohete y el globo que invita a tocarla", () => {
    render(<HeroMascot />);

    expect(visiblePose()).toBe("rocket");
    expect(screen.getByText("¡Tócame!")).toBeTruthy();
  });

  it("cada clic pasa a la pose siguiente, lanza confetti y esconde el globo", async () => {
    const user = userEvent.setup();
    render(<HeroMascot />);

    await user.click(screen.getByRole("button", { name: "Cambiar la pose de la mascota" }));

    expect(visiblePose()).toBe("wave");
    expect(launchConfetti).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("¡Tócame!")).toBeNull();
  });

  it("después de la última pose vuelve a la primera", async () => {
    const user = userEvent.setup();
    render(<HeroMascot />);
    const mascot = screen.getByRole("button", { name: "Cambiar la pose de la mascota" });

    for (let click = 0; click < HERO_POSE_CYCLE.length; click++) {
      await user.click(mascot);
    }

    expect(visiblePose()).toBe("rocket");
  });

  it("también cambia con el teclado", async () => {
    const user = userEvent.setup();
    render(<HeroMascot />);

    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(visiblePose()).toBe("orb");
  });

  it("si el confetti falla, la pose cambia igual", async () => {
    vi.mocked(launchConfetti).mockRejectedValueOnce(new Error("sin red"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<HeroMascot />);

    await user.click(screen.getByRole("button", { name: "Cambiar la pose de la mascota" }));

    expect(visiblePose()).toBe("wave");
    consoleError.mockRestore();
  });
});
