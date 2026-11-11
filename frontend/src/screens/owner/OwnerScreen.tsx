import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { api, useResource } from '../../app/api';
import { Button, Card, Empty, Screen, formatMoney } from '../../app/ui';
import type {
  OwnerDashboard,
  PriceConfirmationRequest,
} from '../../app/domain';
import type { RootStackScreenProps } from '../../navigation/types';
import { Asset, Badge, P, Row, Txt, s } from './ownerUi';

export default function OwnerScreen({
  navigation,
}: RootStackScreenProps<'Owner'>) {
  const [selected, setSelected] = useState<string | undefined>();
  const resource = useResource<OwnerDashboard>('/api/owner/dashboard', {
    cafeId: selected,
  });
  const [selectOpen, setSelectOpen] = useState(false),
    [statsOpen, setStatsOpen] = useState(false),
    [requestsOpen, setRequestsOpen] = useState(false),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
  const d = resource.data,
    cafe =
      d?.cafes.find(value => value.id === (selected ?? d.selectedCafeId)) ??
      (!selected ? d?.cafes[0] : undefined);
  useEffect(
    () => navigation.addListener?.('focus', resource.reload),
    [navigation, resource.reload],
  );
  const requests = d?.priceRequests ?? [];
  const metrics = [
    { label: '상세 조회', value: d?.detailViews, change: d?.detailViewsChange },
    { label: '길찾기', value: d?.directions, change: d?.directionsChange },
    {
      label: '영수증 인증',
      value: d?.verifiedReceipts,
      change: d?.verifiedReceiptsChange,
    },
  ];
  async function resolve(request: PriceConfirmationRequest) {
    if (busy) return;
    setBusy(request.id);
    setError(null);
    try {
      await api.post(
        `/api/owner/price-requests/${encodeURIComponent(request.id)}/resolve`,
      );
      resource.reload();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : '요청을 처리하지 못했습니다.',
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <Screen
      navigation={navigation}
      header={false}
      contentStyle={{ paddingTop: 4 }}
    >
      <Row style={{ height: 52, justifyContent: 'space-between' }}>
        <Row>
          <Asset name="store" />
          <Txt size={18} bold>
            점주 센터
          </Txt>
        </Row>
        <Row style={{ gap: 16 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="새 주문 확인"
            onPress={() =>
              navigation.navigate('OwnerOrders', { cafeId: cafe?.id })
            }
          >
            <Asset name="bell" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="내 기록"
            onPress={() => navigation.navigate('Garage')}
          >
            <Asset name="user" />
          </Pressable>
        </Row>
      </Row>
      {resource.error && (
        <Empty message={resource.error} onRetry={resource.reload} />
      )}
      {resource.loading && (
        <Txt color={P.muted}>점주 정보를 불러오고 있어요.</Txt>
      )}
      {d && !cafe && (
        <Empty message="관리할 수 있는 매장이 없습니다. 승인된 점주 매장을 연결해 주세요." />
      )}
      {cafe && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="관리 매장 선택"
            onPress={() => setSelectOpen(true)}
          >
            <Card style={{ padding: 14 }}>
              <Row style={{ gap: 12 }}>
                <View
                  style={[
                    s.iconBox,
                    { width: 56, height: 56, borderRadius: 12 },
                  ]}
                >
                  <Asset name="coffee" />
                </View>
                <View style={s.grow}>
                  <Row style={{ flexWrap: 'wrap' }}>
                    <Txt size={16} bold>
                      {cafe.name}
                    </Txt>
                    {cafe.verified && <Badge>인증 완료</Badge>}
                  </Row>
                  <Txt size={12} color={P.muted}>
                    {cafe.address}
                  </Txt>
                </View>
                <Asset name="down" />
              </Row>
            </Card>
          </Pressable>
          <Row>
            {metrics.map(metric => (
              <View key={metric.label} style={s.grow}>
                <Card style={{ padding: 12, borderRadius: 14 }}>
                  <View style={{ gap: 2 }}>
                    <Txt size={11} color={P.muted}>
                      {metric.label}
                    </Txt>
                    <Txt size={18} bold>
                      {metric.value?.toLocaleString('ko-KR') ?? '—'}
                    </Txt>
                    <Txt
                      size={11}
                      color={
                        metric.change != null && metric.change < 0
                          ? P.red
                          : P.green
                      }
                    >
                      {metric.change == null
                        ? '최근 7일'
                        : `${metric.change > 0 ? '+' : ''}${
                            metric.change
                          }% · 이전 7일 대비`}
                    </Txt>
                  </View>
                </Card>
              </View>
            ))}
          </Row>
          <Card>
            <View style={{ gap: 10 }}>
              <Row>
                <Txt bold>이번 주 상세 조회</Txt>
                <Txt size={12} color={P.muted} style={s.detailValue}>
                  최근 7일
                </Txt>
              </Row>
              <Row style={{ height: 112, alignItems: 'flex-end', gap: 8 }}>
                {(d?.weeklyViews ?? []).map(day => (
                  <View
                    key={day.date}
                    accessibilityLabel={`${day.date} 상세 조회 ${day.count}회`}
                    style={{ flex: 1, alignItems: 'center', gap: 4 }}
                  >
                    <Txt size={10} color={P.muted}>
                      {day.count}
                    </Txt>
                    <View
                      style={{
                        width: '100%',
                        maxWidth: 26,
                        height: Math.max(
                          3,
                          (day.count /
                            Math.max(
                              1,
                              ...(d?.weeklyViews ?? []).map(item => item.count),
                            )) *
                            72,
                        ),
                        backgroundColor: P.green,
                        borderRadius: 3,
                      }}
                    />
                    <Txt size={10} color={P.muted}>
                      {Number(day.date.slice(-2))}일
                    </Txt>
                  </View>
                ))}
                {!d?.weeklyViews?.length && (
                  <Txt size={12} color={P.muted}>
                    아직 조회 기록이 없습니다.
                  </Txt>
                )}
              </Row>
            </View>
          </Card>
          <Row>
            <Action
              icon="edit"
              title="메뉴·가격 수정"
              caption={`메뉴 ${
                d?.menus.filter(m => m.cafeId === cafe.id).length ?? 0
              }개`}
              onPress={() =>
                navigation.navigate('OwnerMenus', { cafeId: cafe.id })
              }
            />
            <Action
              icon="event"
              title="이벤트 등록"
              caption={`진행 중 ${
                d?.deals.filter(v => v.cafeId === cafe.id && v.active).length ??
                0
              }개`}
              onPress={() =>
                navigation.navigate('OwnerMenus', {
                  cafeId: cafe.id,
                  mode: 'event',
                })
              }
            />
          </Row>
          <Row>
            <Action
              icon="review"
              title="리뷰 관리"
              caption={`등록 리뷰 ${d?.reviewCount ?? 0}개`}
              onPress={() =>
                navigation.navigate('Community', {
                  tab: 'reviews',
                  cafeId: cafe.id,
                  cafeName: cafe.name,
                })
              }
            />
            <Action
              icon="chart"
              title="홍보 통계"
              caption="매장 운영 현황"
              onPress={() => setStatsOpen(true)}
            />
          </Row>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="가격 확인 요청 보기"
            onPress={() => {
              setError(null);
              setRequestsOpen(true);
            }}
          >
            <Row
              style={{
                backgroundColor: P.redSoft,
                padding: 14,
                borderRadius: 14,
                gap: 10,
              }}
            >
              <Asset name="receiptRed" />
              <View style={s.grow}>
                <Txt bold color={P.red}>
                  가격 확인 요청 {requests.length}건
                </Txt>
                <Txt size={12}>
                  {requests[0]
                    ? `${requests[0].menuName} · ${formatMoney(
                        requests[0].currentPrice,
                      )} → ${formatMoney(requests[0].reportedPrice)}`
                    : '새로운 가격 확인 요청이 없습니다'}
                </Txt>
              </View>
              <Asset name="rightRed" />
            </Row>
          </Pressable>
        </>
      )}
      <Modal
        transparent
        visible={selectOpen}
        onRequestClose={() => setSelectOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,13,8,0.6)',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <Card>
            <View style={{ gap: 12 }}>
              <Txt size={18} bold>
                관리 매장 선택
              </Txt>
              {d?.cafes.map(v => (
                <Button
                  key={v.id}
                  label={v.name}
                  variant={v.id === cafe?.id ? 'primary' : 'outline'}
                  onPress={() => {
                    setSelected(v.id);
                    setSelectOpen(false);
                  }}
                />
              ))}
              <Button
                label="닫기"
                variant="quiet"
                onPress={() => setSelectOpen(false)}
              />
            </View>
          </Card>
        </View>
      </Modal>
      <Modal
        transparent
        visible={requestsOpen}
        onRequestClose={() => setRequestsOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,13,8,0.6)',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <Card>
            <ScrollView
              style={{ maxHeight: 480 }}
              contentContainerStyle={{ gap: 14 }}
            >
              <Txt size={18} bold>
                가격 확인 요청 {requests.length}건
              </Txt>
              {requests.map(request => (
                <View key={request.id} style={{ gap: 8, paddingVertical: 8 }}>
                  <Txt bold>{request.menuName}</Txt>
                  <Txt>
                    등록 {formatMoney(request.currentPrice)} · 확인 요청{' '}
                    {formatMoney(request.reportedPrice)}
                  </Txt>
                  {!!request.note && (
                    <Txt size={12} color={P.muted}>
                      {request.note}
                    </Txt>
                  )}
                  <Button
                    label="가격 수정"
                    variant="outline"
                    disabled={!!busy}
                    onPress={() => {
                      setRequestsOpen(false);
                      navigation.navigate('OwnerMenus', {
                        cafeId: request.cafeId,
                      });
                    }}
                  />
                  <Button
                    label="현재 가격 확인 완료"
                    loading={busy === request.id}
                    disabled={!!busy}
                    onPress={() => resolve(request)}
                  />
                </View>
              ))}
              {!requests.length && (
                <Txt color={P.muted}>처리할 가격 확인 요청이 없습니다.</Txt>
              )}
              {error && <Txt color={P.red}>{error}</Txt>}
              <Button
                label="닫기"
                variant="quiet"
                onPress={() => setRequestsOpen(false)}
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>
      <Modal
        transparent
        visible={statsOpen}
        onRequestClose={() => setStatsOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,13,8,0.6)',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <Card>
            <View style={{ gap: 14 }}>
              <Txt size={18} bold>
                매장 운영 현황
              </Txt>
              <Txt>오늘 주문 {d?.todayOrders ?? 0}건</Txt>
              <Txt>오늘 매출 {formatMoney(d?.todaySales ?? 0)}</Txt>
              <Txt>주문 확인 요청 {d?.waitingOrders ?? 0}건</Txt>
              <Button
                label="주문 접수"
                onPress={() => {
                  setStatsOpen(false);
                  navigation.navigate('OwnerOrders', { cafeId: cafe?.id });
                }}
              />
              <Button
                label="닫기"
                variant="quiet"
                onPress={() => setStatsOpen(false)}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
function Action({
  icon,
  title,
  caption,
  onPress,
}: {
  icon: 'edit' | 'event' | 'review' | 'chart';
  title: string;
  caption: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.grow}>
      <Card style={{ padding: 14, borderRadius: 14 }}>
        <View style={{ gap: 6 }}>
          <View
            style={{
              width: 36,
              height: 36,
              backgroundColor: P.soft,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Asset name={icon} />
          </View>
          <Txt bold>{title}</Txt>
          <Txt size={11} color={P.muted}>
            {caption}
          </Txt>
        </View>
      </Card>
    </Pressable>
  );
}
