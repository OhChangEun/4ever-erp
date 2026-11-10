import { requireSession } from '@portal/server/page';
import { ROLE_LABEL } from '@portal/server/roles';
import Link from 'next/link';
import Header from './Header';

export const dynamic = 'force-dynamic';

/** 포털 홈. 로그인한 사람과 역할, 볼 수 있는 화면 */
export default async function Home() {
  const session = await requireSession('/');
  return (
    <>
      <Header session={session} />
      <main>
        <h1>안녕하세요, {session.name ?? session.sub}님</h1>
        <p className="muted">
          {ROLE_LABEL[session.role]} 계정으로 들어왔습니다. ERP 와 같은 회사 계정(Keycloak)이라 ERP
          에 로그인해 있으면 이 포털은 다시 묻지 않습니다.
        </p>
        <div className="card">
          <Link href="/orders">
            {session.role === 'SUPPLIER_ADMIN'
              ? '받은 발주 보기'
              : session.role === 'CUSTOMER_ADMIN'
                ? '내 주문 보기'
                : '발주와 주문 보기'}
          </Link>
        </div>
      </main>
    </>
  );
}
