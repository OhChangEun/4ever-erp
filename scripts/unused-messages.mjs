// 코드에서 안 쓰는 메시지 키를 찾는다(죽은 코드와 디버그 화면 정리 카드).
//   node scripts/unused-messages.mjs   → 안 쓰는 키, 낡은 접두사, 필요 없는 접두사를 한 줄씩. 하나라도 있으면 종료 코드 1
// 지울 때는 ko 와 en 에서 같이 지운다(키가 같은지는 src/i18n/messages.test.ts 가 본다).
//
// "쓴다"의 판정. 앱 소스(테스트, 목, 생성 타입 제외)의 문자열 리터럴과 템플릿 문자열 머리(첫 `${` 앞 글자)만 본다.
//   1. 전체 키가 리터럴로 있다. 예: t('status.APPROVED')
//   2. 한 파일 안에 앞부분과 뒷부분이 둘 다 리터럴로 있다. 예: useTranslations('sales') 와 t('chart.money')
//   3. 한 파일 안에 (namespace 리터럴 +) 템플릿 머리 + 나머지 리터럴이 있다.
//      예: useTranslations('production'), t(`process.${m.key}`), key: 'startMesSuccess' → production.process.startMesSuccess
//   4. 아래 DYNAMIC_PREFIXES 로 시작한다(키 조각이 서버 값이거나 다른 파일에서 온다).
// shortcut: 2, 3 은 같은 파일에 같은 글자가 우연히 있어도 쓴다고 본다(안 쓰는 키를 놓칠 수는 있어도 쓰는 키를 지우지는 않는다).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MESSAGES = 'src/i18n/messages';

/** 도메인 메시지 폴더 이름과 namespace(DomainMessages 의 namespace prop)가 다른 곳 */
const NAMESPACE_OF_DIR = { profile: 'myProfile' };

const P = 'src/app/(private)/';
const C = 'src/app/components/';

/**
 * 판정 1~3 으로 못 찾는 키의 접두사와 그 키를 만드는 파일.
 * 키 조각이 서버 값(상태 코드, 오류 종류)이거나 다른 파일의 상수(통계 카드 제목, 탭 이름)에서 온다.
 * 파일마다 그 접두사로 키를 만드는 곳이 있어야 한다: 템플릿 머리(`tabs.${x}`)가 접두사 끝과 같고
 * 앞부분(namespace)이 그 파일의 리터럴이거나, 접두사에서 끝 점을 뺀 namespace 리터럴(useTranslations('status') 뒤 t(code)).
 * 화면을 지우면 테스트(src/i18n/unusedMessages.test.ts)가 낡은 접두사로 잡는다. 판정 1~3 으로 찾을 수 있게 되면 필요 없는 접두사로 잡는다.
 * @type {readonly { prefix: string; files: readonly string[] }[]}
 */
