import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SavedFactItem from '../components/SavedFactItem';
import { useFactStore } from '../store/useFactStore';

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-10">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Bookmark size={32} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      </View>
      <Text className="mb-2 text-center font-inter-semibold text-xl text-white/80">
        No saved facts yet
      </Text>
      <Text className="text-center font-inter text-sm leading-6 text-white/40">
        Swipe through Discover and tap Save on any cosmic revelation worth
        revisiting.
      </Text>
    </View>
  );
}

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const savedFacts = useFactStore((state) => state.savedFacts);

  return (
    <View className="flex-1 bg-void">
      <LinearGradient
        colors={['#1A0A2E', '#0F0A1A', '#050505']}
        locations={[0, 0.4, 1]}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      <View
        className="flex-1"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 110,
        }}
      >
        <View className="mb-6 px-6">
          <Text className="font-inter-bold text-3xl text-white">Saved</Text>
          <Text className="mt-1 font-inter text-sm text-white/45">
            {savedFacts.length === 0
              ? 'Your cosmic library awaits'
              : `${savedFacts.length} revelation${savedFacts.length === 1 ? '' : 's'} archived`}
          </Text>
        </View>

        {savedFacts.length === 0 ? (
          <EmptyState />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {savedFacts.map((fact, index) => (
              <SavedFactItem key={fact.id} fact={fact} index={index} />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
