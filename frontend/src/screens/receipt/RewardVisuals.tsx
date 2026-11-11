import { tokens } from '../../app/ui';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const assets = {
  edit: {
    source: require('../../assets/figma/rewards/34a7d.png'),
    width: 18,
    height: 18,
  },
  editSmall: {
    source: require('../../assets/figma/rewards/fd0ff.png'),
    width: 16,
    height: 16,
  },
  right: {
    source: require('../../assets/figma/rewards/22be0.png'),
    width: 18,
    height: 18,
  },
  left: {
    source: require('../../assets/figma/rewards/6ac94.png'),
    width: 18,
    height: 18,
  },
  ticket: {
    source: require('../../assets/figma/rewards/61030.png'),
    width: 20,
    height: 20,
  },
  check: {
    source: require('../../assets/figma/rewards/a5c3a.png'),
    width: 18,
    height: 18,
  },
  checkWhite: {
    source: require('../../assets/figma/rewards/a2590.png'),
    width: 18,
    height: 18,
  },
  receipt: {
    source: require('../../assets/figma/rewards/c4e00.png'),
    width: 18,
    height: 18,
  },
  shield: {
    source: require('../../assets/figma/rewards/3b7c1.png'),
    width: 14,
    height: 14,
  },
  zap: {
    source: require('../../assets/figma/rewards/3a779.png'),
    width: 18,
    height: 18,
  },
  zapSmall: {
    source: require('../../assets/figma/rewards/e02ec.png'),
    width: 14,
    height: 14,
  },
  oneDot: {
    source: require('../../assets/figma/rewards/d4391.png'),
    width: 5,
    height: 6,
  },
  twoDots: {
    source: require('../../assets/figma/rewards/bfcef.png'),
    width: 13,
    height: 6,
  },
  car: {
    source: require('../../assets/figma/rewards/1819f.png'),
    width: 22,
    height: 22,
  },
  lock: {
    source: require('../../assets/figma/rewards/a470c.png'),
    width: 22,
    height: 22,
  },
  carIllustration: {
    source: require('../../assets/figma/rewards/0aaa9.png'),
    width: 220,
    height: 110,
  },
  gauge: {
    source: require('../../assets/figma/rewards/f86ee.png'),
    width: 16,
    height: 16,
  },
  gaugeBackground: {
    source: require('../../assets/figma/rewards/a9e13.png'),
    width: 120,
    height: 60,
  },
};

export function RewardAsset({ name }: { name: keyof typeof assets }) {
  const asset = assets[name];
  return (
    <Image
      source={asset.source}
      style={{ width: asset.width, height: asset.height }}
      resizeMode="contain"
    />
  );
}

export function CaffeineGauge({ value, day = '오늘' }: { value: number; day?: string }) {
  const progress = Math.min(Math.max(value / 400, 0), 1);
  const segments = Math.round(progress * 90);
  return (
    <View accessibilityLabel={`${day} 확인된 카페인 ${value}mg`} style={s.gauge}>
      <RewardAsset name="gaugeBackground" />
      {value === 300 ? (
        <Image
          source={require('../../assets/figma/rewards/b068b.png')}
          style={s.gauge300}
        />
      ) : (
        Array.from({ length: segments }, (_, index) => {
          const angle = Math.PI + (Math.PI * (index + 0.5)) / 90;
          return (
            <View
              key={index}
              style={[
                s.gaugeSegment,
                {
                  left: 60 + 53 * Math.cos(angle) - 7,
                  top: 60 + 53 * Math.sin(angle) - 1.1,
                  transform: [{ rotate: `${(angle * 180) / Math.PI}deg` }],
                },
              ]}
            />
          );
        })
      )}
      <Text style={s.gaugeNumber}>{Math.round(value)}</Text>
    </View>
  );
}

const receiptBars = [
  1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1,
  2, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 1,
];

