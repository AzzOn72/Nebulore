import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import FeedScreen from '../screens/FeedScreen';
import RequestScreen from '../screens/RequestScreen';
import SavedScreen from '../screens/SavedScreen';
import FloatingGlassTabBar from './FloatingGlassTabBar';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#050505',
    card: '#050505',
    border: 'transparent',
    text: '#FFFFFF',
    primary: '#8B7CF6',
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        tabBar={(props) => <FloatingGlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          sceneStyle: { backgroundColor: '#050505' },
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
          },
        }}
      >
        <Tab.Screen name="Discover" component={FeedScreen} />
        <Tab.Screen name="Saved" component={SavedScreen} />
        <Tab.Screen name="Request" component={RequestScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
