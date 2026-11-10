/** 로그아웃 뒤와 로그인 실패 때 오는 화면. 세션이 없어도 열린다 */
export default async function SignedOut({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main>
      <div className="card">
        {error ? (
          <p className="error" role="alert">
            {error === 'no_role'
              ? '이 계정은 포털을 쓸 수 없습니다(공급사, 고객사, 사내 관리자만).'
              : `로그인하지 못했습니다(${error}).`}
          </p>
        ) : (
          <p>로그아웃했습니다.</p>
        )}
        {/* API 라우트(Keycloak 으로 302)라 Link 의 미리 받기와 클라이언트 이동이 맞지 않는다. 전체 이동 */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/auth/login">다시 로그인</a>
      </div>
    </main>
  );
}
