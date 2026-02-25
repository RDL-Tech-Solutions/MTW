import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Container que faz scale-in (crescimento) automático ao montar
 */
export default function ScaleInView({
    children,
    duration = 400,
    delay = 0,
    fromScale = 0.9,
    style,
    ...props
}) {
    const scaleAnim = useRef(new Animated.Value(fromScale)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                delay: delay,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: duration,
                delay: delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
            {...props}
        >
            {children}
        </Animated.View>
    );
}
