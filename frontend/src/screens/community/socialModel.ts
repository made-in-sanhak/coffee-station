export interface MeetupDraft {
  cafeId?: string;
  title: string;
  description: string;
  placeName: string;
  address: string;
  date: string;
  time: string;
  capacity: string;
  category: string;
}

export function makeReviewInput(
  cafeId: string,
  rating: number,
  text: string,
  category: string,
) {
  if (!cafeId.trim()) throw new Error('리뷰를 남길 카페를 선택해 주세요.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('별점을 1개부터 5개까지 선택해 주세요.');
  }
  if (!text.trim()) throw new Error('리뷰 내용을 입력해 주세요.');
  return { cafeId, rating, text: text.trim(), category };
}

export function makeMeetupInput(draft: MeetupDraft, now = Date.now()) {
  if (!draft.title.trim()) throw new Error('모임 제목을 입력해 주세요.');
  if (!draft.description.trim()) throw new Error('모임 소개를 입력해 주세요.');
  if (!draft.placeName.trim()) throw new Error('만날 장소를 입력해 주세요.');
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(draft.date);
  const time = /^(\d{2}):(\d{2})$/.exec(draft.time);
  if (!date || !time) throw new Error('날짜와 시간을 확인해 주세요.');
  const [year, month, day] = date.slice(1).map(Number);
  const [hour, minute] = time.slice(1).map(Number);
  const startsAt = new Date(year, month - 1, day, hour, minute);
  if (
    startsAt.getFullYear() !== year ||
    startsAt.getMonth() !== month - 1 ||
    startsAt.getDate() !== day ||
    startsAt.getHours() !== hour ||
    startsAt.getMinutes() !== minute
  ) {
    throw new Error('유효한 날짜와 시간을 입력해 주세요.');
  }
  if (startsAt.getTime() <= now)
    throw new Error('현재 시간 이후로 모임을 정해 주세요.');
  const capacity = Number(draft.capacity);
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 50) {
    throw new Error('모임 인원은 2명부터 50명까지 입력해 주세요.');
  }
  return {
    title: draft.title.trim(),
    ...(draft.cafeId ? { cafeId: draft.cafeId } : {}),
    description: draft.description.trim(),
    placeName: draft.placeName.trim(),
    address: draft.address.trim(),
    startsAt: startsAt.toISOString(),
    capacity,
    category: draft.category,
  };
}

export function initialMeetupDraft(): MeetupDraft {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    title: '',
    description: '',
    placeName: '',
    address: '',
    date: `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(tomorrow.getDate()).padStart(2, '0')}`,
    time: '14:00',
    capacity: '4',
    category: '카공',
  };
}

export function readableError(error: unknown) {
  return error instanceof Error
    ? error.message
    : '요청을 완료하지 못했습니다. 다시 시도해 주세요.';
}

export function relativeTime(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / 60000),
  );
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / 1440)}일 전`;
}
