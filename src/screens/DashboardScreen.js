import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Flame, GitBranch, PieChart, Sparkles, Trophy } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CosmicRankBadge from '../components/CosmicRankBadge';
import StatsRing from '../components/StatsRing';
import NeuralMapCanvas from '../components/skia/NeuralMapCanvas';
import CountUp from '../components/CountUp';
import { CATEGORIES } from '../config/categories';
import { getRankForCount, useStatsStore } from '../store/useStatsStore';
import { C, fonts } from '../theme';
import { spring } from '../theme/motion';

// ─── Glass card (reused from original) ───────────────────────────────────────
function GlassCard({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cardInner}>{children}</View>
    </View>
  );
}

function MetricCard({ icon, value, label, accent }) {
  return (
    <GlassCard style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${accent}1F` }]}>
        {icon}
      </View>
      <CountUp value={value} style={styles.metricValue} />
      <Text style={styles.metricLabel}>{label}</Text>
    </GlassCard>
  );
}

// ─── Map / Chart segment toggle ───────────────────────────────────────────────
function ViewToggle({ active, onChange }) {
  const chartScale = useSharedValue(1);
  const mapScale = useSharedValue(1);

  const tap = (next, scaleRef) => {
    scaleRef.value = withSpring(0.88, spring.snappy, () => {
      scaleRef.value = withSpring(1, spring.snappy);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(next);
  };

  return (
    <View style={styles.toggleRow}>
      {[
        { key: 'chart', icon: <PieChart size={13} strokeWidth={2} />, label: 'Chart' },
        { key: 'map', icon: <GitBranch size={13} strokeWidth={2} />, label: 'Map' },
      ].map(({ key, icon, label }) => {
        const isActive = active === key;
        const scaleRef = key === 'chart' ? chartScale : mapScale;
        const animStyle = useAnimatedStyle(() => ({
          transform: [{ scale: scaleRef.value }],
        }));
        return (
          <Animated.View key={key} style={animStyle}>
            <Pressable
              onPress={() => tap(key, scaleRef)}
              style={[styles.togglePill, isActive && styles.togglePillActive]}
            >
              {/* Icon inherits color from style */}
              <View style={{ opacity: isActive ? 1 : 0.45 }}>
                {/* Clone icon with runtime color */}
                {key === 'chart' ? (
                  <PieChart
                    size={13}
                    strokeWidth={2}
                    color={isActive ? C.accentHi : C.textSecondary}
                  />
                ) : (
                  <GitBranch
                    size={13}
                    strokeWidth={2}
                    color={isActive ? C.accentHi : C.textSecondary}
                  />
                )}
              </View>
              <Text style={[styles.toggleLabel, isActive && styles.toggleLabelActive]}>
                {label}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [disciplineView, setDisciplineView] = useState('chart'); // 'chart' | 'map'

  const totalDeepDives = useStatsStore((s) => s.totalDeepDives);
  const perCategory = useStatsStore((s) => s.perCategory);
  const currentStreak = useStatsStore((s) => s.currentStreak);
  const longestStreak = useStatsStore((s) => s.longestStreak);

  const rank = useMemo(() => getRankForCount(totalDeepDives), [totalDeepDives]);

  const ringData = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        key: c.key,
        label: c.short,
        value: perCategory[c.key] || 0,
        color: c.accent,
      })),
    [perCategory],
  );

  const topCategoryTotal = useMemo(
    () => ringData.reduce((s, d) => s + d.value, 0),
    [ringData],
  );

  const progress = useMemo(() => {
    if (!rank.next) return 1;
    const span = rank.next.threshold - rank.current.threshold;
    if (span <= 0) return 1;
    return Math.min(
      Math.max((totalDeepDives - rank.current.threshold) / span, 0),
      1,
    );
  }, [rank, totalDeepDives]);

  return (
    <View className="flex-1 bg-void">
      {/* True-black OLED gradient */}
      <LinearGradient
        colors={['#0A0A1F', '#0B0716', '#000000']}
        locations={[0, 0.4, 1]}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 130,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>Cognitive Dashboard</Text>
          <Text style={styles.heading}>Your Mind, Quantified</Text>
        </View>

        {/* ── Cosmic Rank ─────────────────────────────────────────────── */}
        <GlassCard style={{ marginBottom: 16 }}>
          <View style={styles.rankBlock}>
            <View style={styles.rankLabelRow}>
              <Sparkles size={13} color={rank.current.color} strokeWidth={2} />
              <Text style={[styles.rankEyebrow, { color: rank.current.color }]}>
                Cosmic Rank
              </Text>
            </View>

            <CosmicRankBadge label={rank.current.label} color={rank.current.color} />

            <View style={styles.totalBlock}>
              <CountUp value={totalDeepDives} style={styles.totalValue} />
              <Text style={styles.totalLabel}>Deep Dives Logged</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progress * 100)}%`,
                    backgroundColor: rank.current.color,
                    shadowColor: rank.current.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {rank.next
                ? `${rank.next.threshold - totalDeepDives} more to ${rank.next.label}`
                : 'Maximum rank achieved'}
            </Text>
          </View>
        </GlassCard>

        {/* ── Streaks ──────────────────────────────────────────────────── */}
        <View style={styles.metricRow}>
          <MetricCard
            icon={<Flame size={20} color="#FB923C" strokeWidth={2} />}
            value={currentStreak}
            label={`Day Streak${currentStreak === 1 ? '' : 's'}`}
            accent="#FB923C"
          />
          <MetricCard
            icon={<Trophy size={20} color="#FBBF24" strokeWidth={2} />}
            value={longestStreak}
            label="Best Streak"
            accent="#FBBF24"
          />
        </View>

        {/* ── Discipline Breakdown — Chart or Neural Map ──────────────── */}
        <GlassCard style={{ marginTop: 16 }}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Discipline Breakdown</Text>
              <Text style={styles.sectionSub}>
                {disciplineView === 'map'
                  ? 'Your constellation of explored knowledge'
                  : 'Total knowledge absorbed across the cosmos'}
              </Text>
            </View>
            <ViewToggle active={disciplineView} onChange={setDisciplineView} />
          </View>

          {disciplineView === 'chart' ? (
            <Animated.View
              key="chart"
              entering={FadeIn.duration(280)}
              exiting={FadeOut.duration(200)}
            >
              <View style={styles.ringWrap}>
                <StatsRing data={ringData} size={196} strokeWidth={22} />
              </View>

              <View style={styles.legend}>
                {ringData.map((d) => {
                  const pct =
                    topCategoryTotal > 0
                      ? Math.round((d.value / topCategoryTotal) * 100)
                      : 0;
                  return (
                    <View key={d.key} style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                        <Text style={styles.legendLabel}>{d.label}</Text>
                      </View>
                      <Text style={styles.legendValue}>
                        {d.value}
                        <Text style={styles.legendPct}>  ·  {pct}%</Text>
                      </Text>
                    </View>
                  );
                })}
              </View>

              {topCategoryTotal === 0 && (
                <Text style={styles.emptyHint}>
                  Open a Deep Dive to begin charting your disciplines.
                </Text>
              )}
            </Animated.View>
          ) : (
            <Animated.View
              key="map"
              entering={FadeIn.duration(340)}
              exiting={FadeOut.duration(200)}
              style={styles.mapWrap}
            >
              <NeuralMapCanvas
                categories={CATEGORIES}
                perCategory={perCategory}
              />
              {topCategoryTotal === 0 && (
                <Text style={[styles.emptyHint, { marginTop: 8 }]}>
                  Explore categories to light up your constellation.
                </Text>
              )}
            </Animated.View>
          )}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  eyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: 'rgba(196,181,253,0.7)',
    marginBottom: 6,
  },
  heading: {
    fontFamily: fonts.serifSemibold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.3,
    color: C.textPrimary,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardInner: {
    padding: 22,
  },
  rankBlock: {
    alignItems: 'center',
  },
  rankLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  rankEyebrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  totalBlock: {
    alignItems: 'center',
    marginTop: 18,
  },
  totalValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 44,
    letterSpacing: -1,
    color: C.textPrimary,
  },
  totalLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.textTertiary,
    marginTop: 2,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  progressText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 10,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 14,
  },
  metricCard: {
    flex: 1,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  metricValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  metricLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  sectionSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
    maxWidth: 180,
  },
  // ── Toggle ──────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  togglePillActive: {
    borderColor: 'rgba(196,181,253,0.35)',
    backgroundColor: 'rgba(139,124,246,0.14)',
  },
  toggleLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: C.textSecondary,
    letterSpacing: 0.2,
  },
  toggleLabelActive: {
    color: C.accentHi,
  },
  // ── Chart view ───────────────────────────────────────────────────────
  ringWrap: {
    alignItems: 'center',
    marginVertical: 22,
  },
  legend: {
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  legendValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  legendPct: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  // ── Map view ─────────────────────────────────────────────────────────
  mapWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 16,
  },
});
