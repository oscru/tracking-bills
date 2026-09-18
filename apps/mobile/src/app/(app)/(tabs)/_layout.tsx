import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { type ColorValue, useColorScheme, View } from 'react-native';

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
        options={{
          title: 'Movimientos',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="swap-horizontal-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
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