export const DYNAMIC_PREFIXES = [
  { prefix: 'status.', files: [`${C}common/StatusLabel.tsx`] }, // 서버 상태 코드
  { prefix: 'errors.', files: ['src/i18n/useErrorMessage.ts'] }, // AppError.kind
  { prefix: 'stats.compare.', files: [`${C}statCard/StatCardList.tsx`] },
  { prefix: 'login.account.', files: ['src/app/(public)/login/page.tsx'] },
  { prefix: 'login.menu.', files: ['src/app/(public)/login/page.tsx'] },
  { prefix: 'dashboard.stats.', files: [`${P}dashboard/DashboardClient.tsx`] },
  { prefix: 'dashboard.workflow.tabs.', files: [`${P}dashboard/components/WorkflowStatus.tsx`] },
  { prefix: 'dashboard.quickActions.items.', files: [`${P}dashboard/components/ActionCard.tsx`] },
  { prefix: 'sales.stats.', files: [`${P}sales/SalesClient.tsx`] },
  { prefix: 'sales.tabs.', files: [`${P}sales/components/tabs/SalesTabs.tsx`] },
  {
    prefix: 'sales.customerList.statusFilter.',
    files: [`${P}sales/components/tabs/SalesCustomerList.tsx`],
  },
  {
    prefix: 'sales.customerList.searchType.',
    files: [`${P}sales/components/tabs/SalesCustomerList.tsx`],
  },
  {
    prefix: 'sales.orderList.searchType.',
    files: [`${P}sales/components/tabs/SalesOrderList.tsx`],
  },
  {
    prefix: 'sales.common.itemColumns.',
    files: [
      `${P}sales/components/modals/SalesOrderDetailModal.tsx`,
      `${P}sales/components/modals/QuoteDetailModal.tsx`,
    ],
  },
  {
    prefix: 'sales.quoteReview.columns.',
    files: [`${P}sales/components/modals/QuoteReviewModal.tsx`],
  },
  { prefix: 'sales.common.uom.', files: [`${P}sales/sales.labels.ts`] }, // 서버 단위 코드
  { prefix: 'lowStock.stats.', files: [`${P}low-stock/page.tsx`] },
  { prefix: 'lowStock.list.statusFilter.', files: [`${P}low-stock/components/LowStockList.tsx`] },
  { prefix: 'hrm.stats.', files: [`${P}hrm/HrmClient.tsx`] },
  {
    prefix: 'hrm.tabs.',
    files: [
      `${P}hrm/HrmClient.tsx`,
      `${P}hrm/components/tabs/mainTab/EmployeeManagement.tsx`,
      `${P}hrm/components/tabs/mainTab/AttendanceManagement.tsx`,
      `${P}hrm/components/tabs/mainTab/TrainingManagement.tsx`,
    ],
  },
  {
    prefix: 'hrm.programs.departmentOptions.',
    files: [`${P}hrm/components/modals/AddProgramModal.tsx`],
  },
  {
    prefix: 'hrm.programs.positionOptions.',
    files: [`${P}hrm/components/modals/AddProgramModal.tsx`],
  },
  { prefix: 'inventory.stats.', files: [`${P}inventory/InventoryClient.tsx`] },
  { prefix: 'inventory.tabs.', files: [`${P}inventory/InventoryClient.tsx`] },
  {
    prefix: 'inventory.list.statusFilter.',
    files: [`${P}inventory/components/tabs/InventoryList.tsx`],
  },
  {
    prefix: 'inventory.list.searchType.',
    files: [`${P}inventory/components/tabs/InventoryList.tsx`],
  },
  { prefix: 'production.stats.', files: [`${P}production/ProductionClient.tsx`] },
  {
    prefix: 'production.tabs.',
    files: [`${P}production/ProductionClient.tsx`, `${P}production/components/tabs/MrpTab.tsx`],
  },
  {
    prefix: 'production.simulation.result.',
    files: [`${P}production/components/modals/SimulationResultModal.tsx`],
  },
  {
    prefix: 'production.costTree.error.',
    files: [`${P}production/components/bom/BomCostTree.tsx`],
  },
  { prefix: 'purchase.stats.', files: [`${P}purchase/PurchaseClient.tsx`] },
  { prefix: 'purchase.tabs.', files: [`${P}purchase/PurchaseClient.tsx`] },
  {
    prefix: 'purchase.requestForm.columns.',
    files: [`${P}purchase/components/modals/PurchaseRequestFormModal.tsx`],
  },
  {
    prefix: 'purchase.requestDetail.columns.',
    files: [`${P}purchase/components/modals/PurchaseRequestDetailModal.tsx`],
  },
  { prefix: 'purchase.common.supplierCategory.', files: [`${P}purchase/supplierCategory.ts`] }, // 서버 분류 코드
  {
    prefix: 'finance.overview.aging.buckets.',
    files: [`${P}finance/components/overview/FinanceOverview.tsx`],
  },
  { prefix: 'finance.stats.', files: [`${P}finance/FinanceClient.tsx`] },
  { prefix: 'finance.tabs.', files: [`${P}finance/components/tabs/FinanceTabs.tsx`] },
  {
    prefix: 'finance.invoiceType.',
    files: [`${P}finance/components/modals/InvoiceDetailModal.tsx`],
  },
  {
    prefix: 'finance.invoiceDetail.columns.',
    files: [`${P}finance/components/modals/InvoiceDetailModal.tsx`],
  },
  {
    prefix: 'finance.invoiceList.statusFilter.',
    files: [`${P}finance/components/tabs/InvoiceList.tsx`],
  },
  { prefix: 'warehouse.stats.', files: [`${P}warehouse/page.tsx`] },
  {
    prefix: 'warehouse.band.',
    files: [
      `${P}warehouse/components/warehouseVisualizer/components/WarehouseStockPanel.tsx`,
      `${P}warehouse/components/warehouseVisualizer/components/WarehouseVisualizer.tsx`,
    ],
  },
];

