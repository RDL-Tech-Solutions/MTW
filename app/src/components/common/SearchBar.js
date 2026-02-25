import React from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';

export default function SearchBar({ value, onChangeText, placeholder = 'Buscar produtos...', onFocus, onBlur, containerStyle }) {
  const { colors } = useThemeStore();
  const s = dynamicStyles(colors);

  return (
    <View style={[s.container, containerStyle]}>
      <Ionicons name="search-outline" size={18} color={colors.textMuted} style={s.icon} />
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
      />
      {value && value.length > 0 && (
        <Ionicons
          name="close-circle"
          size={18}
          color={colors.textMuted}
          style={s.clearIcon}
          onPress={() => onChangeText('')}
        />
      )}
    </View>
  );
}

const dynamicStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  clearIcon: {
    marginLeft: 8,
  },
});
