import React from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';

export default function SearchBar({ value, onChangeText, placeholder = 'Buscar produtos...', onFocus, onBlur, containerStyle }) {
  const { colors } = useThemeStore();

  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name="search-outline" size={18} color="#999" style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
      />
      {value && value.length > 0 && (
        <Ionicons
          name="close-circle"
          size={18}
          color="#999"
          style={styles.clearIcon}
          onPress={() => onChangeText('')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    color: '#333',
    padding: 0,
  },
  clearIcon: {
    marginLeft: 8,
  },
});