/**
 * 메시지 트리의 잎 키(점으로 이은 전체 경로)
 * @param {object} tree @param {string} prefix @returns {string[]}
 */
const leafKeys = (tree, prefix) =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? leafKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

/**
 * 공통(ko.json 의 최상위가 namespace)과 도메인(폴더 이름이 namespace) 메시지의 전체 키. ko 만 본다
 * @returns {string[]}
 */
export const messageKeys = () => {
  const keys = leafKeys(readJson(`${MESSAGES}/ko.json`), '');
  for (const entry of readdirSync(join(ROOT, MESSAGES), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const namespace = NAMESPACE_OF_DIR[entry.name] ?? entry.name;
    keys.push(...leafKeys(readJson(`${MESSAGES}/${entry.name}/ko.json`), `${namespace}.`));
  }
  return keys;
};

const isAppSource = (path) =>
  /\.(ts|tsx)$/.test(path) &&
  !/\.test\.tsx?$/.test(path) &&
  !path.startsWith('src/mocks/') &&
  !path.startsWith('src/test/') &&
  path !== 'src/lib/api/openapi.gen.ts';

/**
 * 파일 하나의 문자열 리터럴(끼운 값이 없는 템플릿 포함)과 템플릿 머리(첫 `${` 앞, 비어 있지 않은 것)
 * @param {string} path @param {string} text
 * @returns {{ literals: Set<string>; heads: Set<string> }}
 */
export const scanSource = (path, text) => {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  const literals = new Set();
  const heads = new Set();
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      literals.add(node.text);
    if (ts.isTemplateExpression(node) && node.head.text) heads.add(node.head.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { literals, heads };
};

/** 앱 소스 파일 경로(저장소 기준, `/` 구분) → 스캔 결과 */
const sourceFiles = () =>
  new Map(
    readdirSync(join(ROOT, 'src'), { recursive: true })
      .map((name) =>
        relative(ROOT, join(ROOT, 'src', String(name)))
          .split('\\')
          .join('/'),
      )
      .filter(isAppSource)
      .map((path) => [path, scanSource(path, readFileSync(join(ROOT, path), 'utf8'))]),
  );

/** 키를 점 자리마다 둘로 나눈 [앞, 뒤] 목록 */
const splitsOf = (key) => {
  const parts = key.split('.');
  return parts
    .slice(1)
    .map((_, i) => [parts.slice(0, i + 1).join('.'), parts.slice(i + 1).join('.')]);
};

/** 판정 1~3 중 하나라도 맞는 파일이 있나 */
const usedIn = (key, { literals, heads }) =>
  literals.has(key) ||
  splitsOf(key).some(([head, rest]) => literals.has(head) && literals.has(rest)) ||
  [...heads].some((templateHead) => {
    // key = [namespace + '.'] + templateHead + rest
    for (let at = key.indexOf(templateHead); at !== -1; at = key.indexOf(templateHead, at + 1)) {
      const before = key.slice(0, at);
      const rest = key.slice(at + templateHead.length);
      const namespaceOk =
        before === '' || (before.endsWith('.') && literals.has(before.slice(0, -1)));
      if (namespaceOk && literals.has(rest)) return true;
    }
    return false;
  });

/**
 * 안 쓰는 키. 판정은 파일 머리말 1~4.
 * @param {string[]} keys @param {{ literals: Set<string>; heads: Set<string> }[]} files
 * @param {readonly string[]} prefixes
 */
export const unusedKeys = (keys, files, prefixes) =>
  keys
    .filter((key) => !prefixes.some((prefix) => key.startsWith(prefix)))
    .filter((key) => !files.some((file) => usedIn(key, file)))
    .sort();

/** 파일이 그 접두사로 키를 만드나(DYNAMIC_PREFIXES 주석의 규칙) */
const makesPrefix = (prefix, { literals, heads }) =>
  literals.has(prefix.slice(0, -1)) ||
  [...heads].some((templateHead) => {
    if (!prefix.endsWith(templateHead)) return false;
    const before = prefix.slice(0, prefix.length - templateHead.length);
    return before === '' || (before.endsWith('.') && literals.has(before.slice(0, -1)));
  });

/**
 * 낡은 접두사: 적힌 파일이 없거나 그 파일에 그 접두사로 키를 만드는 곳이 없다
 * @param {readonly { prefix: string; files: readonly string[] }[]} entries
 * @param {Map<string, { literals: Set<string>; heads: Set<string> }>} sources
 * @returns {string[]}
 */
export const stalePrefixes = (entries, sources) =>
  entries.flatMap(({ prefix, files }) =>
    files.flatMap((file) => {
      const scanned = sources.get(file);
      if (!scanned) return [`${prefix}: ${file} 가 없다`];
      return makesPrefix(prefix, scanned)
        ? []
        : [`${prefix}: ${file} 에 이 접두사로 키를 만드는 곳이 없다`];
    }),
  );

const prefixesOf = (entries) => entries.map(({ prefix }) => prefix);

export const findUnusedMessages = () =>
  unusedKeys(messageKeys(), [...sourceFiles().values()], prefixesOf(DYNAMIC_PREFIXES));

export const findStalePrefixes = () =>
  stalePrefixes(
    DYNAMIC_PREFIXES,
    new Map(
      DYNAMIC_PREFIXES.flatMap(({ files }) => files)
        .filter((file) => existsSync(join(ROOT, file)))
        .map((file) => [file, scanSource(file, readFileSync(join(ROOT, file), 'utf8'))]),
    ),
  );

/** 필요 없는 접두사: 빼도 그 아래 키가 하나도 안 쓴다고 잡히지 않는다(판정 1~3 으로 다 찾는다) */
export const findUnneededPrefixes = () => {
  const keys = messageKeys();
  const files = [...sourceFiles().values()];
  const all = prefixesOf(DYNAMIC_PREFIXES);
  return all.filter((prefix) => {
    const under = keys.filter((key) => key.startsWith(prefix));
    const others = all.filter((other) => other !== prefix);
    return unusedKeys(under, files, others).length === 0;
  });
};

// CLI 로 불렸을 때만 실행
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const unused = findUnusedMessages();
  const stale = findStalePrefixes();
  const unneeded = findUnneededPrefixes();
  for (const key of unused) console.log(key);
  for (const line of stale) console.log(`낡은 접두사 ${line}`);
  for (const prefix of unneeded) console.log(`필요 없는 접두사 ${prefix}`);
  console.error(
    `안 쓰는 메시지 키 ${unused.length}개, 낡은 접두사 ${stale.length}개, 필요 없는 접두사 ${unneeded.length}개`,
  );
  process.exit(unused.length + stale.length + unneeded.length ? 1 : 0);
}
