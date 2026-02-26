import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/home/HomeScreen';
import CategoriesScreen from '../screens/categories/CategoriesScreen';
import FavoritesScreen from '../screens/favorites/FavoritesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import CouponsScreen from '../screens/coupons/CouponsScreen';
import CustomTabBar from '../components/navigation/CustomTabBar';
import { SCREEN_NAMES } from '../utils/constants';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name={SCREEN_NAMES.HOME}
        component={HomeScreen}
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.FAVORITES}
        component={FavoritesScreen}
        options={{ tabBarLabel: 'Favoritos' }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.COUPONS}
        component={CouponsScreen}
        options={{ tabBarLabel: 'Cupons' }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.CATEGORIES}
        component={CategoriesScreen}
        options={{ tabBarLabel: 'Categorias' }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.PROFILE}
        component={ProfileScreen}
        options={{ tabBarLabel: 'Mais' }}
      />
    </Tab.Navigator>
  );
}
