// src/hooks/__tests__/useHeicConversion.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHeicConversion } from "../useHeicConversion";

// Mock Worker
class MockWorker {
  private handlers: Map<string, (e: MessageEvent) => void> = new Map();

  constructor(_url: URL) {}

  postMessage(msg: unknown, _transfer?: unknown[]) {
    const m = msg as { type: string };
    if (m.type === "init") {
      setTimeout(() => {
        this.trigger({ data: { type: "ready" } } as MessageEvent);
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

  it("transitions to editor state when files are added", () => {
    const { result } = renderHook(() => useHeicConversion());

    const file = new File(["fake-heic-data"], "test.heic", {
      type: "application/octet-stream",
    });

    act(() => {
      result.current.selectFiles([file]);
    });

    expect(result.current.state.status).toBe("editor");
    if (result.current.state.status === "editor") {
      expect(result.current.state.files).toHaveLength(1);
      expect(result.current.state.files[0].name).toBe("test.heic");
    }
  });

  it("filters unsupported files", () => {
    const { result } = renderHook(() => useHeicConversion());

    act(() => {
      result.current.selectFiles([
        new File(["a"], "photo.heic", { type: "image/heic" }),
        new File(["b"], "photo.jpg", { type: "image/jpeg" }),
        new File(["c"], "photo.png", { type: "image/png" }),
        new File(["d"], "photo.webp", { type: "image/webp" }),
        new File(["e"], "document.pdf", { type: "application/pdf" }),
        new File(["f"], "animation.gif", { type: "image/gif" }),
      ]);
    });

    expect(result.current.state.status).toBe("editor");
    if (result.current.state.status === "editor") {
      expect(result.current.state.files).toHaveLength(4);
      expect(result.current.state.files[0].name).toBe("photo.heic");
      expect(result.current.state.files[1].name).toBe("photo.jpg");
      expect(result.current.state.files[2].name).toBe("photo.png");
      expect(result.current.state.files[3].name).toBe("photo.webp");
    }
  });

  it("resets to idle state", () => {
    const { result } = renderHook(() => useHeicConversion());

    act(() => {
      result.current.selectFiles([new File(["a"], "test.heic", { type: "application/octet-stream" })]);
    });

    expect(result.current.state.status).toBe("editor");

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.status).toBe("idle");
  });

  it("closeEditor resets to idle", () => {
    const { result } = renderHook(() => useHeicConversion());

    act(() => {
      result.current.selectFiles([new File(["a"], "test.heic", { type: "application/octet-stream" })]);
    });

    expect(result.current.state.status).toBe("editor");

    act(() => {
      result.current.closeEditor();
    });

    expect(result.current.state.status).toBe("idle");
  });

  it("addMoreFiles appends to existing files in editor", () => {
    const { result } = renderHook(() => useHeicConversion());

    act(() => {
      result.current.selectFiles([new File(["a"], "test.heic", { type: "application/octet-stream" })]);
    });

    expect(result.current.state.status).toBe("editor");

    act(() => {
      result.current.addMoreFiles([new File(["b"], "photo2.heic", { type: "application/octet-stream" })]);
    });

    if (result.current.state.status === "editor") {
      expect(result.current.state.files).toHaveLength(2);
      expect(result.current.state.files[1].name).toBe("photo2.heic");
    }
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

    expect(result.current.state.status).toBe("editor");
    if (result.current.state.status === "editor") {
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

    expect(result.current.state.status).toBe("editor");
    if (result.current.state.status === "editor") {
      expect(result.current.state.files).toHaveLength(1);
    }
  });

  it("updateSettings updates settings in editor state", () => {
    const { result } = renderHook(() => useHeicConversion());

    // Try updating in idle state (should not change state)
    act(() => {
      result.current.updateSettings({
        paperSize: "a4",
        margins: "normal",
        orientation: "landscape",
        pdfQuality: "high",
        merge: true,
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
        pdfQuality: "small",
        merge: true,
      });
    });

    if (result.current.state.status === "editor") {
      expect(result.current.state.settings.paperSize).toBe("original");
      expect(result.current.state.settings.margins).toBe("none");
      expect(result.current.state.settings.orientation).toBe("landscape");
      expect(result.current.state.settings.pdfQuality).toBe("small");
    }
  });

  it("addMoreFiles respects MAX_FILES limit", () => {
    const { result } = renderHook(() => useHeicConversion());

    // Select 20 files
    const files = Array.from({ length: 20 }, (_, i) =>
      new File([`a${i}`], `photo${i}.heic`, { type: "application/octet-stream" })
    );
    act(() => {
      result.current.selectFiles(files);
    });

    // Try adding more
    act(() => {
      result.current.addMoreFiles([new File(["b"], "extra.heic", { type: "application/octet-stream" })]);
    });

    if (result.current.state.status === "editor") {
      expect(result.current.state.files).toHaveLength(20);
    }
  });
});
