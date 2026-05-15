import { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { useTheme } from '@/lib/theme';

interface Props {
  contentHeight: number;
  viewportHeight: number;
  scrollY: number;
  onScrollToY: (y: number) => void;
}

// Always-visible, draggable scroll indicator. Tap or drag the right edge to
// scrub through content. The track is wider than it looks (24px hit area, 4px
// visible) so it's easy to grab with a thumb.
export function ScrollIndicator({
  contentHeight,
  viewportHeight,
  scrollY,
  onScrollToY,
}: Props) {
  const { theme } = useTheme();
  const isScrollable = viewportHeight > 0 && contentHeight > viewportHeight + 1;

  const ratio = isScrollable ? viewportHeight / contentHeight : 1;
  const thumbHeight = isScrollable ? Math.max(36, viewportHeight * ratio) : 0;
  const maxScrollY = isScrollable ? contentHeight - viewportHeight : 1;
  const progress = isScrollable ? Math.max(0, Math.min(1, scrollY / maxScrollY)) : 0;
  const thumbY = isScrollable ? progress * (viewportHeight - thumbHeight) : 0;

  const dragRef = useRef({ startY: 0, startScrollY: 0 });

  const yToScroll = (y: number) => {
    if (!isScrollable) return;
    const clamped = Math.max(thumbHeight / 2, Math.min(viewportHeight - thumbHeight / 2, y));
    const r = (clamped - thumbHeight / 2) / Math.max(1, viewportHeight - thumbHeight);
    onScrollToY(r * maxScrollY);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isScrollable,
        onMoveShouldSetPanResponder: () => isScrollable,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          dragRef.current.startY = evt.nativeEvent.locationY;
          dragRef.current.startScrollY = scrollY;
          // Tap-to-jump: scroll so the thumb center lands on the touch point
          yToScroll(evt.nativeEvent.locationY);
        },
        onPanResponderMove: (evt) => {
          // Use absolute touch position within the track, not relative drag —
          // simpler and matches expected scrollbar behavior.
          yToScroll(evt.nativeEvent.locationY);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isScrollable, viewportHeight, contentHeight, thumbHeight, maxScrollY]
  );

  if (!isScrollable) return null;

  const thumbColor =
    theme === 'dark' ? 'rgba(148, 163, 184, 0.45)' : 'rgba(71, 85, 105, 0.4)';
  const trackColor =
    theme === 'dark' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(71, 85, 105, 0.06)';

  return (
    <View style={styles.hitArea} {...panResponder.panHandlers}>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.thumb,
            { top: thumbY, height: thumbHeight, backgroundColor: thumbColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 20, // generous touch target
    alignItems: 'flex-end',
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: 4,
  },
  track: {
    width: 4,
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 4,
    borderRadius: 2,
  },
});
