import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { type ColorValue, useColorScheme, View } from 'react-native';

// Tabs with a nested Stack (settings, transactions) otherwise keep whatever
// screen was last pushed — e.g. leave an account's edit screen on top after
// switching away and back. Popping to the tab's root screen on every
// tabPress (not just re-taps of the already-focused tab) clears that state.
function resetNestedStackOnTabPress(navigation: any, routeName: string) {
  return {
    tabPress: () => {
      const tabRoute = navigation.getState().routes.find((r: any) => r.name === routeName);
      const nestedState = tabRoute?.state;
      if (nestedState && nestedState.index > 0) {
        navigation.dispatch({ type: 'POP_TO_TOP', target: nestedState.key });
      }
    },
  };
}

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  focused: boolean;
}) {
  return (
    <View className="items-center gap-1">
      <Ionicons name={name} color={color} size={24} />
      <View
        className="h-[3px] w-5 rounded-full"
        style={{ backgroundColor: focused ? '#B9F227' : 'transparent' }}
      />
    </View>
  );
}

export default function AppLayout() {
  const dark = useColorScheme() === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: dark ? '#F2F3F5' : '#1A1D21',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          backgroundColor: dark ? '#16191D' : '#FFFFFF',
          borderTopColor: dark ? '#23272C' : '#EDEFF2',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        listeners={({ navigation, route }) => resetNestedStackOnTabPress(navigation, route.name)}
        options={{
          title: 'Movimientos',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="swap-horizontal-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        listeners={({ navigation, route }) => resetNestedStackOnTabPress(navigation, route.name)}
        options={{
          title: 'Opciones',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="document-text-outline" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
