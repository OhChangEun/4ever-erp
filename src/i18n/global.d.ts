import type ko from './messages/ko.json';
import type finance from './messages/finance/ko.json';
import type warehouse from './messages/warehouse/ko.json';
import type dashboard from './messages/dashboard/ko.json';
import type purchase from './messages/purchase/ko.json';
import type { Locale } from './locale';

// 메시지 키를 타입으로. ko.json 에 없는 키를 t() 에 넘기면 타입 검사에서 걸린다(en.json 은 테스트가 키를 맞춘다)
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    // 공통 + 도메인 메시지. 도메인 메시지는 그 도메인 레이아웃(DomainMessages)이 합쳐 넘긴다
    Messages: typeof ko & {
      finance: typeof finance;
      warehouse: typeof warehouse;
      dashboard: typeof dashboard;
      purchase: typeof purchase;
    };
  }
}
