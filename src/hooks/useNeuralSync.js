import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

const AMBIENT_SOURCE = require('../../assets/audio/ambient-drone.mp3');
const AMBIENT_VOLUME = 0.15;
const FADE_STEP_MS = 40;
const FADE_STEP = 0.02;

// Resolved once and memoized across Deep Dives.
let cachedVoiceId;

async function pickBestEnglishVoice() {
  if (cachedVoiceId !== undefined) return cachedVoiceId;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const english = voices.filter((v) =>
      (v.language || '').toLowerCase().startsWith('en'),
    );
    const isUs = (v) => (v.language || '').toLowerCase().startsWith('en-us');
    const isEnhanced = (v) => v.quality === 'Enhanced' || v.quality === 'enhanced';

    const best =
      english.find((v) => isEnhanced(v) && isUs(v)) ||
      english.find((v) => isEnhanced(v)) ||
      english.find(isUs) ||
      english[0];

    cachedVoiceId = best ? best.identifier : null;
  } catch (_) {
    cachedVoiceId = null;
  }
  return cachedVoiceId;
}

/**
 * "Neural Sync" — reads `text` with the highest-quality native English voice
 * while a subtle looping ambient drone plays underneath at 15% volume. The
 * ambient track fades out smoothly when narration ends or is stopped.
 */
const SPEEDS = [1, 1.25, 1.5, 0.75];

export function useNeuralSync(text) {
  const player = useAudioPlayer(AMBIENT_SOURCE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const fadeRef = useRef(null);
  const speedRef = useRef(1);

  const clearFade = useCallback(() => {
    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  const fadeOutAmbient = useCallback(() => {
    clearFade();
    let volume = player?.volume ?? AMBIENT_VOLUME;
    fadeRef.current = setInterval(() => {
      volume -= FADE_STEP;
      try {
        if (volume <= 0) {
          player.volume = 0;
          player.pause();
          clearFade();
        } else {
          player.volume = volume;
        }
      } catch (_) {
        clearFade();
      }
    }, FADE_STEP_MS);
  }, [player, clearFade]);

  const stop = useCallback(() => {
    Speech.stop();
    setIsPlaying(false);
    fadeOutAmbient();
  }, [fadeOutAmbient]);

  const start = useCallback(async () => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
    } catch (_) {
      // best-effort; non-fatal
    }

    clearFade();
    try {
      player.loop = true;
      player.volume = AMBIENT_VOLUME;
      player.seekTo(0);
      player.play();
    } catch (_) {
      // ambient is non-essential; narration still proceeds
    }

    const voiceId = await pickBestEnglishVoice();
    setIsPlaying(true);
    const baseRate = Platform.OS === 'ios' ? 0.48 : 0.96;
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      voice: voiceId || undefined,
      pitch: 1.02,
      rate: baseRate * speedRef.current,
      onDone: () => stop(),
      onError: () => stop(),
    });
  }, [player, text, stop, clearFade]);

  const toggle = useCallback(() => {
    if (isPlaying) stop();
    else start();
  }, [isPlaying, start, stop]);

  const cycleSpeed = useCallback(() => {
    const nextIndex = (speedIndex + 1) % SPEEDS.length;
    speedRef.current = SPEEDS[nextIndex];
    setSpeedIndex(nextIndex);
    // If currently narrating, restart at the new rate.
    if (isPlaying) {
      Speech.stop();
      start();
    }
  }, [speedIndex, isPlaying, start]);

  useEffect(
    () => () => {
      Speech.stop();
      clearFade();
      try {
        player.pause();
      } catch (_) {
        // ignore
      }
    },
    [player, clearFade],
  );

  return { isPlaying, toggle, stop, speed: SPEEDS[speedIndex], cycleSpeed };
}
