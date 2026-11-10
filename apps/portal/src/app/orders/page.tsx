import { requireSession } from '@portal/server/page';
import { ordersFor, type PortalOrder } from '@portal/server/orders';
import Link from 'next/link';
import Header from '../Header';

export const dynamic = 'force-dynamic';

const won = (n: number) => `₩${n.toLocaleString('ko-KR')}`;

function OrderTable({ caption, rows }: { caption: string; rows: PortalOrder[] }) {
  return (
    <section className="card" aria-label={caption} style={{ marginTop: 16 }}>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>{caption}</h2>
      <table aria-label={`${caption} 표`}>
        <thead>
          <tr>
            <th>번호</th>
            <th>품목</th>
            <th>수량</th>
            <th>금액</th>
            <th>납기</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.number}>
              <td>{o.number}</td>
              <td>{o.item}</td>
              <td className="num">{o.quantity.toLocaleString('ko-KR')}</td>
              <td className="num">{won(o.amount)}</td>
              <td>{o.dueDate}</td>
              <td>{o.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** 역할에 맞는 목록. 공급사는 받은 발주, 고객사는 내 주문 */
export default async function Orders() {
  const session = await requireSession('/orders');
  const { purchase, sales } = ordersFor(session.role);
  return (
    <>
      <Header session={session} />
      <main>
        <p>
          <Link href="/">← 포털 홈</Link>
        </p>
        {purchase && <OrderTable caption="받은 발주" rows={purchase} />}
        {sales && <OrderTable caption="내 주문" rows={sales} />}
      </main>
    </>
  );
}
