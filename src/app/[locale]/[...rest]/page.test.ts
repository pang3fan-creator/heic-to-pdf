import { describe, expect, it, vi } from "vitest";
import CatchAllPage from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("CatchAllPage", () => {
  it("delegates unknown routes to the locale not-found page", () => {
    expect(() => CatchAllPage()).toThrow("NEXT_NOT_FOUND");
  });
});
