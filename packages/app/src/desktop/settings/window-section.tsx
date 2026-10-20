import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsCard, SettingsSection, SettingsSwitch } from "@/components/settings";
import { getDesktopHost } from "@/desktop/host";
import { useDesktopSettings } from "./desktop-settings";

export function DesktopWindowSection() {
  const { t } = useTranslation();
  const { settings, updateSettings, isLoading, isSaving, error } = useDesktopSettings();
  const [saveError, setSaveError] = useState<string>();
  const change = useCallback(
    (closeToTray: boolean) => {
      setSaveError(undefined);
      void updateSettings({ closeToTray }).catch(() => {
        setSaveError(t("desktop.settings.saveFailed"));
      });
    },
    [updateSettings, t],
  );

  if (getDesktopHost()?.platform !== "win32") return null;

  return (
    <SettingsSection title={t("desktop.tray.title")}>
      <SettingsCard>
        <SettingsSwitch
          label={t("desktop.tray.closeToTray")}
          hint={t("desktop.tray.hint")}
          value={settings.closeToTray}
          onValueChange={change}
          disabled={isLoading || isSaving || Boolean(error)}
          error={saveError ?? (error ? t("desktop.settings.loadFailed") : undefined)}
          testID="desktop-close-to-tray"
        />
      </SettingsCard>
    </SettingsSection>
  );
}
