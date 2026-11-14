/**
 * EverP 로컬 ESLint 플러그인(커스텀 ESLint 규칙 카드). 문서 규칙을 린트로 지킨다.
 * 모노레포 카드에서 packages/eslint-plugin 으로 옮긴다.
 *
 * 1. domain-boundary       다른 도메인은 그 도메인의 공개 입구(index.ts, ui.ts, messages.ts)로만 가져온다
 * 2. no-component-mutation useMutation 은 *.mutations.ts 와 src/lib/query 에서만
 * 3. no-arbitrary-color    className 의 임의 색(bg-[#...]) 금지. 색은 디자인 토큰으로
 */
import path from 'node:path';

const DOMAIN_ROOT = 'src/app/(private)/';
const ALIAS_ROOT = '@/app/(private)/';

const toPosix = (file) => file.split(path.sep).join('/');

/** 파일이 속한 도메인. 도메인 밖이면 null */
const domainOf = (posixPath) => {
  const i = posixPath.indexOf(DOMAIN_ROOT);
  if (i === -1) return null;
  const [domain, ...rest] = posixPath.slice(i + DOMAIN_ROOT.length).split('/');
  // (private)/layout.tsx 처럼 도메인 폴더 밖의 파일
  return rest.length === 0 ? null : domain;
};

/** import 경로가 가리키는 도메인과 그 안의 나머지 경로 */
const targetOf = (spec, filename) => {
  let posix = null;
  if (spec.startsWith(ALIAS_ROOT)) posix = `${DOMAIN_ROOT}${spec.slice(ALIAS_ROOT.length)}`;
  else if (spec.startsWith('.')) posix = toPosix(path.resolve(path.dirname(filename), spec));
  if (!posix) return null;
  const i = posix.indexOf(DOMAIN_ROOT);
  if (i === -1) return null;
  const [domain, ...rest] = posix.slice(i + DOMAIN_ROOT.length).split('/');
  if (!domain || domain.startsWith('_')) return null; // _RouteProviders 같은 라우트 공용
  return { domain, rest: rest.join('/') };
};

// 공통 코드. 도메인을 가져오면 import 방향이 뒤집힌다(ARCHITECTURE 6절)
const SHARED = [
  'src/lib/',
  'src/app/components/',
  'src/app/hooks/',
  'src/app/utils/',
  'src/store/',
  'src/server/',
  'packages/', // 워크스페이스 패키지(모노레포 2). 앱 도메인을 가져오지 않는다
];
const isTest = (posix) => /\.test\.[jt]sx?$/.test(posix);

// 도메인의 공개 입구 세 개. index(키, api, 타입, 상수), ui(화면 컴포넌트), messages(메시지 감싸개).
// 나눈 이유: 키만 쓰는 도메인이 모달과 그 의존까지 받지 않게(창고 첫 로드 +21.7KB 였음).
// messages 는 메시지 JSON 을 정적으로 가져와서 index 에 두면 키만 쓰는 화면에도 딸려 온다(구매 첫 로드 +5KB 였음)
const PUBLIC_ENTRIES = new Set(['', 'index', 'ui', 'messages']);

/** @type {import('eslint').Rule.RuleModule} */
const domainBoundary = {
  meta: {
    type: 'problem',
    docs: { description: '다른 도메인은 공개 API(index.ts)로만 가져온다' },
    messages: {
      deepImport:
        "다른 도메인({{domain}})의 깊은 경로를 가져오지 않는다. '@/app/(private)/{{domain}}'(키, api, 타입) 이나 '@/app/(private)/{{domain}}/ui'(화면 컴포넌트), '@/app/(private)/{{domain}}/messages'(메시지 감싸개)에서 가져오고, 없으면 거기에 내보낸다.",
      sharedImportsDomain:
        '공통 코드는 도메인({{domain}})을 가져오지 않는다. 도메인이 공통 코드를 가져오는 방향만 허용한다.',
    },
    schema: [],
  },
  create(context) {
    const filename = toPosix(context.filename);
    if (isTest(filename)) return {};
    const own = domainOf(filename);
    const shared = SHARED.some((dir) => filename.includes(`/${dir}`) || filename.startsWith(dir));
    const check = (node) => {
      if (!node.source || typeof node.source.value !== 'string') return;
      const target = targetOf(node.source.value, context.filename);
      if (!target) return;
      if (shared) {
        context.report({ node, messageId: 'sharedImportsDomain', data: { domain: target.domain } });
        return;
      }
      if (own && target.domain !== own && !PUBLIC_ENTRIES.has(target.rest)) {
        context.report({ node, messageId: 'deepImport', data: { domain: target.domain } });
      }
    };
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};

/** @type {import('eslint').Rule.RuleModule} */
const noComponentMutation = {
  meta: {
    type: 'problem',
    docs: { description: 'useMutation 은 도메인 *.mutations.ts 훅에서만' },
    messages: {
      componentMutation:
        'useMutation 을 여기서 쓰지 않는다. 도메인 *.mutations.ts 의 훅을 쓴다(무효화 범위가 한 곳에 모인다).',
    },
    schema: [],
  },
  create(context) {
    const filename = toPosix(context.filename);
    if (
      isTest(filename) ||
      /\.mutations\.tsx?$/.test(filename) ||
      filename.includes('src/lib/query/')
    ) {
      return {};
    }
    return {
      ImportDeclaration(node) {
        if (node.source.value !== '@tanstack/react-query') return;
        for (const spec of node.specifiers) {
          if (spec.type === 'ImportSpecifier' && spec.imported.name === 'useMutation') {
            context.report({ node: spec, messageId: 'componentMutation' });
          }
        }
      },
    };
  },
};

// bg-[#fff], text-[rgb(…)], border-[hsl(…)] 같은 임의 색. w-[120px] 같은 임의 크기는 허용
const ARBITRARY_COLOR =
  /(?:^|[\s:"'`])(?:bg|text|border(?:-[trblxy])?|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|accent|caret|shadow)-\[(?:#|rgba?\(|hsla?\(|color:)/;

/** @type {import('eslint').Rule.RuleModule} */
const noArbitraryColor = {
  meta: {
    type: 'suggestion',
    docs: { description: 'className 에 임의 색을 쓰지 않는다' },
    messages: {
      arbitraryColor:
        '임의 색({{value}})을 쓰지 않는다. src/styles/globals.css 의 색 토큰(bg-blue-500 등)을 쓴다. 3D 장면처럼 코드가 색을 정하면 상수를 style 로 넘긴다.',
    },
    schema: [],
  },
  create(context) {
    const check = (node, text) => {
      const match = ARBITRARY_COLOR.exec(text);
      if (match) {
        const value = text.slice(match.index).trim().split(/\s/)[0];
        context.report({ node, messageId: 'arbitraryColor', data: { value } });
      }
    };
    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, ` ${node.value}`);
      },
      TemplateElement(node) {
        check(node, ` ${node.value.raw}`);
      },
    };
  },
};

const plugin = {
  meta: { name: 'eslint-plugin-everp' },
  rules: {
    'domain-boundary': domainBoundary,
    'no-component-mutation': noComponentMutation,
    'no-arbitrary-color': noArbitraryColor,
  },
};

export default plugin;
