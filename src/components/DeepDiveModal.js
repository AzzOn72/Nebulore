import { useState } from 'react';
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Bookmark, ChevronLeft, Share2 } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  ZoomIn,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NeuralSyncPlayer from './NeuralSyncPlayer';
import PressableScale from './PressableScale';
import { useFactStore } from '../store/useFactStore';
import { useNeuralSync } from '../hooks/useNeuralSync';
import { formatShareMessage } from '../utils/formatShareMessage';
import { C, type as T, radii, space } from '../theme';
import { spring } from '../theme/motion';

const AnimatedScrollView = Animated.ScrollView;

// ─── Paragraph renderer ──────────────────────────────────────────────────────
function Paragraphs({ text }) {
  const blocks = text.split(/\n\n+/).filter(Boolean);
  if (blocks.length <= 1) {
    return <Text style={styles.paragraph}>{text}</Text>;
  }
  return blocks.map((block, index) => (
    <Text
      key={index}
      style={[styles.paragraph, index < blocks.length - 1 && styles.paragraphSpaced]}
    >
      {block.trim()}
    </Text>
  ));
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DeepDiveModal({ visible, fact, onClose }) {
  const insets = useSafeAreaInsets();

  const isSaved = useFactStore((state) => (fact ? state.isSaved(fact.id) : false));
  const toggleSave = useFactStore((state) => state.toggleSave);
  const markSeen = useFactStore((state) => state.markSeen);

  const neural = useNeuralSync(fact?.body ?? '');

  const scrollY = useSharedValue(0);
  const [scrollSpan, setScrollSpan] = useState(1);

  // The floating dock measures its own height so paddingBottom is always exact.
  const footerH = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const progressStyle = useAnimatedStyle(() => {
    const p = Math.min(Math.max(scrollY.value / scrollSpan, 0), 1);
    return { height: `${p * 100}%` };
  });

  // Drive paddingBottom from the measured footer height — no magic numbers.
  const scrollPadStyle = useAnimatedStyle(() => ({
    paddingBottom: footerH.value + insets.bottom + 24,
  }));

  const handleClose = () => {
    if (fact) markSeen(fact.id);
    neural.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleListen = () => {
    Haptics.impactAsync(
      neural.isPlaying
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    );
    neural.toggle();
  };

  const handleSave = () => {
    if (!fact) return;
    const nowSaved = toggleSave(fact);
    if (nowSaved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleShare = async () => {
    if (!fact) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: formatShareMessage(fact) });
    } catch (_) {
      // user cancelled
    }
  };

  if (!fact) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View
        entering={ZoomIn.springify()
          .damping(spring.heavy.damping)
          .stiffness(spring.heavy.stiffness)
          .mass(spring.heavy.mass)}
        exiting={FadeOut.duration(220).withInitialValues({ opacity: 1 })}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        {/* Full-bleed OLED true-black canvas */}
        <LinearGradient
          colors={[`${fact.glow}14`, '#050505', '#000000']}
          locations={[0, 0.32, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* ── Header ────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <ChevronLeft size={22} color={C.textPrimary} strokeWidth={2} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>

          <PressableScale onPress={handleShare} hitSlop={12} style={styles.iconButton}>
            <Share2 size={20} color={C.textSecondary} strokeWidth={1.75} />
          </PressableScale>
        </View>

        {/* ── Reading-progress ray ───────────────────────────────────── */}
        <View style={[styles.progressTrack, { top: insets.top + 70 }]}>
          <Animated.View
            style={[styles.progressFill, { backgroundColor: fact.glow }, progressStyle]}
          />
        </View>

        {/* ── Scrollable reading area — padded by measured dock height ── */}
        <AnimatedScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, scrollPadStyle]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onContentSizeChange={(_, h) => {
            setScrollSpan(Math.max(h - 600, 1));
          }}
        >
          <Animated.View entering={FadeIn.duration(500).delay(120)}>
            <View style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: fact.glow }]} />
              <Text style={styles.category}>{fact.category}</Text>
            </View>

            <Text style={styles.title}>{fact.title}</Text>

            <View style={styles.divider} />

            <Paragraphs text={fact.body} />
          </Animated.View>
        </AnimatedScrollView>

        {/* ── Floating glass dock — self-measures its height ─────────── */}
        <Animated.View
          entering={SlideInDown.springify()
            .damping(spring.heavy.damping)
            .stiffness(spring.heavy.stiffness)
            .mass(spring.heavy.mass)
            .delay(180)}
          style={[styles.dock, { paddingBottom: insets.bottom + 16 }]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            footerH.value = withSpring(h, spring.snappy);
          }}
        >
          {/* Top-edge luminous scrim — prevents text bleeding through glass */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.72)', '#000000']}
            style={styles.dockScrim}
            pointerEvents="none"
          />

          {/* Glass substrate */}
          <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(255,255,255,0.055)', 'rgba(255,255,255,0.015)']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Top hairline — edge-lit glass border */}
          <View style={styles.dockBorder} />

          <View style={styles.dockContent}>
            <NeuralSyncPlayer
              isPlaying={neural.isPlaying}
              onToggle={handleListen}
              speed={neural.speed}
              onCycleSpeed={neural.cycleSpeed}
              glowColor={fact.glow}
            />

            <PressableScale
              onPress={handleSave}
              style={[styles.saveButton, isSaved && styles.saveButtonActive]}
            >
              <Bookmark
                size={19}
                color={isSaved ? C.accentHi : C.textPrimary}
                fill={isSaved ? C.accentHi : 'transparent'}
                strokeWidth={1.75}
              />
              <Text style={[styles.saveLabel, isSaved && styles.saveLabelActive]}>
                {isSaved ? 'Saved to Library' : 'Save to Library'}
              </Text>
            </PressableScale>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[5],
    paddingVertical: space[3],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingRight: 12,
  },
  backLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: C.textPrimary,
    letterSpacing: 0.3,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  progressTrack: {
    position: 'absolute',
    right: 10,
    bottom: 220,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    width: 2,
    borderRadius: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space[6],
    paddingTop: 8,
    // paddingBottom driven by scrollPadStyle (Animated) — no static value here
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  category: {
    ...T.eyebrow,
    color: C.textTertiary,
  },
  title: {
    ...T.h1,
    fontSize: 34,
    lineHeight: 42,
    color: C.textPrimary,
    marginBottom: 28,
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: C.hairlineLum,
    marginBottom: 32,
  },
  paragraph: {
    ...T.readBody,
    color: C.textPrimary,
  },
  paragraphSpaced: {
    marginBottom: 20,
  },
  // ── Floating dock ─────────────────────────────────────────────────
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  dockScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -64,
    height: 64,
  },
  dockBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dockContent: {
    paddingHorizontal: space[6],
    paddingTop: space[4],
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: C.hairlineLum,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  saveButtonActive: {
    borderColor: 'rgba(196,181,253,0.45)',
    backgroundColor: 'rgba(139,124,246,0.14)',
  },
  saveLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: C.textPrimary,
    letterSpacing: 0.3,
  },
  saveLabelActive: {
    color: C.accentHi,
  },
});
