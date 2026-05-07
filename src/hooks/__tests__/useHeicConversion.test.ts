// src/hooks/__tests__/useHeicConversion.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHeicConversion } from "../useHeicConversion";

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  private handlers: Map<string, (e: MessageEvent) => void> = new Map();

  constructor(_url: URL) {}

  postMessage(msg: unknown, _transfer?: unknown[]) {
    const m = msg as { type: string };
    if (m.type === "init") {
      setTimeout(() => {
        this.trigger({ data: { type: "ready" } });
      }, 0);
    }
  }

  addEventListener(type: string, handler: (e: MessageEvent) => void) {
    this.handlers.set(type + handler.toString(), handler);
  }

  removeEventListener(_type: string, _handler: (e: MessageEvent) => void) {
    // noop
  }

  trigger(e: MessageEvent) {
    this.handlers.forEach((h) => h(e));
  }

  terminate() {
    this.handlers.clear();
  }
}

const OriginalWorker = globalThis.Worker;

describe("useHeicConversion", () => {
  beforeEach(() => {
    // @ts-expect-error - mock worker
    globalThis.Worker = MockWorker;
  });

  afterEach(() => {
    globalThis.Worker = OriginalWorker;
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useHeicConversion());
    expect(result.current.state.status).toBe("idle");
  });

  it("transitions to selected state when files are added", () => {
    const { result } = renderHook(() => useHeicConversion());

    const file = new File(["fake-heic-data"], "test.heic", {
      type: "application/octet-stream",
    });

    act(() => {
      result.current.selectFiles([file]);
    });

    expect(result.current.state.status).toBe("selected");
    if (result.current.state.status === "selected") {
      expect(result.current.state.files).toHaveLength(1);
      expect(result.current.state.files[0].name).toBe("test.heic");
    }
  });

  it("filters non-HEIC files", () => {
    const { result } = renderHook(() => useHeicConversion());

    act(() => {
      result.current.selectFiles([
        new File(["a"], "photo.heic", { type: "application/octet-stream" }),
        new File(["b"], "document.pdf", { type: "application/pdf" }),
        new File(["c"], "image.jpg", { type: "image/jpeg" }),
      ]);
    });

    expect(result.current.state.status).toBe("selected");
    if (result.current.state.status === "selected") {
      expect(result.current.state.files).toHaveLength(1);
      expect(result.current.state.files[0].name).toBe("photo.heic");
    }
  });

  it("resets to idle state", () => {
    const { result } = renderHook(() => useHeicConversion());

    act(() => {
      result.current.selectFiles([new File(["a"], "test.heic", { type: "application/octet-stream" })]);
    });

    expect(result.current.state.status).toBe("selected");

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.status).toBe("idle");
  });

  it("filters files exceeding max size", () => {
    const { result } = renderHook(() => useHeicConversion());

    // 51MB file
    const bigFile = new File(["x".repeat(51 * 1024 * 1024)], "large.heic", {
      type: "application/octet-stream",
    });
    const smallFile = new File(["small"], "small.heic", {
      type: "application/octet-stream",
    });

    act(() => {
      result.current.selectFiles([bigFile, smallFile]);
    });

    expect(result.current.state.status).toBe("selected");
    if (result.current.state.status === "selected") {
      expect(result.current.state.files).toHaveLength(1);
      expect(result.current.state.files[0].name).toBe("small.heic");
    }
  });

  it("handles HEIF extension files", () => {
    const { result } = renderHook(() => useHeicConversion());

    act(() => {
      result.current.selectFiles([
        new File(["a"], "photo.heif", { type: "application/octet-stream" }),
      ]);
    });

    expect(result.current.state.status).toBe("selected");
    if (result.current.state.status === "selected") {
      expect(result.current.state.files).toHaveLength(1);
    }
  });

  it("updateSettings only works in selected state", () => {
    const { result } = renderHook(() => useHeicConversion());

    // Try updating in idle state
    act(() => {
      result.current.updateSettings({
        paperSize: "a4",
        margins: "normal",
        orientation: "landscape",
      });
    });

    expect(result.current.state.status).toBe("idle");

    // Select files
    act(() => {
      result.current.selectFiles([new File(["a"], "test.heic", { type: "application/octet-stream" })]);
    });

    // Update settings
    act(() => {
      result.current.updateSettings({
        paperSize: "original",
        margins: "none",
        orientation: "landscape",
      });
    });

    if (result.current.state.status === "selected") {
      expect(result.current.state.settings.paperSize).toBe("original");
      expect(result.current.state.settings.margins).toBe("none");
      expect(result.current.state.settings.orientation).toBe("landscape");
    }
  });
});
