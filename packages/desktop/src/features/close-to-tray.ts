import { Menu, Tray, type BrowserWindow } from "electron";

export function createCloseToTray({
  iconPath,
  appName,
  show,
  quit,
}: {
  iconPath: string;
  appName: string;
  show: () => void;
  quit: () => void;
}) {
  let tray: Tray | null = null;
  let quitting = false;
  const hidden = new Set<BrowserWindow>();

  function restoreHidden(): void {
    for (const win of hidden) {
      if (win.isDestroyed()) continue;
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
    hidden.clear();
  }

  function restore(): void {
    if (hidden.size > 0) restoreHidden();
    else show();
  }

  return {
    setEnabled(enabled: boolean): void {
      if (enabled) {
        if (tray) return;
        tray = new Tray(iconPath);
        tray.setToolTip(appName);
        tray.setContextMenu(
          Menu.buildFromTemplate([
            { label: "Open " + appName, click: restore },
            { type: "separator" },
            { label: "Quit " + appName, click: quit },
          ]),
        );
        tray.on("click", restore);
        return;
      }
      restoreHidden();
      tray?.destroy();
      tray = null;
    },
    attach(win: BrowserWindow): void {
      win.on("close", (event) => {
        if (quitting || !tray) return;
        event.preventDefault();
        hidden.add(win);
        win.hide();
      });
      win.on("show", () => hidden.delete(win));
      win.on("closed", () => hidden.delete(win));
    },
    hasHiddenWindows: () => hidden.size > 0,
    restore,
    beginQuit(): void {
      quitting = true;
    },
  };
}
