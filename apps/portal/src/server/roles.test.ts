import { describe, expect, it } from 'vitest';
import { pickPortalRole, safeReturnTo } from './roles';

describe('포털 역할과 returnTo', () => {
  it('표 순서로 첫 역할, 포털 밖 역할만 있으면 null', () => {
    expect(pickPortalRole(['offline_access', 'SUPPLIER_ADMIN'])).toBe('SUPPLIER_ADMIN');
    expect(pickPortalRole(['CUSTOMER_ADMIN', 'ALL_ADMIN'])).toBe('ALL_ADMIN');
    expect(pickPortalRole(['FCM_ADMIN'])).toBeNull();
  });

  it.each([
    ['/orders', '/orders'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['/\t/evil.example', '/'],
    ['/\n/evil.example', '/'],
    ['/orders?tab=po#top', '/orders?tab=po#top'],
    ['/a/..//evil.example', '/'],
    ['/a/../orders', '/orders'],
    ['https://evil.example', '/'],
    [null, '/'],
  ])('%s → %s', (input, out) => expect(safeReturnTo(input)).toBe(out));
});
