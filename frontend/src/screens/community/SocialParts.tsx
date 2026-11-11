import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text as NativeText,
  View,
  type TextProps,
} from 'react-native';
import { tokens } from '../../app/ui';

export function SocialText({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: tokens.font }, style]} />;
}
const Text = SocialText;

const images = {
  mic: [require('../../assets/figma/social/recommend-mic.png'), 20],
  coffee: [require('../../assets/figma/social/recommend-coffee.png'), 22],
  sparkles: [require('../../assets/figma/social/recommend-sparkles.png'), 16],
  navigation: [
    require('../../assets/figma/social/recommend-navigation.png'),
    16,
  ],
  shield: [require('../../assets/figma/social/shield.png'), 14],
  pin: [require('../../assets/figma/social/review-pin.png'), 14],
  star: [require('../../assets/figma/social/review-star.png'), 12],
  starEmpty: [require('../../assets/figma/social/review-star-partial.png'), 12],
  reviewCoffee: [require('../../assets/figma/social/review-coffee.png'), 20],
  heart: [require('../../assets/figma/social/review-heart.png'), 16],
  comment: [require('../../assets/figma/social/review-comment.png'), 16],
  reviewsActive: [require('../../assets/figma/social/reviews-active.png'), 16],
  reviewsInactive: [
    require('../../assets/figma/social/reviews-inactive.png'),
    16,
  ],
  groupsActive: [require('../../assets/figma/social/groups-active.png'), 16],
  groupsInactive: [
    require('../../assets/figma/social/groups-inactive.png'),
    16,
  ],
  news: [require('../../assets/figma/social/review-news.png'), 22],
  chevron: [require('../../assets/figma/social/review-chevron.png'), 18],
  reviewPlus: [require('../../assets/figma/social/review-plus.png'), 26],
  groupPin: [require('../../assets/figma/social/group-pin.png'), 16],
  down: [require('../../assets/figma/social/group-chevron-down.png'), 14],
  clock: [require('../../assets/figma/social/group-clock.png'), 13],
  groupPlus: [require('../../assets/figma/social/group-plus.png'), 18],
  detailClock: [require('../../assets/figma/social/detail-clock.png'), 16],
  detailCoffee: [require('../../assets/figma/social/detail-coffee.png'), 16],
  detailPlus: [require('../../assets/figma/social/detail-plus.png'), 16],
  detailChevron: [require('../../assets/figma/social/detail-chevron.png'), 14],
  detailHeart: [require('../../assets/figma/social/detail-heart.png'), 22],
} as const;

export function SocialIcon({ name }: { name: keyof typeof images }) {
  const [source, size] = images[name];
  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      accessibilityIgnoresInvertColors
    />
  );
}

export function Badge({
  label,
  neutral = false,
}: {
  label: string;
  neutral?: boolean;
}) {
  return (
    <View style={[styles.badge, neutral && styles.neutralBadge]}>
      <Text style={[styles.badgeText, neutral && styles.neutralText]}>
        {label}
      </Text>
    </View>
  );
}

export function Avatar({
  name,
  green = false,
  size = 36,
}: {
  name: string;
  green?: boolean;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        green && styles.greenAvatar,
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          { fontSize: size * 0.42 },
          green && styles.greenText,
        ]}
      >
        {name.slice(0, 1) || '커'}
      </Text>
    </View>
  );
}

export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.pageTitle}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function CommunitySegment({
  active,
  onChange,
}: {
  active: 'reviews' | 'meetups';
  onChange: (tab: 'reviews' | 'meetups') => void;
}) {
  return (
    <View style={styles.segment}>
      {(['reviews', 'meetups'] as const).map(tab => (
        <Pressable
          key={tab}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === tab }}
          accessibilityLabel={tab === 'reviews' ? '커피 리뷰' : '같이 가요'}
          onPress={() => onChange(tab)}
          style={[styles.segmentItem, active === tab && styles.segmentActive]}
        >
          <SocialIcon
            name={
              tab === 'reviews'
                ? active === tab
                  ? 'reviewsActive'
                  : 'reviewsInactive'
                : active === tab
                ? 'groupsActive'
                : 'groupsInactive'
            }
          />
          <Text
            style={[
              styles.segmentText,
              active === tab && styles.segmentActiveText,
            ]}
          >
            {tab === 'reviews' ? '커피 리뷰' : '같이 가요'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export const socialStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: {
    color: tokens.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  body: { color: tokens.text, fontSize: 13, lineHeight: 20 },
  muted: { color: tokens.muted, fontSize: 12, lineHeight: 17 },
  tiny: { color: tokens.muted, fontSize: 11, lineHeight: 16 },
  grow: { flex: 1 },
  gap: { gap: 14 },
});

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: tokens.greenLight,
    alignSelf: 'flex-start',
  },
  neutralBadge: { backgroundColor: tokens.card },
  badgeText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: tokens.green,
  },
  neutralText: { color: tokens.muted },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.brownLight,
  },
  greenAvatar: { backgroundColor: tokens.greenLight },
  avatarText: { fontWeight: '700', color: tokens.brown },
  greenText: { color: tokens.green },
  pageTitle: { gap: 4 },
  title: {
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '700',
    color: tokens.text,
  },
  subtitle: { color: tokens.muted, fontSize: 13, lineHeight: 19 },
  segment: {
    flexDirection: 'row',
    gap: 4,
    height: 44,
    padding: 4,
    borderRadius: 12,
    backgroundColor: tokens.card,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: tokens.white,
    elevation: 4,
    shadowColor: tokens.text,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  segmentText: { color: tokens.muted, fontSize: 14, fontWeight: '500' },
  segmentActiveText: { color: tokens.text, fontWeight: '700' },
});