function ReceiptPaper() {
  return (
    <View
      style={s.receipt}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={s.paper}>
        <Text style={s.receiptTitle}>메가MGC커피</Text>
        <Text style={s.branch}>OO역점</Text>
        <Text style={s.tinyCenter}>서울 중구 세종대로 110</Text>
        <Text style={s.tinyCenter}>사업자 123-45-67890 TEL 02-123-4567</Text>
        <Image
          source={require('../../assets/figma/rewards/0ded3.png')}
          style={s.paperLine}
        />
        <Text style={s.tiny}>2026-10-13 08:42:17 POS 01</Text>
        <Image
          source={require('../../assets/figma/rewards/0ded3.png')}
          style={s.paperLine}
        />
        <View style={s.paperRow}>
          <Text style={s.paperLabel}>메뉴</Text>
          <Text style={s.tiny}>수량 금액</Text>
        </View>
        <View style={s.paperRow}>
          <Text style={s.paperLabel}>아이스 아메리카노(L)</Text>
          <Text style={s.tiny}>1 2,000</Text>
        </View>
        <View style={s.paperRow}>
          <Text style={s.paperLabel}>카페라떼(R)</Text>
          <Text style={s.tiny}>1 2,900</Text>
        </View>
        <Image
          source={require('../../assets/figma/rewards/0ded3.png')}
          style={s.paperLine}
        />
        <View style={s.paperRow}>
          <Text style={s.paperTotal}>합계</Text>
          <Text style={s.paperTotal}>4,900</Text>
        </View>
        <View style={s.paperRow}>
          <Text style={s.paperLabel}>신한카드 결제</Text>
          <Text style={s.tiny}>4,900</Text>
        </View>
        <Text style={s.tiny}>승인번호 30182746 일시불</Text>
        <Image
          source={require('../../assets/figma/rewards/0ded3.png')}
          style={s.paperLine}
        />
        <View style={s.paperBarcode}>
          {receiptBars.map((width, index) => (
            <View
              key={index}
              style={[
                s.receiptBar,
                index % 2 === 0 ? s.blackBar : s.whiteBar,
                { width: width * 1.518 },
              ]}
            />
          ))}
        </View>
        <Text style={s.tinyCenter}>감사합니다. 또 방문해 주세요</Text>
      </View>
      <Image
        source={require('../../assets/figma/rewards/09d77.png')}
        style={s.torn}
      />
    </View>
  );
}

