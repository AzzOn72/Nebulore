import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

// Animated integer count-up. Eases to `value` over `duration` using an
// ease-out curve. Always renders tabular figures so digits never jitter.
export default function CountUp({ value = 0, duration = 900, style }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const start = Date.now();

    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>{display}</Text>
  );
}
