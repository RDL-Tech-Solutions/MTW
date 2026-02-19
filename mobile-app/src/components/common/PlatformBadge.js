import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlatformIcon, getPlatformColor, getPlatformName } from '../../utils/platformIcons';

export default function PlatformBadge({ platform, size = 'medium', showIcon = true, showName = true }) {
    const color = getPlatformColor(platform);
    const name = getPlatformName(platform);

    const sizeConfig = {
        small: { container: styles.containerSmall, text: styles.textSmall, iconSize: 14 },
        medium: { container: styles.containerMedium, text: styles.textMedium, iconSize: 18 },
        large: { container: styles.containerLarge, text: styles.textLarge, iconSize: 22 },
    };

    const current = sizeConfig[size] || sizeConfig.medium;

    return (
        <View style={[styles.container, current.container, { backgroundColor: color }]}>
            {showIcon && (
                <View style={[styles.iconWrapper, {
                    width: current.iconSize + 4,
                    height: current.iconSize + 4,
                    borderRadius: (current.iconSize + 4) * 0.25,
                }]}>
                    <PlatformIcon platform={platform} size={current.iconSize} />
                </View>
            )}
            {showName && (
                <Text style={[styles.text, current.text, { color: '#FFFFFF' }]}>
                    {name}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    containerSmall: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
    },
    containerMedium: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    containerLarge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    iconWrapper: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
        overflow: 'hidden',
    },
    text: {
        fontWeight: '700',
        color: '#FFFFFF',
    },
    textSmall: {
        fontSize: 10,
    },
    textMedium: {
        fontSize: 12,
    },
    textLarge: {
        fontSize: 14,
    },
});
