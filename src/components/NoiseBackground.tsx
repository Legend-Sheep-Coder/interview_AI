import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateNoiseDots() {
  const cols = 28;
  const rows = Math.ceil((H / W) * cols) + 6;
  const dots: { left: number; top: number; opacity: number; size: number }[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellW = W / cols;
    const cellH = H / rows;
    dots.push({
      left: col * cellW + seededRandom(i) * cellW * 0.5,
      top: row * cellH + seededRandom(i + 1000) * cellH * 0.5,
      opacity: 0.03 + seededRandom(i + 2000) * 0.1,
      size: 1.2 + seededRandom(i + 3000) * 1.5,
    });
  }
  return dots;
}

const NOISE_DOTS = generateNoiseDots();

export function NoiseBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9', '#ffffff']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={StyleSheet.absoluteFill}>
        {NOISE_DOTS.map((d, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                left: d.left,
                top: d.top,
                width: d.size,
                height: d.size,
                borderRadius: d.size / 2,
                opacity: d.opacity,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    backgroundColor: '#94a3b8',
  },
});
