import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api, useResource } from '../../app/api';
import type { Meetup, MeetupMessage } from '../../app/domain';
import {
  Button,
  Card,
  Empty,
  Field,
  Notice,
  Screen,
  tokens,
} from '../../app/ui';
import type { RootStackScreenProps } from '../../navigation/types';
import { useSessionStore } from '../../store/sessionStore';
import {
  Avatar,
  Badge,
  SocialIcon,
  SocialText as Text,
  socialStyles as s,
} from './SocialParts';
import { readableError, relativeTime } from './socialModel';
import { useSavedMeetup } from './useSavedMeetup';
import { requestCommunityLogin } from './communityLogin';

type HostedMeetup = Meetup & { hostId?: string };

export default function MeetupDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'MeetupDetail'>) {
  const queryClient = useQueryClient();
  const id = encodeURIComponent(route.params.meetupId);
  const resource = useResource<HostedMeetup>(`/api/meetups/${id}`);
  const [updated, setUpdated] = useState<HostedMeetup | null>(null);
  const meetup = updated ?? resource.data;
  const token = useSessionStore(state => state.accessToken);
  const userId = useSessionStore(state => state.user?.id);
  const isHost = !!userId && meetup?.hostId === userId;
  const messages = useResource<MeetupMessage[]>(
    `/api/meetups/${id}/messages`,
    undefined,
    !!meetup?.joined && !!token,
  );
  const saved = useSavedMeetup(route.params.meetupId);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'join' | 'message' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(navigation.isFocused?.() !== false);
  const reloadMessages = useRef(messages.reload);
  useEffect(() => {
    reloadMessages.current = messages.reload;
  }, [messages.reload]);
  useEffect(() => {
    const focus = navigation.addListener?.('focus', () => setFocused(true));
    const blur = navigation.addListener?.('blur', () => setFocused(false));
    return () => {
      focus?.();
      blur?.();
    };
  }, [navigation]);
  useEffect(() => {
    if (!meetup?.joined || !token || !focused) return;
    const timer = setInterval(() => reloadMessages.current(), 5000);
    return () => clearInterval(timer);
  }, [meetup?.joined, token, focused]);
  useEffect(() => {
    setUpdated(null);
  }, [resource.data]);

  const join = async () => {
    if (!token) {
      requestCommunityLogin(navigation, { name: 'MeetupDetail', params: route.params }, setError);
      return;
    }
    if (!meetup || busy) return;
    setBusy('join');
    setError(null);
    try {
      const value = meetup.joined
        ? await api.delete<HostedMeetup>(`/api/meetups/${id}/join`)
        : await api.post<HostedMeetup>(`/api/meetups/${id}/join`);
      setUpdated(value);
      await queryClient.invalidateQueries({ queryKey: ['coffee-api'] });
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    if (!isHost || busy) return;
    setBusy('join');
    setError(null);
    try {
      await api.delete<null>(`/api/meetups/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['coffee-api'] });
      if (navigation.isFocused?.() !== false)
        navigation.popTo('Community', { tab: 'meetups' });
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setBusy(null);
    }
  };
  const confirmRemove = () =>
    Alert.alert(
      '모임을 취소할까요?',
      '참여자들에게 더 이상 모임이 표시되지 않습니다.',
      [
        { text: '돌아가기', style: 'cancel' },
        { text: '모임 취소', style: 'destructive', onPress: remove },
      ],
    );
  const send = async () => {
    if (!text.trim()) {
      setError('대화 내용을 입력해 주세요.');
      return;
    }
    if (!meetup?.joined || !token || busy) return;
    setBusy('message');
    setError(null);
    try {
      await api.post<MeetupMessage>(`/api/meetups/${id}/messages`, {
        text: text.trim(),
      });
      setText('');
      messages.reload();
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setBusy(null);
    }
  };
  const date = meetup ? new Date(meetup.startsAt) : null;
  const dateLabel =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleString('ko-KR', {
          month: 'long',
          day: 'numeric',
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : meetup?.startsAt;
  const remaining = meetup
    ? Math.max(0, meetup.capacity - meetup.memberCount)
    : 0;

  return (
    <Screen title="같이 가요" navigation={navigation}>
      {resource.loading && <ActivityIndicator color={tokens.green} />}
      {resource.error && (
        <Empty message={resource.error} onRetry={resource.reload} />
      )}
      {meetup && (
        <>
          <View style={s.row}>
            <Badge label={meetup.category} />
            <Text style={styles.status}>
              {remaining > 0 ? '모집 중' : '모집 완료'}
            </Text>
          </View>
          <Text style={styles.title}>{meetup.title}</Text>
          <View style={s.row}>
            <Avatar name={meetup.hostNickname} size={30} green />
            <View>
              <Text style={s.title}>{meetup.hostNickname}</Text>
              <Text style={s.tiny}>모임장</Text>
            </View>
          </View>
          <Card style={styles.info}>
            <InfoRow
              icon="detailClock"
              title={dateLabel || '시간 미등록'}
              subtitle="모임 시간에 맞춰 도착해 주세요."
            />
            <InfoRow
              icon="groupPin"
              title={meetup.placeName}
              subtitle={
                meetup.address ||
                '상세한 만날 위치는 모임 대화에서 확인해 주세요.'
              }
              onPress={
                meetup.cafeId
                  ? () =>
                      navigation.navigate('CafeDetail', {
                        cafeId: meetup.cafeId!,
                      })
                  : undefined
              }
            />
            <InfoRow
              icon="groupsActive"
              title={`${meetup.memberCount} / ${meetup.capacity}명`}
              subtitle={
                remaining > 0
                  ? `${remaining}자리 남았어요`
                  : '모집이 완료됐어요'
              }
            />
            <InfoRow
              icon="detailCoffee"
              title="음료는 각자 주문"
              subtitle="함께 방문할 카페의 메뉴를 확인해 주세요."
            />
          </Card>
          <Text style={s.body}>{meetup.description}</Text>
          <Text style={s.title}>참여자</Text>
          <View style={styles.people}>
            {(meetup.members ?? []).map((member, index) => (
              <View style={styles.person} key={member.id}>
                <Avatar name={member.nickname} size={40} green={index === 0} />
                <Text style={s.tiny}>{member.nickname}</Text>
              </View>
            ))}
            {Array.from({ length: Math.min(4, remaining) }, (_, index) => (
              <View style={styles.person} key={`empty-${index}`}>
                <View style={styles.emptySeat}>
                  <SocialIcon name="detailPlus" />
                </View>
                <Text style={s.tiny}>빈 자리</Text>
              </View>
            ))}
            {!meetup.members?.length && meetup.memberCount > 0 && (
              <Text style={s.muted}>{meetup.memberCount}명 참여 중</Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="모임 대화 새로고침"
            disabled={!meetup.joined || !token}
            onPress={messages.reload}
            style={[s.row, styles.chatHeader]}
          >
            <Text style={[s.title, s.grow]}>모임 대화</Text>
            {meetup.joined && (
              <Text style={s.muted}>{messages.data?.length ?? 0}개</Text>
            )}
            <SocialIcon name="detailChevron" />
          </Pressable>
          {meetup.joined && token ? (
            <>
              {messages.loading && <ActivityIndicator color={tokens.green} />}
              {messages.error && (
                <Empty message={messages.error} onRetry={messages.reload} />
              )}
              {!messages.loading &&
                !messages.error &&
                messages.data?.length === 0 && (
                  <Text style={s.muted}>
                    아직 대화가 없습니다. 인사를 남겨 보세요.
                  </Text>
                )}
              {(messages.data ?? []).map(message => (
                <View style={[s.row, styles.chat]} key={message.id}>
                  <Avatar name={message.authorNickname} size={26} />
                  <View style={s.grow}>
                    <View style={s.row}>
                      <Text style={[s.tiny, s.grow]}>
                        {message.authorNickname}
                      </Text>
                      <Text style={s.tiny}>
                        {relativeTime(message.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.bubble}>
                      <Text style={s.body}>{message.text}</Text>
                    </View>
                  </View>
                </View>
              ))}
              <Field
                label="모임 대화"
                value={text}
                onChangeText={setText}
                placeholder="참여자에게 메시지 남기기"
                multiline
                maxLength={1000}
              />
              <Button
                label="대화 보내기"
                variant="outline"
                onPress={send}
                loading={busy === 'message'}
                disabled={busy === 'join'}
              />
            </>
          ) : (
            <Text style={s.muted}>모임에 참여하면 대화를 나눌 수 있어요.</Text>
          )}
          <View style={[s.row, styles.safety]}>
            <SocialIcon name="shield" />
            <Text style={[s.tiny, s.grow]}>
              처음 만나는 사람과는 카페 같은 공개된 장소에서 만나요. 불편한 일이
              있으면 신고해 주세요.
            </Text>
          </View>
          {error && <Notice>{error}</Notice>}
          {saved.error && (
            <Empty message={saved.error} onRetry={saved.reload} />
          )}
          <View style={styles.bottom}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                saved.saved ? '모임 저장 취소' : '이 기기에 모임 저장'
              }
              accessibilityState={{
                selected: saved.saved,
                disabled: saved.disabled,
              }}
              disabled={saved.disabled}
              onPress={saved.toggle}
              style={[styles.save, saved.saved && styles.saved]}
            >
              <SocialIcon name="detailHeart" />
            </Pressable>
            <Button
              style={s.grow}
              label={
                isHost
                  ? '모임 취소'
                  : meetup.joined
                  ? '참여 취소'
                  : remaining > 0
                  ? `참여하기 (${meetup.memberCount}/${meetup.capacity})`
                  : '모집 완료'
              }
              onPress={isHost ? confirmRemove : join}
              loading={busy === 'join'}
              disabled={
                busy === 'message' || (!meetup.joined && remaining === 0)
              }
            />
          </View>
        </>
      )}
    </Screen>
  );
}

function InfoRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof SocialIcon>['name'];
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.infoIcon}>
        <SocialIcon name={icon} />
      </View>
      <View style={s.grow}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.tiny}>{subtitle}</Text>
      </View>
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.infoRow}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.infoRow}>{content}</View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: tokens.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  status: { color: tokens.green, fontSize: 12, fontWeight: '700' },
  info: { gap: 12, padding: 16, borderRadius: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.greenLight,
  },
  people: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  person: { alignItems: 'center', gap: 4 },
  emptySeat: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeader: { marginTop: 2 },
  chat: { alignItems: 'flex-start' },
  bubble: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: tokens.card,
  },
  safety: { gap: 6, alignItems: 'flex-start' },
  bottom: { flexDirection: 'row', gap: 10, marginTop: 10 },
  save: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saved: { borderColor: tokens.green, backgroundColor: tokens.greenLight },
});
