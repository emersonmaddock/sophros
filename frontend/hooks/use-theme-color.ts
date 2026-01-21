/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';

// Helper type to exclude 'charts' since it's an object, not a color string
type ColorName = Exclude<keyof typeof Colors.light, 'charts'>;

export function useThemeColor(props: { light?: string; dark?: string }, colorName: ColorName) {
  // const theme = useColorScheme() ?? 'light';
  // use light theme for now
  const theme = 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
