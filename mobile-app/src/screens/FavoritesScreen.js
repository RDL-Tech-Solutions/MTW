import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 px-4 py-6">
      <Text className="text-2xl font-bold text-gray-900 mb-4">Favoritos</Text>
      <Text className="text-gray-600">Nenhum produto favoritado ainda</Text>
    </SafeAreaView>
  );
}
