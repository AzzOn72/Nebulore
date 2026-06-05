import { useEffect } from 'react';
import { Gyroscope } from 'expo-sensors';
import { useSharedValue } from 'react-native-reanimated';

// Single app-wide gyroscope source. Multiple consumers (background parallax,
// card tilt) subscribe to ONE hardware listener and receive the latest rates
// through their own shared values, instead of each opening its own stream.
const subscribers = new Set();
let subscription = null;

function ensureListener() {
  if (subscription) return;
  Gyroscope.setUpdateInterval(50);
  subscription = Gyroscope.addListener(({ x, y }) => {
    subscribers.forEach((s) => {
      s.gyroX.value = x;
      s.gyroY.value = y;
    });
  });
}

function maybeStop() {
  if (subscribers.size === 0 && subscription) {
    subscription.remove();
    subscription = null;
  }
}

/**
 * Returns shared values { gyroX, gyroY } carrying the latest gyroscope rates.
 */
export function useGyro() {
  const gyroX = useSharedValue(0);
  const gyroY = useSharedValue(0);

  useEffect(() => {
    const entry = { gyroX, gyroY };
    subscribers.add(entry);
    ensureListener();
    return () => {
      subscribers.delete(entry);
      maybeStop();
    };
  }, [gyroX, gyroY]);

  return { gyroX, gyroY };
}

export default useGyro;
