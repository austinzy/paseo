import { EventEmitter } from "node:events";
import type { BrowserWindow } from "electron";
import { describe, expect, it, vi } from "vitest";

const electron = vi.hoisted(() => ({
  trays: [] as Array<
    EventEmitter & { destroy: ReturnType<typeof vi.fn>; setContextMenu: ReturnType<typeof vi.fn> }
  >,
}));
vi.mock("electron", () => ({
  Tray: class extends EventEmitter {
    destroy = vi.fn();
    setContextMenu = vi.fn();
    setToolTip = vi.fn();
    constructor() {
      super();
      electron.trays.push(this);
    }
  },
  Menu: { buildFromTemplate: (items: unknown) => items },
}));

import { createCloseToTray } from "./close-to-tray.js";

function harness() {
  const show = vi.fn();
  const quit = vi.fn();
  const tray = createCloseToTray({ iconPath: "icon.ico", appName: "Paseo", show, quit });
  const window = Object.assign(new EventEmitter(), {
    hide: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
    restore: vi.fn(),
    isDestroyed: () => false,
    isMinimized: () => true,
  });
  tray.attach(window as unknown as BrowserWindow);
  const close = () => {
    const event = { preventDefault: vi.fn() };
    window.emit("close", event);
    return event;
  };
  return { tray, window, close, show, quit };
}

describe("close to tray", () => {
  it("hides a window only when enabled and restores it from the tray", () => {
    const h = harness();
    expect(h.close().preventDefault).not.toHaveBeenCalled();
    h.tray.setEnabled(true);
    expect(h.close().preventDefault).toHaveBeenCalledOnce();
    expect(h.window.hide).toHaveBeenCalledOnce();
    electron.trays.at(-1)!.emit("click");
    expect(h.window.restore).toHaveBeenCalledOnce();
    expect(h.window.show).toHaveBeenCalledOnce();
    expect(h.window.focus).toHaveBeenCalledOnce();
    expect(h.tray.hasHiddenWindows()).toBe(false);
  });

  it("restores hidden windows before disabling the tray", () => {
    const h = harness();
    h.tray.setEnabled(true);
    h.close();
    const icon = electron.trays.at(-1)!;
    h.tray.setEnabled(false);
    expect(h.window.show).toHaveBeenCalledOnce();
    expect(icon.destroy).toHaveBeenCalledOnce();
    expect(h.close().preventDefault).not.toHaveBeenCalled();
  });

  it("allows explicit quit and update shutdown to close hidden windows", () => {
    const h = harness();
    h.tray.setEnabled(true);
    h.tray.beginQuit();
    expect(h.close().preventDefault).not.toHaveBeenCalled();
    expect(h.window.hide).not.toHaveBeenCalled();
  });

  it("provides restore and quit actions in the tray menu", () => {
    const h = harness();
    h.tray.setEnabled(true);
    const icon = electron.trays.at(-1)!;
    const menu = icon.setContextMenu.mock.calls[0][0];
    expect(menu.map((item: { label?: string }) => item.label)).toEqual([
      "Open Paseo",
      undefined,
      "Quit Paseo",
    ]);
    menu[0].click();
    expect(h.show).toHaveBeenCalledOnce();
    menu[2].click();
    expect(h.quit).toHaveBeenCalledOnce();
  });
});
