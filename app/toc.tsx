import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function TOC() {
  const { colors } = useTheme();
  const headings = useStore((s) => s.headings);
  const setScrollToHeadingId = useStore((s) => s.setScrollToHeadingId);
  const setScrollToHeadingOffset = useStore((s) => s.setScrollToHeadingOffset);

  // Don't change view tab — let the heading land in whichever pane the user
  // is currently looking at (edit, preview, or both in split mode).
  const onPick = (id: string, offset: number) => {
    setScrollToHeadingId(id);
    setScrollToHeadingOffset(offset);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]} edges={['bottom']}>
      {headings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No headings yet. Add `# Heading` lines to your markdown.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {headings.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => onPick(h.id, h.sourceOffset)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? colors.surfaceAlt : colors.bg,
                  borderBottomColor: colors.border,
                  paddingInlineStart: 16 + (h.level - 1) * 16,
                },
              ]}>
              <Text
                style={[
                  styles.rowText,
                  {
                    color: colors.text,
                    fontWeight: h.level === 1 ? '700' : h.level === 2 ? '600' : '500',
                    fontSize: h.level === 1 ? 16 : h.level === 2 ? 14 : 13,
                  },
                ]}
                numberOfLines={2}>
                {h.text}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingVertical: 8 },
  row: {
    paddingVertical: 12,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { lineHeight: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
});
