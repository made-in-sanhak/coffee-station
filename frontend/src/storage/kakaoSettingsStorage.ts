import type { KakaoSettings } from '../store/kakaoSettingsStore';

type Writer = (settings: KakaoSettings) => Promise<void>;
let writer: Writer | null = null;

export function setKakaoSettingsWriter(next: Writer) {
  writer = next;
  return () => {
    if (writer === next) writer = null;
  };
}

export function persistKakaoSettings(settings: KakaoSettings) {
  if (!writer)
    return Promise.reject(
      new Error('설정 저장소를 준비하지 못했습니다. 앱을 다시 실행해 주세요.'),
    );
  return writer(settings);
}

// An inline document with a separate origin; it never contacts a server.
export const KAKAO_STORAGE_ORIGIN = 'https://coffee-settings.invalid';
export const KAKAO_STORAGE_HTML = `<!doctype html><html><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'">
</head><body><script>
(function () {
  var storageKey = 'coffee.kakao.settings.v1';
  function send(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
  window.coffeeSettings = {
    write: function (id, settings) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(settings));
        send({type: 'saved', id: id});
      } catch (_) { send({type: 'writeError', id: id}); }
    }
  };
  try {
    var raw = localStorage.getItem(storageKey), value = null;
    try { value = raw ? JSON.parse(raw) : null; } catch (_) {}
    send({type: 'loaded', value: value});
  } catch (_) { send({type: 'readError'}); }
})();
</script></body></html>`;

export function createKakaoStorageBridge(
  execute: (script: string) => void,
  onLoaded: (value: unknown) => void,
  onError: (message: string) => void,
) {
  let ready = false;
  let sequence = 0;
  const pending = new Map<
    number,
    {
      resolve: () => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  const saveError = () =>
    new Error('설정을 저장하지 못했습니다. 다시 시도해 주세요.');
  const failPending = () => {
    pending.forEach(item => {
      clearTimeout(item.timer);
      item.reject(saveError());
    });
    pending.clear();
  };
  return {
    onMessage(data: string) {
      let message: Record<string, unknown>;
      try {
        const value = JSON.parse(data);
        if (!value || typeof value !== 'object') return;
        message = value;
      } catch {
        return;
      }
      if (message.type === 'loaded') {
        ready = true;
        onLoaded(message.value);
      } else if (message.type === 'readError') {
        ready = false;
        failPending();
        onError('설정을 불러오지 못했습니다. 앱을 다시 실행해 주세요.');
      } else if (typeof message.id === 'number') {
        const item = pending.get(message.id);
        if (
          !item ||
          (message.type !== 'saved' && message.type !== 'writeError')
        )
          return;
        clearTimeout(item.timer);
        pending.delete(message.id);
        if (message.type === 'saved') item.resolve();
        else item.reject(saveError());
      }
    },
    write(settings: KakaoSettings): Promise<void> {
      if (!ready) return Promise.reject(saveError());
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(saveError());
        }, 8000);
        pending.set(id, { resolve, reject, timer });
        try {
          execute(
            `window.coffeeSettings.write(${id}, ${JSON.stringify(
              settings,
            )}); true;`,
          );
        } catch {
          clearTimeout(timer);
          pending.delete(id);
          reject(saveError());
        }
      });
    },
    dispose() {
      ready = false;
      failPending();
    },
  };
}
