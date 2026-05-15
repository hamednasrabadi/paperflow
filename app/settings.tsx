import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStore } from '@/lib/store';
import { useTheme, type ThemePref } from '@/lib/theme';

export default function Settings() {
  const { colors } = useTheme();
  const split = useStore((s) => s.livePreviewSplit);
  const setSplit = useStore((s) => s.setLivePreviewSplit);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Section title="Appearance" colors={colors}>
          <Row
            label="Theme"
            colors={colors}
            control={
              <View style={styles.segmented}>
                {(['light', 'dark', 'system'] as ThemePref[]).map((t) => {
                  const active = theme === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setTheme(t)}
                      style={[
                        styles.segment,
                        {
                          backgroundColor: active ? colors.accent : colors.surfaceAlt,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.segmentLabel,
                          { color: active ? colors.accentText : colors.textMuted },
                        ]}>
                        {t === 'system' ? 'Auto' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            }
          />
        </Section>

        <Section title="Preview" colors={colors}>
          <Row
            label="Live preview (split screen)"
            hint="Show editor and preview side-by-side instead of switching tabs."
            colors={colors}
            control={<Switch value={split} onValueChange={setSplit} />}
          />
        </Section>

        <Section title="About" colors={colors}>
          <Text style={[styles.aboutText, { color: colors.textMuted }]}>
            Paperflow — markdown editor with live preview and PDF export.
            Supports Persian and English with proper RTL/LTR math handling.
          </Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.sectionBody, { backgroundColor: colors.bg }]}>{children}</View>
    </View>
  );
}

function Row({
  label,
  hint,
  control,
  colors,
}: {
  label: string;
  hint?: string;
  control: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {hint && <Text style={[styles.rowHint, { color: colors.textMuted }]}>{hint}</Text>}
      </View>
      <View style={styles.rowControl}>{control}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 24, flexGrow: 1 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  sectionBody: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowText: { flex: 1, gap: 4 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowHint: { fontSize: 12, lineHeight: 17 },
  rowControl: { alignItems: 'flex-end' },
  aboutText: { padding: 16, fontSize: 13, lineHeight: 20 },
  segmented: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
