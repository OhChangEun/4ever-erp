import type ko from './messages/ko.json';
import type finance from './messages/finance/ko.json';
import type warehouse from './messages/warehouse/ko.json';
import type dashboard from './messages/dashboard/ko.json';
import type purchase from './messages/purchase/ko.json';
import type inventory from './messages/inventory/ko.json';
import type lowStock from './messages/lowStock/ko.json';
import type hrm from './messages/hrm/ko.json';
import type sales from './messages/sales/ko.json';
import type production from './messages/production/ko.json';
import type myProfile from './messages/profile/ko.json';
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
      inventory: typeof inventory;
      lowStock: typeof lowStock;
      hrm: typeof hrm;
      sales: typeof sales;
      production: typeof production;
      // 공통에 헤더 프로필 메뉴용 'profile' 이 있어 겹치지 않게 다른 이름(i18n 11)
      myProfile: typeof myProfile;
    };
  }
}
