import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { File } from 'expo-file-system';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function RootLayout() {
  const { theme, colors } = useTheme();
  const setMarkdown = useStore((s) => s.setMarkdown);

  // Handle .md files opened via system "Open with…" / share intent.
  useEffect(() => {
    const openFromUrl = async (url: string | null | undefined) => {
      if (!url) return;
      try {
        const file = new File(url);
        const content = await file.text();
        setMarkdown(content);
      } catch (err) {
        console.warn('[Open file]', err);
      }
    };

    Linking.getInitialURL().then(openFromUrl);
    const sub = Linking.addEventListener('url', ({ url }) => openFromUrl(url));
    return () => sub.remove();
  }, [setMarkdown]);

  const headerStyle = { backgroundColor: colors.surface };
  const headerTintColor = colors.text;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Settings',
            headerStyle,
            headerTintColor,
            headerTitleStyle: { color: colors.text },
          }}
        />
        <Stack.Screen
          name="toc"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Outline',
            headerStyle,
            headerTintColor,
            headerTitleStyle: { color: colors.text },
          }}
        />
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}
