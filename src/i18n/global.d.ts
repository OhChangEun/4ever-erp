import type ko from './messages/ko.json';
import type { Locale } from './locale';

// 메시지 키를 타입으로. ko.json 에 없는 키를 t() 에 넘기면 타입 검사에서 걸린다(en.json 은 테스트가 키를 맞춘다)
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof ko;
  }
}
