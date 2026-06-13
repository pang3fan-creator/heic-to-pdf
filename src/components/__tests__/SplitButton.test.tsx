import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SplitButton from "../SplitButton";

function renderSplitButton() {
  const onMainClick = vi.fn();
  const onDevice = vi.fn();
  const onDropbox = vi.fn();

  render(
    <SplitButton
      label="Select HEIC file(s)"
      menuLabel="Choose source"
      onMainClick={onMainClick}
      items={[
        { key: "device", label: "Device", onSelect: onDevice },
        { key: "dropbox", label: "Dropbox", onSelect: onDropbox },
      ]}
    />,
  );

  return { onMainClick, onDevice, onDropbox };
}

describe("SplitButton", () => {
  it("keeps the main button action separate from the menu trigger", () => {
    const { onMainClick } = renderSplitButton();

    fireEvent.click(screen.getByRole("button", { name: "Select HEIC file(s)" }));

    expect(onMainClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes an open menu when the main button is clicked", () => {
    const { onMainClick } = renderSplitButton();

    fireEvent.click(screen.getByRole("button", { name: "Choose source" }));
    fireEvent.click(screen.getByRole("button", { name: "Select HEIC file(s)" }));

    expect(onMainClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the menu from the trigger button", () => {
    renderSplitButton();

    fireEvent.click(screen.getByRole("button", { name: "Choose source" }));

    expect(screen.getByRole("menu", { name: "Choose source" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Device" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Dropbox" })).toBeTruthy();
  });

  it("closes the menu when clicking outside", () => {
    renderSplitButton();

    fireEvent.click(screen.getByRole("button", { name: "Choose source" }));
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes the menu with Escape and returns focus to the trigger", () => {
    renderSplitButton();
    const trigger = screen.getByRole("button", { name: "Choose source" });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("runs a menu item action and closes the menu", () => {
    const { onDropbox } = renderSplitButton();

    fireEvent.click(screen.getByRole("button", { name: "Choose source" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Dropbox" }));

    expect(onDropbox).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
