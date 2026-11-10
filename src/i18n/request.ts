import { getRequestConfig } from 'next-intl/server';
import ko from './messages/ko.json';
import { DEFAULT_LOCALE } from './locale';

/**
 * 서버 쪽 설정. 쿠키를 읽지 않는다(읽으면 모든 페이지가 정적에서 동적 렌더로 바뀐다, 결정 2).
 * 서버 컴포넌트에서 번역이 필요하면 기본 언어로만 그린다. 언어 고르기는 브라우저(IntlProvider)가 한다.
 */
export default getRequestConfig(async () => ({ locale: DEFAULT_LOCALE, messages: ko }));
