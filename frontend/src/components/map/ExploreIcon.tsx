import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

const icons = {
  coffeeRow: {
    source: require('../../assets/figma/explore/82d75.png'),
    width: 20,
    height: 20,
  },
  coffeeLogo: {
    source: require('../../assets/figma/explore/84e19.png'),
    width: 24,
    height: 24,
  },
  coffeeDetail: {
    source: require('../../assets/figma/explore/527cc.png'),
    width: 36,
    height: 36,
  },
  coffeeCompare: {
    source: require('../../assets/figma/explore/e4a09.png'),
    width: 20,
    height: 20,
  },
  searchHeader: {
    source: require('../../assets/figma/explore/adce0.png'),
    width: 22,
    height: 22,
  },
  bell: {
    source: require('../../assets/figma/explore/71948.png'),
    width: 22,
    height: 22,
  },
  search: {
    source: require('../../assets/figma/explore/ec087.png'),
    width: 20,
    height: 20,
  },
  mic: {
    source: require('../../assets/figma/explore/f04fb.png'),
    width: 20,
    height: 20,
  },
  locate: {
    source: require('../../assets/figma/explore/07ce5.png'),
    width: 22,
    height: 22,
  },
  chevronDown: {
    source: require('../../assets/figma/explore/85d5a.png'),
    width: 14,
    height: 14,
  },
  compareChevronDown: {
    source: require('../../assets/figma/explore/55562.png'),
    width: 18,
    height: 18,
  },
  myLocation: {
    source: require('../../assets/figma/explore/7bee7.png'),
    width: 18,
    height: 18,
  },
  placePin: {
    source: require('../../assets/figma/explore/7c319.png'),
    width: 16,
    height: 16,
  },
  pinDot: {
    source: require('../../assets/figma/explore/e3877.png'),
    width: 10,
    height: 10,
  },
  returnLocation: {
    source: require('../../assets/figma/explore/e69a2.png'),
    width: 16,
    height: 16,
  },
  back: {
    source: require('../../assets/figma/explore/94c2a.png'),
    width: 24,
    height: 24,
  },
  star: {
    source: require('../../assets/figma/explore/004ed.png'),
    width: 14,
    height: 14,
  },
  shield: {
    source: require('../../assets/figma/explore/3b7c1.png'),
    width: 14,
    height: 14,
  },
  comparePin: {
    source: require('../../assets/figma/explore/afad1.png'),
    width: 14,
    height: 14,
  },
  megaphone: {
    source: require('../../assets/figma/explore/b9266.png'),
    width: 22,
    height: 22,
  },
  chevronRight: {
    source: require('../../assets/figma/explore/cc856.png'),
    width: 18,
    height: 18,
  },
  permissionLocate: {
    source: require('../../assets/figma/explore/71be3.png'),
    width: 40,
    height: 40,
  },
  permissionMap: {
    source: require('../../assets/figma/explore/55330.png'),
    width: 18,
    height: 18,
  },
  permissionNav: {
    source: require('../../assets/figma/explore/ba05f.png'),
    width: 18,
    height: 18,
  },
  permissionSparkles: {
    source: require('../../assets/figma/explore/17811.png'),
    width: 18,
    height: 18,
  },
  permissionShield: {
    source: require('../../assets/figma/explore/132c0.png'),
    width: 16,
    height: 16,
  },
};

export type ExploreIconName = keyof typeof icons;

export default function ExploreIcon({
  name,
  style,
}: {
  name: ExploreIconName;
  style?: StyleProp<ImageStyle>;
}) {
  const icon = icons[name];
  return (
    <Image
      source={icon.source}
      style={[style, { width: icon.width, height: icon.height }]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
