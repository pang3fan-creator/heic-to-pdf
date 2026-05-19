import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LanguageSwitcher from "../LanguageSwitcher";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

const mockReplace = vi.fn();
vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/privacy",
  routing: { locales: ["en", "fr"], defaultLocale: "en", localePrefix: "as-needed" },
}));

describe("LanguageSwitcher", () => {
  it("renders a select element with current locale selected", () => {
    render(<LanguageSwitcher />);

    const select = screen.getByLabelText("Select language");
    expect(select).toBeTruthy();
    expect((select as HTMLSelectElement).value).toBe("en");
  });

  it("shows available language options", () => {
    render(<LanguageSwitcher />);

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toContain("English");
    expect(options[1].textContent).toContain("Français");
  });

  it("calls router.replace when changing locale", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<LanguageSwitcher />);

    const select = screen.getByLabelText("Select language") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "fr" } });

    expect(mockReplace).toHaveBeenCalledWith("/privacy", { locale: "fr" });
  });
});
