import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Container que faz animação de pulse (pulso) contínua
 */
export default function PulseView({
    children,
    duration = 1000,
    minScale = 1,
    maxScale = 1.05,
    loop = true,
    style,
    ...props
}) {
    const pulseAnim = useRef(new Animated.Value(minScale)).current;

    useEffect(() => {
        const animation = Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: maxScale,
                duration: duration,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: minScale,
                duration: duration,
                useNativeDriver: true,
            }),
        ]);

        if (loop) {
            Animated.loop(animation).start();
        } else {
            animation.start();
        }
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    transform: [{ scale: pulseAnim }],
                },
            ]}
            {...props}
        >
            {children}
        </Animated.View>
    );
}
