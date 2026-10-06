import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme';
import { Icon, type IconName } from './Icon';

interface Props {
  name: IconName;
  size?: number; // badge diameter
  tone?: 'mint' | 'teal' | 'white';
}

/** Round mint badge with a brand icon – the "icon style" from the brand kit. */
export function IconBadge({ name, size = 44, tone = 'mint' }: Props) {
  const bg = tone === 'teal' ? colors.surfaceBrand : tone === 'white' ? colors.surfaceRaised : colors.surfaceMint;
  const fg = tone === 'teal' ? colors.onBrand : colors.inkBrand;
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Icon name={name} size={Math.round(size * 0.5)} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({ badge: { alignItems: 'center', justifyContent: 'center' } });
