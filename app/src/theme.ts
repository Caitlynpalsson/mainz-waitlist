import { useWindowDimensions } from 'react-native';

export const colors = {
  navy: '#14213D',
  cream: '#F3F0E4',
  peri: '#9FBBE0',
  red: '#FF1E1E',
  gray: '#8A8F9C',
  ink: '#4A5164',
  hair: 'rgba(20,33,61,0.12)',
  white: '#FFFFFF',
  black: '#111111',
};

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const desktop = width >= 960;
  const box = Math.min(1120, width - (desktop ? 80 : 40));
  const seasonCols = width >= 1200 ? 4 : width >= 960 ? 3 : 1;
  const shopCols = width >= 1200 ? 4 : width >= 960 ? 3 : 2;
  const farmCols = width >= 1100 ? 3 : width >= 700 ? 2 : 1;
  return { width, height, desktop, box, seasonCols, shopCols, farmCols };
}
