import { Stack } from 'expo-router';

export default function DjamabizzLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="visites" />
    </Stack>
  );
}