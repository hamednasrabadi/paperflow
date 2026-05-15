import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ViewMode } from '@/lib/store';
import { useTheme } from '@/lib/theme';

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

export function TabSwitcher({ value, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt }]}>
      <Tab label="Edit" active={value === 'edit'} onPress={() => onChange('edit')} />
      <Tab label="Preview" active={value === 'preview'} onPress={() => onChange('preview')} />
    </View>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[
        styles.tab,
        active && { backgroundColor: colors.bg },
      ]}
      onPress={onPress}>
      <Text
        style={[
          styles.tabLabel,
          { color: active ? colors.text : colors.textMuted },
          active && styles.tabLabelActive,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 7,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
});
