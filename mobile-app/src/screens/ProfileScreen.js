import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 px-4 py-6">
      <Text className="text-2xl font-bold text-gray-900 mb-6">Perfil</Text>
      
      <View className="bg-white rounded-lg p-4 mb-4">
        <Text className="text-lg font-semibold text-gray-900">Usuário</Text>
        <Text className="text-gray-600 mt-1">usuario@email.com</Text>
      </View>

      <TouchableOpacity className="bg-primary rounded-lg p-4">
        <Text className="text-white text-center font-semibold">
          Fazer Login
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
