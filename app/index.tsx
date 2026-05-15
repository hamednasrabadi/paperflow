import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Editor } from '@/components/Editor';
import { Preview } from '@/components/Preview';
import { SplitHandle } from '@/components/SplitHandle';
import { TabSwitcher } from '@/components/TabSwitcher';
import { Toolbar } from '@/components/Toolbar';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function Home() {
  const { colors } = useTheme();
  const markdown = useStore((s) => s.markdown);
  const setMarkdown = useStore((s) => s.setMarkdown);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const split = useStore((s) => s.livePreviewSplit);
  const splitRatio = useStore((s) => s.splitRatio);
  const setSplitRatio = useStore((s) => s.setSplitRatio);

  const [bodyH, setBodyH] = useState(0);

  // Always-mount both panes — keeps WebView state, lets TOC scroll either side,
  // and is required for editor↔preview scroll-sync to work in tabbed mode.
  const showEditor = split || view === 'edit';
  const showPreview = split || view === 'preview';

  // Calculate flex for split mode using the persisted ratio
  const editorFlex = split ? splitRatio : showEditor ? 1 : 0;
  const previewFlex = split ? 1 - splitRatio : showPreview ? 1 : 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Toolbar />

        {!split && (
          <View style={[styles.tabs, { backgroundColor: colors.bg }]}>
            <TabSwitcher value={view} onChange={setView} />
          </View>
        )}

        <View
          style={[styles.body, { backgroundColor: colors.bg }]}
          onLayout={(e) => setBodyH(e.nativeEvent.layout.height)}>
          <View style={[styles.pane, { flex: editorFlex, display: showEditor ? 'flex' : 'none' }]}>
            <Editor value={markdown} onChange={setMarkdown} />
          </View>

          {split && (
            <SplitHandle containerHeight={bodyH} ratio={splitRatio} onChange={setSplitRatio} />
          )}

          <View style={[styles.pane, { flex: previewFlex, display: showPreview ? 'flex' : 'none' }]}>
            <Preview markdown={markdown} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  tabs: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  body: { flex: 1, flexDirection: 'column' },
  pane: { overflow: 'hidden' },
});
