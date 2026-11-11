import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { api, useResource } from '../../app/api';
import { Button, Card, Empty, Field, Screen, formatMoney } from '../../app/ui';
import type {
  Deal,
  DealInput,
  Menu,
  MenuInput,
  OwnerDashboard,
} from '../../app/domain';
import type { RootStackScreenProps } from '../../navigation/types';
import { Asset, Badge, Line, P, Row, Txt, s } from './ownerUi';

type Draft = MenuInput & { id?: string };
const blank: Draft = {
  name: '',
  size: 'Regular',
  temperature: 'ICE',
  price: 0,
  caffeineMg: null,
  available: true,
};
export default function OwnerMenusScreen({
  navigation,
  route,
}: RootStackScreenProps<'OwnerMenus'>) {
  const dashboard = useResource<OwnerDashboard>('/api/owner/dashboard', {
    cafeId: route.params?.cafeId,
  });
  const cafeId = route.params?.cafeId ?? dashboard.data?.cafes[0]?.id;
  const menus = useResource<Menu[]>(
    `/api/cafes/${encodeURIComponent(cafeId ?? '')}/menus`,
    undefined,
    !!cafeId,
  );
  const deals = useResource<Deal[]>('/api/owner/deals');
  const [search, setSearch] = useState(''),
    [changes, setChanges] = useState<Record<string, Partial<MenuInput>>>({});
  const [editor, setEditor] = useState<Draft | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const [dealEditor, setDealEditor] = useState<{
    id?: string;
    menuId: string;
    price: string;
    stock: string;
    startsAt: string;
    endsAt: string;
    active: boolean;
  } | null>(null);
  const eventEntry = useRef<string | null>(null);
  useEffect(() => {
    if (route.params?.mode !== 'event' || !cafeId || !menus.data) return;
    const entry = `${cafeId}:event`;
    if (eventEntry.current === entry) return;
    eventEntry.current = entry;
    const first = menus.data[0];
    if (!first) {
      setError('메뉴를 먼저 등록해 주세요.');
      return;
    }
    setDealEditor({
      menuId: first.id,
      price: String(first.price),
      stock: '1',
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 15 * 60000).toISOString(),
      active: true,
    });
  }, [route.params?.mode, cafeId, menus.data]);
  const count = Object.keys(changes).length;
  function refresh() {
    menus.reload();
    deals.reload();
    dashboard.reload();
  }
  async function saveChanges() {
    setBusy(true);
    setError(null);
    try {
      for (const [id, value] of Object.entries(changes)) {
        if (
          value.price !== undefined &&
          (!Number.isInteger(value.price) || value.price < 1)
        )
          throw new Error('가격은 1원 이상의 정수로 입력해 주세요.');
        const original = menus.data?.find(menu => menu.id === id);
        if (!original)
          throw new Error('메뉴 정보가 변경되었습니다. 다시 불러와 주세요.');
        const input: MenuInput = {
          name: original.name,
          category: original.category,
          size: original.size,
          temperature: original.temperature,
          price: original.price,
          caffeineMg: original.caffeineMg,
          available: original.available,
          ...value,
        };
        await api.patch<Menu>(
          `/api/owner/menus/${encodeURIComponent(id)}`,
          input,
        );
        setChanges(old => {
          const next = { ...old };
          delete next[id];
          return next;
        });
      }
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }
  async function saveMenu() {
    if (!editor || !cafeId) return;
    setBusy(true);
    setError(null);
    try {
      if (!editor.name.trim()) throw new Error('메뉴 이름을 입력해 주세요.');
      if (!Number.isInteger(editor.price) || editor.price < 1)
        throw new Error('가격은 1원 이상의 정수로 입력해 주세요.');
      const { id, ...data } = editor;
      if (id)
        await api.patch<Menu>(
          `/api/owner/menus/${encodeURIComponent(id)}`,
          data,
        );
      else
        await api.post<Menu>(
          `/api/owner/cafes/${encodeURIComponent(cafeId)}/menus`,
          data,
        );
      setEditor(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '메뉴를 저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }
  async function removeMenu() {
    if (!editor?.id) return;
    setBusy(true);
    try {
      await api.delete(`/api/owner/menus/${encodeURIComponent(editor.id)}`);
      setEditor(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }
  function openDeal(deal?: Deal) {
    const first = menus.data?.[0];
    if (!first) {
      setError('메뉴를 먼저 등록해 주세요.');
      return;
    }
    setError(null);
    setDealEditor({
      id: deal?.id,
      menuId: deal?.menuId ?? first.id,
      price: String(deal?.price ?? first.price),
      stock: String(deal?.stock ?? 1),
      startsAt: deal?.startsAt ?? new Date().toISOString(),
      endsAt: deal?.endsAt ?? new Date(Date.now() + 15 * 60000).toISOString(),
      active: deal?.active ?? true,
    });
  }
  async function saveDeal() {
    if (!dealEditor || !cafeId) return;
    setBusy(true);
    setError(null);
    try {
      const price = Number(dealEditor.price),
        stock = Number(dealEditor.stock);
      if (!Number.isInteger(price) || price < 1)
        throw new Error('판매 가격을 확인해 주세요.');
      if (!Number.isInteger(stock) || stock < 0)
        throw new Error('재고는 0 이상의 정수로 입력해 주세요.');
      if (
        !Number.isFinite(Date.parse(dealEditor.startsAt)) ||
        !Number.isFinite(Date.parse(dealEditor.endsAt)) ||
        Date.parse(dealEditor.endsAt) <= Date.parse(dealEditor.startsAt)
      )
        throw new Error('이벤트 시작·종료 시간을 확인해 주세요.');
      const data: DealInput = {
        cafeId,
        menuId: dealEditor.menuId,
        price,
        stock,
        startsAt: new Date(dealEditor.startsAt).toISOString(),
        endsAt: new Date(dealEditor.endsAt).toISOString(),
        active: dealEditor.active,
      };
      if (dealEditor.id)
        await api.patch<Deal>(
          `/api/owner/deals/${encodeURIComponent(dealEditor.id)}`,
          data,
        );
      else await api.post<Deal>('/api/owner/deals', data);
      setDealEditor(null);
      refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '이벤트를 저장하지 못했습니다.',
      );
    } finally {
      setBusy(false);
    }
  }
  const activeDeals = deals.data?.filter(d => d.cafeId === cafeId) ?? [];
  return (
    <Screen
      navigation={navigation}
      title="메뉴·가격 관리"
      contentStyle={{ paddingTop: 8, flexGrow: 1 }}
    >
      <Row
        style={{
          backgroundColor: P.soft,
          padding: 12,
          borderRadius: 12,
          alignItems: 'flex-start',
        }}
      >
        <Asset name="shield" />
        <Txt size={12} color={P.green} style={s.grow}>
          수정한 가격은 "점주 확인" 표시와 확인일이 함께 노출돼요.
        </Txt>
      </Row>
      {(dashboard.error || menus.error) && (
        <Empty message={dashboard.error ?? menus.error!} onRetry={refresh} />
      )}
      <Row>
        <Row style={styles.search}>
          <Asset name="search" />
          <TextInput
            accessibilityLabel="메뉴 검색"
            placeholder="메뉴 검색"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={P.muted}
            style={{ flex: 1, fontSize: 14, color: P.text, padding: 0 }}
          />
        </Row>
        <Pressable
          accessibilityRole="button"
          disabled={!cafeId}
          onPress={() => {
            setError(null);
            setEditor({ ...blank });
          }}
          style={styles.add}
        >
          <Asset name="plus" />
          <Txt size={13} bold color={P.green}>
            메뉴 추가
          </Txt>
        </Pressable>
      </Row>
      <Card>
        <View style={{ gap: 12 }}>
          {menus.data
            ?.filter(m => m.name.includes(search))
            .map((menu, index) => {
              const change = changes[menu.id],
                m = { ...menu, ...change };
              return (
                <React.Fragment key={menu.id}>
                  {index > 0 && <Line />}
                  <Row style={{ gap: 10 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${menu.name} 상세 수정`}
                      onPress={() => {
                        setError(null);
                        setEditor(m);
                      }}
                      style={s.grow}
                    >
                      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                        <Txt
                          bold
                          color={m.available === false ? P.muted : P.text}
                        >
                          {m.name}
                        </Txt>
                        {change ? (
                          <Badge tone="red">변경됨</Badge>
                        ) : m.available === false ? (
                          <Badge tone="gray">품절</Badge>
                        ) : null}
                      </Row>
                      <Txt size={11} color={P.muted}>
                        {m.size}
                        {change?.price !== undefined
                          ? ` · 이전 ${formatMoney(menu.price)}`
                          : ''}
                      </Txt>
                    </Pressable>
                    <View
                      style={[
                        styles.price,
                        change?.price !== undefined && {
                          backgroundColor: P.soft,
                          borderColor: P.green,
                        },
                      ]}
                    >
                      <TextInput
                        accessibilityLabel={`${menu.name} 가격`}
                        keyboardType="number-pad"
                        value={String(m.price)}
                        onChangeText={value =>
                          setChanges(old => ({
                            ...old,
                            [menu.id]: {
                              ...old[menu.id],
                              price: Number(value.replace(/[^0-9]/g, '')),
                            },
                          }))
                        }
                        style={{
                          textAlign: 'right',
                          fontSize: 14,
                          fontWeight: '700',
                          color: change?.price !== undefined ? P.green : P.text,
                          flex: 1,
                          padding: 0,
                        }}
                      />
                      <Txt bold>원</Txt>
                    </View>
                    <Pressable
                      accessibilityRole="switch"
                      accessibilityLabel={`${menu.name} 판매`}
                      accessibilityState={{ checked: m.available !== false }}
                      onPress={() =>
                        setChanges(old => ({
                          ...old,
                          [menu.id]: {
                            ...old[menu.id],
                            available: m.available === false,
                          },
                        }))
                      }
                    >
                      <Asset
                        name={m.available === false ? 'toggleOff' : 'toggleOn'}
                      />
                    </Pressable>
                  </Row>
                </React.Fragment>
              );
            })}
          {menus.data?.length === 0 && (
            <Txt color={P.muted}>등록된 메뉴가 없습니다.</Txt>
          )}
        </View>
      </Card>
      <Card>
        <Row style={{ gap: 10 }}>
          <Asset name="megaphone" />
          <View style={s.grow}>
            <Txt bold>
              진행 중인 이벤트{' '}
              {
                activeDeals.filter(
                  d => d.active && Date.parse(d.endsAt) > Date.now(),
                ).length
              }
              개
            </Txt>
            <Txt size={12} color={P.muted}>
              {activeDeals[0]
                ? `${activeDeals[0].menuName} · 재고 ${activeDeals[0].stock}개`
                : '타임딜을 등록해 보세요'}
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => openDeal(activeDeals[0])}
            style={styles.small}
          >
            <Txt size={13} bold color={P.green}>
              {activeDeals.length ? '수정' : '등록'}
            </Txt>
          </Pressable>
        </Row>
      </Card>
      {activeDeals.slice(1).map(d => (
        <Button
          key={d.id}
          label={`${d.menuName} · 재고 ${d.stock}개 수정`}
          variant="outline"
          onPress={() => openDeal(d)}
        />
      ))}
      {!!activeDeals.length && (
        <Button
          label="새 타임딜 등록"
          variant="quiet"
          onPress={() => openDeal()}
        />
      )}
      {error && !editor && !dealEditor && (
        <Txt size={12} color={P.red}>
          {error}
        </Txt>
      )}
      <View style={{ flex: 1, minHeight: 30 }} />
      <Button
        label={`변경 사항 저장 (${count})`}
        loading={busy}
        disabled={!count}
        onPress={() => {
          void saveChanges();
        }}
      />
      <Modal
        transparent
        visible={!!editor}
        onRequestClose={() => setEditor(null)}
      >
        <View style={styles.dim}>
          <View style={styles.sheet}>
            <ScrollView>
              <View style={{ gap: 14 }}>
                <Txt size={19} bold>
                  {editor?.id ? '메뉴 수정' : '메뉴 추가'}
                </Txt>
                <Field
                  label="메뉴 이름"
                  value={editor?.name ?? ''}
                  onChangeText={name =>
                    setEditor(v => (v ? { ...v, name } : v))
                  }
                />
                <Field
                  label="크기"
                  value={editor?.size ?? ''}
                  onChangeText={size =>
                    setEditor(v => (v ? { ...v, size } : v))
                  }
                />
                <Field
                  label="온도"
                  value={editor?.temperature ?? ''}
                  onChangeText={temperature =>
                    setEditor(v => (v ? { ...v, temperature } : v))
                  }
                />
                <Field
                  label="가격 (원)"
                  keyboardType="number-pad"
                  value={String(editor?.price ?? 0)}
                  onChangeText={price =>
                    setEditor(v =>
                      v
                        ? { ...v, price: Number(price.replace(/[^0-9]/g, '')) }
                        : v,
                    )
                  }
                />
                <Field
                  label="카페인 (mg, 선택)"
                  keyboardType="number-pad"
                  value={
                    editor?.caffeineMg == null ? '' : String(editor.caffeineMg)
                  }
                  onChangeText={caffeine =>
                    setEditor(v =>
                      v
                        ? {
                            ...v,
                            caffeineMg: caffeine ? Number(caffeine) : null,
                          }
                        : v,
                    )
                  }
                />
                {error && <Txt color={P.red}>{error}</Txt>}
                <Button
                  label="메뉴 저장"
                  loading={busy}
                  onPress={() => {
                    void saveMenu();
                  }}
                />
                {editor?.id && (
                  <Button
                    label="메뉴 삭제"
                    variant="outline"
                    disabled={busy}
                    onPress={() =>
                      Alert.alert('메뉴 삭제', '이 메뉴를 삭제할까요?', [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '삭제',
                          style: 'destructive',
                          onPress: () => {
                            void removeMenu();
                          },
                        },
                      ])
                    }
                  />
                )}
                <Button
                  label="닫기"
                  variant="quiet"
                  onPress={() => setEditor(null)}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        visible={!!dealEditor}
        onRequestClose={() => setDealEditor(null)}
      >
        <View style={styles.dim}>
          <View style={styles.sheet}>
            <ScrollView>
              <View style={{ gap: 14 }}>
                <Txt size={19} bold>
                  타임딜 · 재고 관리
                </Txt>
                <Txt size={12} color={P.muted}>
                  대상 메뉴
                </Txt>
                <Row style={{ flexWrap: 'wrap' }}>
                  {menus.data?.map(m => (
                    <Pressable
                      key={m.id}
                      disabled={!!dealEditor?.id}
                      onPress={() =>
                        setDealEditor(v => (v ? { ...v, menuId: m.id } : v))
                      }
                      style={[
                        styles.small,
                        {
                          backgroundColor:
                            dealEditor?.menuId === m.id ? P.soft : P.white,
                        },
                      ]}
                    >
                      <Txt size={12}>{m.name}</Txt>
                    </Pressable>
                  ))}
                </Row>
                <Field
                  label="판매 가격 (원)"
                  keyboardType="number-pad"
                  value={dealEditor?.price ?? ''}
                  onChangeText={price =>
                    setDealEditor(v => (v ? { ...v, price } : v))
                  }
                />
                <Field
                  label="남은 재고"
                  keyboardType="number-pad"
                  value={dealEditor?.stock ?? ''}
                  onChangeText={stock =>
                    setDealEditor(v => (v ? { ...v, stock } : v))
                  }
                />
                <Field
                  label="시작 시간 (날짜·시간)"
                  value={dealEditor?.startsAt ?? ''}
                  onChangeText={startsAt =>
                    setDealEditor(v => (v ? { ...v, startsAt } : v))
                  }
                />
                <Field
                  label="종료 시간 (날짜·시간)"
                  value={dealEditor?.endsAt ?? ''}
                  onChangeText={endsAt =>
                    setDealEditor(v => (v ? { ...v, endsAt } : v))
                  }
                />
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: dealEditor?.active }}
                  onPress={() =>
                    setDealEditor(v => (v ? { ...v, active: !v.active } : v))
                  }
                >
                  <Row>
                    <Txt>이벤트 공개</Txt>
                    <Asset
                      name={dealEditor?.active ? 'toggleOn' : 'toggleOff'}
                    />
                  </Row>
                </Pressable>
                {error && <Txt color={P.red}>{error}</Txt>}
                <Button
                  label="이벤트 저장"
                  loading={busy}
                  onPress={() => {
                    void saveDeal();
                  }}
                />
                <Button
                  label="닫기"
                  variant="quiet"
                  onPress={() => setDealEditor(null)}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  search: {
    flex: 1,
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  add: {
    backgroundColor: P.soft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  price: {
    width: 96,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  small: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dim: {
    flex: 1,
    backgroundColor: 'rgba(20,13,8,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: P.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
});
