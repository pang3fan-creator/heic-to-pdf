import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import NotFoundPage from "./not-found";

vi.mock("@/components/Navbar", () => ({
  default: () => createElement("nav", { "aria-label": "Main navigation" }),
}));

vi.mock("@/components/Footer", () => ({
  default: () => createElement("footer"),
}));

function renderNotFound() {
  return render(
    createElement(
      NextIntlClientProvider,
      { locale: "en", messages },
      createElement(NotFoundPage),
    ),
  );
}

describe("NotFoundPage", () => {
  it("renders the localized 404 message", () => {
    renderNotFound();

    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(
      screen.getByText("The page you are looking for may have moved, expired, or never existed."),
    ).toBeTruthy();
  });

  it("links back to the converter and support contact", () => {
    renderNotFound();

    expect(screen.getByRole("link", { name: "Back to converter" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Contact support" }).getAttribute("href")).toBe(
      "mailto:support@heicpdf.to",
    );
  });

  it("does not add page-level structured data", () => {
    const { container } = renderNotFound();

    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
