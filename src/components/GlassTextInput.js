import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function GlassTextInput({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  maxLength,
  returnKeyType = 'default',
  onFocus,
  onBlur,
  inputRef,
  minHeight,
  onSubmitEditing,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const borderOpacity = useSharedValue(0.08);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(139, 124, 246, ${borderOpacity.value})`,
    shadowOpacity: borderOpacity.value * 0.6,
  }));

  const handleFocus = (e) => {
    setIsFocused(true);
    borderOpacity.value = withTiming(0.35, { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    borderOpacity.value = withTiming(0.08, { duration: 200 });
    onBlur?.(e);
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}

      <AnimatedView
        style={[
          styles.container,
          animatedBorderStyle,
          isFocused && styles.containerFocused,
        ]}
      >
        <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.28)"
          multiline={multiline}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          selectionColor="#8B7CF6"
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            minHeight ? { minHeight } : null,
          ]}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </AnimatedView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 10,
    marginLeft: 4,
  },
  container: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#8B7CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0,
    elevation: 0,
  },
  containerFocused: {
    elevation: 4,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputMultiline: {
    paddingTop: 16,
    paddingBottom: 16,
    minHeight: 140,
  },
});
