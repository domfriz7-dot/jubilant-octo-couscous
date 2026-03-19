import React from 'react';
import { Switch } from 'react-native';
import { SettingRow } from './SettingRow';
import { useAppTheme } from '../theme/ThemeProvider';
import { haptics } from '../haptics';

type SettingToggleProps = {
  label: string;
  description?: string;
  value: boolean;
  onChange?: (value: boolean) => void;
};

export default function SettingToggle({ label, description, value, onChange }: SettingToggleProps) {
  const { theme } = useAppTheme();
  return (
    <SettingRow
      label={label}
      description={description}
      right={
        <Switch
          value={!!value}
          onValueChange={(v) => { haptics.light(); onChange?.(v); }}
          trackColor={{ false: theme.border, true: theme.accent.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={theme.border}
        />
      }
    />
  );
}
