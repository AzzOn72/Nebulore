import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Check, Sparkles } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CosmosSubmitButton from '../components/CosmosSubmitButton';
import GlassTextInput from '../components/GlassTextInput';
import { useToast } from '../context/ToastContext';
import { useTheoryStore } from '../store/useTheoryStore';
import { fonts } from '../theme';

const TITLE_MAX = 80;
const DESC_MAX = 500;
const DESC_MIN = 10;

export default function RequestScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const descriptionRef = useRef(null);
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitState, setSubmitState] = useState('idle');

  const submitTheory = useTheoryStore((state) => state.submitTheory);

  const isValid =
    title.trim().length > 0 && description.trim().length >= DESC_MIN;
  const isSubmitting = submitState === 'submitting';
  const isSuccess = submitState === 'success';

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setSubmitState('submitting');

    try {
      await submitTheory(title, description);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Keyboard.dismiss();
      setSubmitState('success');

      setTimeout(() => {
        setTitle('');
        setDescription('');
        setSubmitState('idle');
      }, 2500);
    } catch (_) {
      setSubmitState('idle');
      showToast('Signal lost. Try again.');
    }
  };

  const handleTitleSubmit = () => {
    descriptionRef.current?.focus();
  };

  const scrollToDescription = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 200, animated: true });
    }, 100);
  };

  return (
    <View className="flex-1 bg-void">
      <LinearGradient
        colors={['#1A1035', '#0F0A1A', '#050505']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.nebulaOrb,
          {
            top: insets.top + 40,
            right: -60,
          },
        ]}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 20,
                paddingBottom: insets.bottom + 120,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Sparkles size={22} color="#C4B5FD" strokeWidth={1.75} />
              </View>
              <Text style={styles.headerTitle}>Request</Text>
              <Text style={styles.headerSubtitle}>
                Submit a theory to the cosmos
              </Text>
            </View>

            {isSuccess ? (
              <Animated.View
                entering={FadeIn.duration(400)}
                style={styles.successPanel}
              >
                <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['rgba(139,124,246,0.2)', 'rgba(255,255,255,0.04)']}
                  style={StyleSheet.absoluteFill}
                />
                <Animated.View
                  entering={ZoomIn.springify().damping(14)}
                  style={styles.checkCircle}
                >
                  <Check size={32} color="#C4B5FD" strokeWidth={2.5} />
                </Animated.View>
                <Text style={styles.successTitle}>
                  Transmission sent to the void
                </Text>
                <Text style={styles.successSubtitle}>
                  Your theory has been received by the cosmos
                </Text>
              </Animated.View>
            ) : (
              <Animated.View exiting={FadeOut.duration(300)}>
                <GlassTextInput
                  label="Theory Title"
                  placeholder="Name your cosmic revelation..."
                  value={title}
                  onChangeText={setTitle}
                  maxLength={TITLE_MAX}
                  returnKeyType="next"
                  onSubmitEditing={handleTitleSubmit}
                />

                <GlassTextInput
                  label="Description"
                  placeholder="Describe the mind-bending theory in detail..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={DESC_MAX}
                  minHeight={140}
                  inputRef={descriptionRef}
                  onFocus={scrollToDescription}
                />

                <Text style={styles.charCount}>
                  {description.length}/{DESC_MAX}
                  {description.length > 0 && description.length < DESC_MIN
                    ? `  ·  ${DESC_MIN - description.length} more characters needed`
                    : ''}
                </Text>

                {isSubmitting ? (
                  <View style={styles.submittingWrap}>
                    <ActivityIndicator size="small" color="#8B7CF6" />
                    <Text style={styles.submittingText}>Transmitting...</Text>
                  </View>
                ) : (
                  <CosmosSubmitButton
                    onPress={handleSubmit}
                    disabled={!isValid}
                  />
                )}
              </Animated.View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  nebulaOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#6B4C9A',
    opacity: 0.15,
  },
  header: {
    marginBottom: 32,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: fonts.serifSemibold,
    fontSize: 36,
    lineHeight: 42,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 22,
  },
  successPanel: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,124,246,0.35)',
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 24,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(139,124,246,0.5)',
    backgroundColor: 'rgba(139,124,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#8B7CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  successTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 20,
  },
  charCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 28,
  },
  submittingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  submittingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
});