export function ReceiptViewfinder({ imageUri }: { imageUri?: string }) {
  const [width, setWidth] = useState(350);
  const gradient = Array.from({ length: 72 }, (_, index) => {
    const y = -250 + index * 12;
    const position =
      ((0.57735 * width) / 2 + 0.8165 * y) / (0.57735 * width + 0.8165 * 330);
    const fraction = Math.max(0, Math.min(1, (position - 0.14286) / 0.71428));
    const start = [107, 84, 66],
      end = [46, 34, 26];
    const color = `rgb(${start
      .map((value, component) =>
        Math.round(value + (end[component] - value) * fraction),
      )
      .join(',')})`;
    return (
      <View
        key={index}
        style={[
          s.gradientBand,
          { left: width / 2 - 750, top: y - 6, backgroundColor: color },
        ]}
      />
    );
  });
  return (
    <View
      style={s.finder}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          accessibilityLabel="선택한 영수증"
        />
      ) : (
        <>
          {gradient}
          {[7, 153, 318].map((top, index) => (
            <View key={index} style={[s.grain, { top }]} />
          ))}
          <ReceiptPaper />
        </>
      )}
      <Image
        source={require('../../assets/figma/rewards/a7020.png')}
        style={[s.corner, s.topLeft]}
      />
      <Image
        source={require('../../assets/figma/rewards/73d37.png')}
        style={[s.corner, s.topRight]}
      />
      <Image
        source={require('../../assets/figma/rewards/caf14.png')}
        style={[s.corner, s.bottomRight]}
      />
      <Image
        source={require('../../assets/figma/rewards/c5947.png')}
        style={[s.corner, s.bottomLeft]}
      />
      <View style={s.hint}>
        <Text style={s.hintText}>영수증 전체가 보이게 맞춰 주세요</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  gauge: { width: 120, height: 66, overflow: 'hidden' },
  gauge300: { width: 102.426, height: 60, position: 'absolute', left: 0, top: 0 },
  gaugeNumber: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 34,
    fontFamily: tokens.font,
    fontSize: 18,
    lineHeight: 25,
    textAlign: 'center',
    color: tokens.brown,
    fontWeight: '900',
  },
  gaugeSegment: {
    position: 'absolute',
    width: 14,
    height: 2.2,
    backgroundColor: tokens.brown,
  },
  receiptBar: { height: 19.32 },
  blackBar: { backgroundColor: '#2a2723' },
  whiteBar: { backgroundColor: 'white' },
  finder: {
    height: 330,
    borderRadius: 20,
    backgroundColor: '#2E221A',
    overflow: 'hidden',
    alignItems: 'center',
  },
  gradientBand: {
    position: 'absolute',
    width: 1500,
    height: 12,
    transform: [{ rotate: '-35.264deg' }],
  },
  woodGlow: {
    position: 'absolute',
    width: 500,
    height: 500,
    left: -210,
    top: -280,
    borderRadius: 250,
    backgroundColor: '#6B5442',
    opacity: 0.76,
  },
  grain: {
    position: 'absolute',
    width: 520,
    height: 2,
    left: -80,
    backgroundColor: '#00000012',
    transform: [{ rotate: '6deg' }],
  },
  receipt: {
    position: 'absolute',
    top: 46,
    width: 147.66,
    transform: [{ rotate: '5deg' }],
  },
  paper: {
    width: 147.66,
    backgroundColor: '#F5F3EC',
    paddingHorizontal: 9.66,
    paddingTop: 12.42,
    paddingBottom: 6.9,
    gap: 3.45,
    elevation: 8,
  },
  receiptTitle: {
    color: '#36332e',
    fontFamily: tokens.font,
    fontSize: 10.35,
    lineHeight: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  branch: {
    color: '#36332e',
    fontFamily: tokens.font,
    fontSize: 7.245,
    lineHeight: 9,
    textAlign: 'center',
  },
  tiny: {
    color: '#6f6a62',
    fontFamily: tokens.font,
    fontSize: 6.21,
    lineHeight: 8,
  },
  tinyCenter: {
    color: '#6f6a62',
    fontFamily: tokens.font,
    fontSize: 6.21,
    lineHeight: 8,
    textAlign: 'center',
  },
  paperLine: { width: 128.34, height: 0.69 },
  paperRow: { flexDirection: 'row', backgroundColor: 'white' },
  paperLabel: {
    flex: 1,
    color: '#36332e',
    fontFamily: tokens.font,
    fontSize: 6.555,
    lineHeight: 9,
  },
  paperTotal: {
    flex: 1,
    color: '#36332e',
    fontFamily: tokens.font,
    fontSize: 8.97,
    lineHeight: 12,
    fontWeight: '700',
  },
  paperBarcode: {
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  torn: { width: 147.66, height: 4.83 },
  corner: { position: 'absolute', width: 32, height: 32 },
  topLeft: { top: 28, left: '16.57%' },
  topRight: { top: 28, right: '16.57%', transform: [{ rotate: '90deg' }] },
  bottomRight: {
    bottom: 28,
    right: '16.57%',
    transform: [{ rotate: '180deg' }],
  },
  bottomLeft: { bottom: 28, left: '16.57%', transform: [{ rotate: '-90deg' }] },
  hint: {
    position: 'absolute',
    bottom: 18,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0000008C',
  },
  hintText: {
    color: 'white',
    fontFamily: tokens.font,
    fontSize: 12,
    lineHeight: 17,
  },
});
