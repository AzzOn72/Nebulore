import './global.css';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import NebuloreSplash from './src/components/NebuloreSplash';
import { ToastProvider } from './src/context/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useFactStore } from './src/store/useFactStore';
import { useFactsStore } from './src/store/useFactsStore';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const hasHydrated = useFactStore((state) => state._hasHydrated);
  const initialized = useFactsStore((state) => state.initialized);
  const fetchFacts = useFactsStore((state) => state.fetchFacts);

  useEffect(() => {
    if (!hasHydrated) return;
    fetchFacts().catch(() => {});
  }, [hasHydrated, fetchFacts]);

  const appReady = fontsLoaded && hasHydrated && initialized;

  useEffect(() => {
    if (!appReady) return;

    const prepare = async () => {
      await SplashScreen.hideAsync();
      setShowSplash(false);
    };

    prepare();
  }, [appReady]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="light" />
          {appReady && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.root}>
              <AppNavigator />
            </Animated.View>
          )}
          {showSplash && <NebuloreSplash visible />}
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050505',
  },
});
