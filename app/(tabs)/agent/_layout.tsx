import { Stack } from 'expo-router';

export default function AgentsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />          // la liste des propriétés
      <Stack.Screen name="[id]" />           // le détail d'une propriété
    </Stack>
  );
}