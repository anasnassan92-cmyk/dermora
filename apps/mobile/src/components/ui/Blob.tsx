import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing } from '../../theme';

/** Soft mint blob in the top-right corner – the decorative backdrop used across the design. */
export function Blob({ size = 300 }: { size?: number }) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { width: size * 0.65, height: size * 0.7, top: -size * 0.3, right: -spacing.xl }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200" style={{ marginLeft: -size * 0.35 }}>
        <Path
          d="M62 18c34-18 84-10 108 18s26 76 6 108-66 48-106 36S-4 136 4 96 28 36 62 18Z"
          fill={colors.blob}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', zIndex: 0, overflow: 'hidden' } });
