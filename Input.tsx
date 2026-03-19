import React, { useMemo, useState } from 'react';
import { ActionSheetIOS, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SettingRow } from './SettingRow';
import AppText from './AppText';
import { useAppTheme } from '../theme/ThemeProvider';
import { haptics } from '../haptics';
import { useTranslate } from '../../i18n';

interface SettingChoiceProps {
  label: string;
  description?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function SettingChoice({ label, description, options, value, onChange }: SettingChoiceProps) {
  const { theme } = useAppTheme();
  const tr = useTranslate();
  const [open, setOpen] = useState(false);
  const display = useMemo(() => tr(String(value ?? '')), [value, tr]);

  const choose = (next: string) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };

  const openSheet = () => {
    haptics.light();
    if (Platform.OS === 'ios') {
      const buttons = [...options, 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options: buttons.map((x) => tr(x)), cancelButtonIndex: buttons.length - 1, title: tr(label) },
        (idx: number) => { if (idx >= 0 && idx < options.length) onChange(options[idx]); }
      );
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <SettingRow
        label={label}
        description={description}
        onPress={openSheet}
        showChevron
        right={<AppText variant="body" color="secondary">{display}</AppText>}
      />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.bg.card, borderColor: theme.border }]} onPress={() => {}}>
            <AppText variant="label" style={styles.title}>{tr(label)}</AppText>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const selected = opt === value;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => choose(opt)}
                    style={[styles.option, { borderBottomColor: theme.divider }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <AppText style={{ color: selected ? theme.accent.primary : theme.text.primary, fontWeight: selected ? '700' : '500' }}>
                      {tr(opt)}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, maxHeight: '70%', paddingVertical: 8 },
  title: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  option: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
