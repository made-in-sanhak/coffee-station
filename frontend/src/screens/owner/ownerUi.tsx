import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type {
  ImageSourcePropType,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { tokens } from '../../app/ui';
import { remainingTime } from '../order/orderFlow';

export const P = {
  bg: tokens.bg,
  white: tokens.white,
  green: tokens.green,
  soft: '#E3EFE6',
  text: tokens.text,
  muted: tokens.muted,
  border: tokens.border,
  card: '#F6F0E8',
  brown: '#8B5E3C',
  brownSoft: '#E9D8C4',
  red: '#D0554A',
  redSoft: '#FBE9E7',
  kakao: tokens.kakao,
  star: '#E8A33D',
};
const images = {
  store: [require('../../assets/figma/owner/44b77.png'), 24, 24],
  bell: [require('../../assets/figma/owner/71948.png'), 22, 22],
  user: [require('../../assets/figma/owner/1e126.png'), 22, 22],
  coffee: [require('../../assets/figma/owner/b1f3b.png'), 22, 22],
  down: [require('../../assets/figma/owner/55562.png'), 18, 18],
  edit: [require('../../assets/figma/owner/6e38e.png'), 20, 20],
  event: [require('../../assets/figma/owner/fb694.png'), 20, 20],
  review: [require('../../assets/figma/owner/15a05.png'), 20, 20],
  chart: [require('../../assets/figma/owner/3ff89.png'), 20, 20],
  receiptRed: [require('../../assets/figma/owner/3f189.png'), 20, 20],
  rightRed: [require('../../assets/figma/owner/37d3b.png'), 18, 18],
  toggleOn: [require('../../assets/figma/owner/6249d.png'), 40, 24],
  toggleOff: [require('../../assets/figma/owner/099e6.png'), 40, 24],
  search: [require('../../assets/figma/owner/2d68c.png'), 18, 18],
  shield: [require('../../assets/figma/owner/87d56.png'), 16, 16],
  plus: [require('../../assets/figma/owner/2961d.png'), 16, 16],
  megaphone: [require('../../assets/figma/owner/460a0.png'), 20, 20],
  clock: [require('../../assets/figma/owner/ee699.png'), 18, 18],
  clockSmall: [require('../../assets/figma/owner/4bf8b.png'), 16, 16],
  orderStore: [require('../../assets/figma/owner/3d760.png'), 20, 20],
  orderCoffee: [require('../../assets/figma/owner/21627.png'), 20, 20],
  ticket: [require('../../assets/figma/owner/b1beb.png'), 18, 18],
  right: [require('../../assets/figma/owner/1b566.png'), 16, 16],
  check: [require('../../assets/figma/owner/1f66b.png'), 14, 14],
  checkSmall: [require('../../assets/figma/owner/f3569.png'), 13, 13],
  loader: [require('../../assets/figma/owner/7965b.png'), 72, 72],
  progress: [require('../../assets/figma/owner/6ce76.png'), 22, 22],
  checkLarge: [require('../../assets/figma/owner/90bfa.png'), 28, 28],
  receipt: [require('../../assets/figma/owner/78180.png'), 16, 16],
  failure: [require('../../assets/figma/owner/7968f.png'), 26, 26],
  pin: [require('../../assets/figma/owner/58397.png'), 20, 20],
  homeDown: [require('../../assets/figma/owner/b994b.png'), 18, 18],
  homeTicket: [require('../../assets/figma/owner/c70e2.png'), 22, 22],
  homeSearch: [require('../../assets/figma/owner/16d5f.png'), 20, 20],
  sparkles: [require('../../assets/figma/owner/b76f9.png'), 18, 18],
  homeRight: [require('../../assets/figma/owner/c2ff5.png'), 14, 14],
  homeCoffee: [require('../../assets/figma/owner/4f028.png'), 30, 30],
  star: [require('../../assets/figma/owner/76a51.png'), 12, 12],
  gift: [require('../../assets/figma/owner/333e4.png'), 20, 20],
  car: [require('../../assets/figma/owner/a7ec1.png'), 20, 20],
  popupEllipse: [require('../../assets/figma/owner/efd71.png'), 200, 200],
  popupCoffee: [require('../../assets/figma/owner/43fcb.png'), 120, 120],
  zap: [require('../../assets/figma/owner/ad56c.png'), 14, 14],
  close: [require('../../assets/figma/owner/49cc6.png'), 18, 18],
  setCoffee: [require('../../assets/figma/owner/ba4cc.png'), 18, 18],
  timerFace: [require('../../assets/figma/owner/abd6a.png'), 44, 44],
  timerTrack: [require('../../assets/figma/owner/42874.png'), 44, 44],
  timerProgress: [require('../../assets/figma/owner/3dd85.png'), 44, 44],
  timerPin: [require('../../assets/figma/owner/0554d.png'), 5.28, 5.28],
  popupFace: [require('../../assets/figma/owner/db728.png'), 72, 72],
  popupTrack: [require('../../assets/figma/owner/c5c85.png'), 72, 72],
  popupProgress: [require('../../assets/figma/owner/b8f5a.png'), 72, 72],
  popupPin: [require('../../assets/figma/owner/a2cf2.png'), 8.64, 8.64],
} as const;
export type AssetName = keyof typeof images;
export function Asset({ name }: { name: AssetName }) {
  const [source, width, height] = images[name];
  return (
    <Image
      accessible={false}
      source={source as ImageSourcePropType}
      style={{ width, height }}
      resizeMode="contain"
    />
  );
}
export function Txt({
  children,
  size = 14,
  bold = false,
  color = P.text,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  bold?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        {
          color,
          fontFamily: tokens.font,
          fontSize: size,
          lineHeight: Math.round(size * 1.4),
          fontWeight: bold ? '700' : '400',
          includeFontPadding: false,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.row, style]}>{children}</View>;
}
export function Badge({
  children,
  tone = 'green',
}: {
  children: React.ReactNode;
  tone?: 'green' | 'brown' | 'red' | 'gray';
}) {
  return (
    <View
      style={[
        s.badge,
        {
          backgroundColor:
            tone === 'green'
              ? P.soft
              : tone === 'brown'
              ? P.brownSoft
              : tone === 'red'
              ? P.redSoft
              : P.card,
        },
      ]}
    >
      <Txt
        size={11}
        bold
        color={
          tone === 'green'
            ? P.green
            : tone === 'brown'
            ? P.brown
            : tone === 'red'
            ? P.red
            : P.muted
        }
      >
        {children}
      </Txt>
    </View>
  );
}
export function Line() {
  return <View style={s.line} />;
}
export function DetailRow({
  label,
  children,
  color = P.text,
}: {
  label: string;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <Row>
      <Txt size={13} color={P.muted}>
        {label}
      </Txt>
      <Txt size={13} color={color} style={s.detailValue}>
        {children}
      </Txt>
    </Row>
  );
}
export function ClockBanner({
  endsAt,
  label = '타임딜 가격 유지',
  small = false,
}: {
  endsAt?: string;
  label?: string;
  small?: boolean;
}) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <Row style={s.clockBanner}>
      <Asset name={small ? 'clockSmall' : 'clock'} />
      <Txt size={small ? 12 : 13} bold color={P.red}>
        {label} {remainingTime(endsAt, now)} 남음
      </Txt>
    </Row>
  );
}
export function CheckBox({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={s.checkRow}
    >
      <View
        style={[
          s.checkBox,
          checked && { backgroundColor: P.green, borderColor: P.green },
        ]}
      >
        {checked && <Asset name="check" />}
      </View>
      <Txt size={12} style={{ flex: 1 }}>
        {label}
      </Txt>
    </Pressable>
  );
}
export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: { gap: 14 },
  grow: { flex: 1 },
  center: { alignItems: 'center' },
  line: { height: 1, backgroundColor: P.border, alignSelf: 'stretch' },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  detailValue: { flex: 1, textAlign: 'right' },
  clockBanner: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: P.redSoft,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedCenter: { textAlign: 'center', color: P.muted },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: P.brownSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
