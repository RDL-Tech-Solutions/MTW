import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-6">
        <Text className="text-3xl font-bold text-gray-900">MTW Promo</Text>
        <Text className="text-gray-600 mt-1">Melhores ofertas e cupons</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="bg-primary rounded-2xl p-6 mb-6">
          <Text className="text-white text-xl font-bold">🔥 Ofertas do Dia</Text>
          <Text className="text-white/80 mt-2">
            Confira as melhores promoções selecionadas para você
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            Categorias Populares
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {['Eletrônicos', 'Games', 'Casa', 'Moda'].map((cat) => (
              <TouchableOpacity
                key={cat}
                className="bg-white rounded-lg px-4 py-3 shadow-sm"
              >
                <Text className="text-gray-700 font-medium">{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            Produtos em Destaque
          </Text>
          <Text className="text-gray-500">Carregando produtos...</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
