import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Bookmark, ChevronLeft, Headphones, Share2, Square } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFactStore } from '../store/useFactStore';
import { useNeuralSync } from '../hooks/useNeuralSync';
import { formatShareMessage } from '../utils/formatShareMessage';

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

export default function DeepDiveModal({ visible, fact, onClose }) {
  const insets = useSafeAreaInsets();

  const isSaved = useFactStore((state) => (fact ? state.isSaved(fact.id) : false));
  const toggleSave = useFactStore((state) => state.toggleSave);
  const markSeen = useFactStore((state) => state.markSeen);

  const neural = useNeuralSync(fact?.body ?? '');

  const handleClose = () => {
    if (fact) {
      markSeen(fact.id);
    }
    neural.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleListen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      // User cancelled
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
        entering={ZoomIn.springify().damping(20).stiffness(160)}
        exiting={FadeOut.duration(200).withInitialValues({ opacity: 1 })}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <LinearGradient
          colors={['#0A0A0A', '#050505', '#050505']}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <ChevronLeft size={22} color="#E5E5E5" strokeWidth={2} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>

          <Pressable onPress={handleShare} hitSlop={12} style={styles.iconButton}>
            <Share2 size={20} color="rgba(229,229,229,0.6)" strokeWidth={1.75} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
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
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <LinearGradient
            colors={['transparent', 'rgba(5,5,5,0.95)', '#050505']}
            style={styles.footerGradient}
            pointerEvents="none"
          />

          <View style={styles.actionRow}>
            <Pressable
              onPress={handleListen}
              accessibilityRole="button"
              accessibilityLabel={neural.isPlaying ? 'Stop narration' : 'Listen to article'}
              style={[styles.listenButton, neural.isPlaying && styles.listenButtonActive]}
            >
              {neural.isPlaying ? (
                <Square size={18} color="#C4B5FD" fill="#C4B5FD" strokeWidth={1.75} />
              ) : (
                <Headphones size={20} color="#E5E5E5" strokeWidth={1.75} />
              )}
              <Text
                style={[styles.listenLabel, neural.isPlaying && styles.listenLabelActive]}
              >
                {neural.isPlaying ? 'Stop' : 'Listen'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={[styles.saveButton, isSaved && styles.saveButtonActive]}
            >
              <Bookmark
                size={20}
                color={isSaved ? '#C4B5FD' : '#E5E5E5'}
                fill={isSaved ? '#C4B5FD' : 'transparent'}
                strokeWidth={1.75}
              />
              <Text style={[styles.saveLabel, isSaved && styles.saveLabelActive]}>
                {isSaved ? 'Saved' : 'Save to Library'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    color: '#E5E5E5',
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 8,
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
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: 'rgba(229,229,229,0.4)',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: '#E5E5E5',
    marginBottom: 28,
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(229,229,229,0.15)',
    marginBottom: 32,
  },
  paragraph: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    lineHeight: 27.2,
    color: '#E5E5E5',
    letterSpacing: 0.2,
  },
  paragraphSpaced: {
    marginBottom: 24,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  footerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -40,
    height: 40,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(229,229,229,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  listenButtonActive: {
    borderColor: 'rgba(139,124,246,0.4)',
    backgroundColor: 'rgba(139,124,246,0.12)',
  },
  listenLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#E5E5E5',
    letterSpacing: 0.3,
  },
  listenLabelActive: {
    color: '#C4B5FD',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(229,229,229,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  saveButtonActive: {
    borderColor: 'rgba(139,124,246,0.4)',
    backgroundColor: 'rgba(139,124,246,0.12)',
  },
  saveLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#E5E5E5',
    letterSpacing: 0.3,
  },
  saveLabelActive: {
    color: '#C4B5FD',
  },
});
