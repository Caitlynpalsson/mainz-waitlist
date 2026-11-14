import Svg, { Circle, Path } from 'react-native-svg';

type Props = { size?: number; color?: string; stroke?: number };

export function IconSearch({ size = 16, color = '#14213D', stroke = 1.6 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="6.5" stroke={color} strokeWidth={stroke} />
      <Path d="m20 20-4.2-4.2" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  );
}

export function IconPin({ size = 16, color = '#14213D', stroke = 1.6 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
      <Circle cx="12" cy="10" r="2.2" stroke={color} strokeWidth={stroke} />
    </Svg>
  );
}

export function IconBell({ size = 20, color = '#14213D', stroke = 1.6 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 16V11a6 6 0 1 1 12 0v5l1.2 1.6H4.8L6 16z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
      <Path d="M10 18.5a2 2 0 0 0 4 0" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  );
}

export function IconBag({ size = 22, color = '#14213D', stroke = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 8h14l-1 13H6z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
      <Path d="M9 8a3 3 0 0 1 6 0" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  );
}

export function IconHome({ size = 22, color = '#14213D', stroke = 1.4 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
    </Svg>
  );
}

export function IconBarn({ size = 22, color = '#14213D', stroke = 1.4 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 20V10.5L12 4l9 6.5V20" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
      <Path d="M9 20v-6h6v6" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
      <Path d="M3 12h18" stroke={color} strokeWidth={stroke} />
    </Svg>
  );
}

export function IconPerson({ size = 22, color = '#14213D', stroke = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth={stroke} />
      <Path d="M5 20c1.4-3.4 3.8-5 7-5s5.6 1.6 7 5" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  );
}

export function IconChevron({ size = 18, color = '#14213D', stroke = 1.6, left = false }: Props & { left?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={left ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconHeart({ size = 18, color = '#14213D', stroke = 1.6, filled = false }: Props & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
    </Svg>
  );
}

export function IconShare({ size = 18, color = '#14213D', stroke = 1.6 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 16V4" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Path d="m8 8 4-4 4 4" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 13v6h12v-6" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconTruck({ size = 16, color = '#14213D', stroke = 1.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 7h11v9H3zM14 11h4l3 3v2h-7" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
      <Circle cx="7" cy="17.5" r="1.6" stroke={color} strokeWidth={stroke} />
      <Circle cx="17" cy="17.5" r="1.6" stroke={color} strokeWidth={stroke} />
    </Svg>
  );
}
