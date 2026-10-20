/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DESKTOP_SETTINGS } from "./desktop-settings";
import { DesktopWindowSection } from "./window-section";

const runtime = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/constants/platform", () => ({ getIsElectron: () => true }));
vi.mock("@/desktop/host", () => ({
  getDesktopHost: () => ({ platform: "win32", invoke: runtime.invoke }),
}));
vi.mock("@/desktop/hooks/desktop-ipc-error", () => ({
  useDesktopIpcErrorReporter: () => () => {},
  useDesktopIpcQueryErrorToast: () => {},
}));
// Render native settings controls as DOM controls while exercising the real settings query and IPC.
vi.mock("@/components/settings", () => ({
  SettingsSection: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SettingsCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SettingsSwitch: ({
    label,
    value,
    onValueChange,
    disabled,
    error,
  }: {
    label: string;
    value: boolean;
    onValueChange(value: boolean): void;
    disabled: boolean;
    error?: string;
  }) => {
    const change = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => onValueChange(event.target.checked),
      [onValueChange],
    );
    return (
      <>
        <input
          type="checkbox"
          aria-label={label}
          checked={value}
          disabled={disabled}
          onChange={change}
        />
        {error ? <p role="alert">{error}</p> : null}
      </>
    );
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <DesktopWindowSection />
    </QueryClientProvider>,
  );
}

describe("desktop window settings", () => {
  it("saves close-to-tray and prevents duplicate changes while saving", async () => {
    let finish!: (settings: typeof DEFAULT_DESKTOP_SETTINGS) => void;
    runtime.invoke.mockImplementation((command: string) =>
      command === "get_desktop_settings"
        ? Promise.resolve(DEFAULT_DESKTOP_SETTINGS)
        : new Promise((resolve) => {
            finish = resolve;
          }),
    );
    renderSettings();
    const toggle = screen.getByRole("checkbox") as HTMLInputElement;
    await waitFor(() => expect(toggle.disabled).toBe(false));
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.disabled).toBe(true));
    expect(runtime.invoke).toHaveBeenCalledWith("patch_desktop_settings", { closeToTray: true });
    finish({ ...DEFAULT_DESKTOP_SETTINGS, closeToTray: true });
    await waitFor(() => expect(toggle.disabled).toBe(false));
    expect(toggle.checked).toBe(true);
  });

  it("restores the previous value and shows a retryable error when saving fails", async () => {
    runtime.invoke.mockImplementation((command: string) =>
      command === "get_desktop_settings"
        ? Promise.resolve(DEFAULT_DESKTOP_SETTINGS)
        : Promise.reject(new Error("Cannot write settings")),
    );
    renderSettings();
    const toggle = screen.getByRole("checkbox") as HTMLInputElement;
    await waitFor(() => expect(toggle.disabled).toBe(false));
    fireEvent.click(toggle);
    const error = await screen.findByRole("alert");
    expect(error.textContent).toBe("Unable to save desktop settings.");
    expect(toggle.checked).toBe(false);
    expect(toggle.disabled).toBe(false);
  });
});
