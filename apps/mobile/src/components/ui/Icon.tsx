import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme';
import { ICONS, type IconName } from './icons.generated';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Brand-kit line icon (24 px grid, 1.75 stroke). Regenerate the map with scripts/gen-icons.py. */
export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 1.75 }: Props) {
  const paths = ICONS[name] ?? [];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      {paths.map((p, i) =>
        p.fill ? (
          <Path key={i} d={p.d} fill={color} />
        ) : (
          <Path key={i} d={p.d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        ),
      )}
    </Svg>
  );
}

export type { IconName };
