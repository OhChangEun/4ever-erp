// Lighthouse CI 보고서(.lighthouseci/reports/manifest.json)를 표로 찍는다. CI 는 job summary 에 붙인다.
// 로그인 뒤 화면이 로그인 화면으로 돌아갔으면(finalUrl 이 /login) 실패로 끝낸다. 쿠키가 안 먹은 측정은 의미가 없다.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const dir = '.lighthouseci/reports';
const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const pct = (n) => (typeof n === 'number' ? Math.round(n * 100) : '-');
const ms = (audit) => (audit ? `${Math.round(audit.numericValue)}ms` : '-');

let wrongPage = false;
const rows = manifest.map((entry) => {
  const report = JSON.parse(readFileSync(entry.jsonPath, 'utf8'));
  const requested = new URL(entry.url).pathname;
  const final = new URL(report.finalDisplayedUrl ?? report.finalUrl).pathname;
  if (requested !== '/login' && final === '/login') wrongPage = true;
  const a = report.audits;
  const s = entry.summary;
  return `| ${requested} | ${final} | ${pct(s.performance)} | ${pct(s.accessibility)} | ${pct(s['best-practices'])} | ${ms(a['largest-contentful-paint'])} | ${ms(a['total-blocking-time'])} | ${a['cumulative-layout-shift']?.numericValue?.toFixed(3) ?? '-'} |`;
});

console.log('### Lighthouse(데스크톱, 1회)');
console.log('| 요청 | 최종 | 성능 | 접근성 | 권장 사항 | LCP | TBT | CLS |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
console.log(rows.join('\n'));
if (wrongPage) {
  console.error('로그인 뒤 화면이 /login 으로 돌아갔다. 세션 쿠키가 전달되지 않았다.');
  process.exit(1);
}
