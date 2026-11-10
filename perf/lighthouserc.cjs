/**
 * Lighthouse CI(CI 고도화 2). 로그인 화면과 로그인 뒤 화면 3개를 데스크톱 기준으로 잰다.
 * 로그인 뒤 화면은 perf/lighthouse.sh 가 데모 로그인으로 받은 세션 쿠키를 LH_COOKIE 로 넘긴다.
 * 보고서는 밖으로 올리지 않는다(temporary-public-storage 는 공개 URL 이다). 파일로만 남기고 CI 가 artifact 로 올린다.
 */
const base = process.env.LH_BASE_URL || 'http://localhost:3200';
const cookie = process.env.LH_COOKIE;

module.exports = {
  ci: {
    collect: {
      url: ['/login', '/dashboard', '/inventory', '/finance'].map((path) => base + path),
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        chromeFlags: '--headless=new --no-sandbox',
        ...(cookie ? { extraHeaders: { Cookie: cookie } } : {}),
      },
    },
    assert: {
      assertions: {
        // 접근성은 axe e2e 로 critical, serious 0 을 지키고 있다. 점수로도 떨어지면 막는다
        'categories:accessibility': ['error', { minScore: 0.9 }],
        // 성능 점수는 러너마다 흔들린다. 경고로만 두고 숫자는 job summary 로 본다
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
};
