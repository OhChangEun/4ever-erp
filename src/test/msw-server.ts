import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';

// 브라우저(src/mocks/browser.ts)와 같은 핸들러를 Node 에서 돌린다.
// 테스트별로 덮어쓸 때는 server.use(...) 를 쓰고, afterEach 의 resetHandlers 가 되돌린다.
export const server = setupServer(...handlers);
