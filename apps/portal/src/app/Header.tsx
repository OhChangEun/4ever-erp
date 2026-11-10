import type { StoredSession } from '@everp/auth';
import { ROLE_LABEL, type PortalRole } from '@portal/server/roles';
import Link from 'next/link';
import LogoutButton from './LogoutButton';

export default function Header({ session }: { session: StoredSession<PortalRole> }) {
  return (
    <header>
      <strong>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
          EverP 포털
        </Link>
      </strong>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="muted" data-testid="who">
          {session.name ?? session.sub} ({ROLE_LABEL[session.role]})
        </span>
        <LogoutButton />
      </span>
    </header>
  );
}
