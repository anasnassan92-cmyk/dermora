import { useWindowDimensions } from 'react-native';

import { spacing } from '../theme';

/** Width available inside a padded Screen. Explicit pixel sizes are more reliable than percentages for images on Android. */
export function useContentWidth(extraPadding = 0): number {
  const { width } = useWindowDimensions();
  return Math.min(width, 480) - spacing.xl * 2 - extraPadding;
}
