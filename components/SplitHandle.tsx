import { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { useTheme } from '@/lib/theme';

interface Props {
  // Container height — needed to convert pixel drag deltas to ratio (0..1)
  containerHeight: number;
  // Current ratio (0..1) of the editor pane
  ratio: number;
  onChange: (ratio: number) => void;
}

// Draggable horizontal divider for the split-screen view. Drag up/down to
// resize the editor pane vs the preview pane.
export function SplitHandle({ containerHeight, ratio, onChange }: Props) {
  const { colors } = useTheme();
  const startRatio = useRef(ratio);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startRatio.current = ratio;
        },
        onPanResponderMove: (_, gs) => {
          if (containerHeight <= 0) return;
          const delta = gs.dy / containerHeight;
          onChange(startRatio.current + delta);
        },
      }),
    [containerHeight, ratio, onChange]
  );

  return (
    <View style={[styles.wrap, { backgroundColor: colors.border }]} {...panResponder.panHandlers}>
      <View style={[styles.grip, { backgroundColor: colors.borderStrong }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});
