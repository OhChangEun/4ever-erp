/**
 * 도메인 `*.api.ts` 를 읽어 OpenAPI 계약(openapi/everp.yaml)에 경로와 스키마를 채운다(OpenAPI 계약 2 카드).
 * 한 번 돌리고 나면 계약이 원본이다. 이 스크립트는 기록으로 남긴다(결정 기록 "대량 마이그레이션 방식").
 *
 *   npx -y tsx@4.20.6 scripts/codemods/api-to-openapi.mts            # 계약에 쓰기
 *   npx -y tsx@4.20.6 scripts/codemods/api-to-openapi.mts --dry-run  # 보고만
 *
 * 하는 일
 * 1. api 파일의 HTTP 호출(axios.get/post/put/patch/delete, getParsed, parseData)마다 메서드, 경로,
 *    응답 data 타입, 요청 본문 타입을 TypeScript 타입 검사기로 뽑는다.
 * 2. 경로는 `*_ENDPOINTS` 상수를 실제로 불러 값을 얻는다. 함수형 상수는 매개변수 이름을 `{이름}` 으로 넣어 템플릿을 만든다.
 * 3. 타입은 JSON Schema 로 바꾼다. 이름 있는 interface 와 type alias 는 components.schemas 로 올리고 $ref 로 잇는다.
 * 4. 이름 있는 선언 → 스키마 이름 표를 `scripts/codemods/.openapi-map.json` 에 남긴다(별칭 바꾸기 단계가 읽는다).
 */
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';

const ROOT = process.cwd();
const CONTRACT = path.join(ROOT, 'openapi/everp.yaml');
const MAP_FILE = path.join(ROOT, 'scripts/codemods/.openapi-map.json');
const DRY_RUN = process.argv.includes('--dry-run');

const API_FILES = [
  'src/app/(private)/dashboard/dashboard.api.ts',
  'src/app/(private)/finance/finance.api.ts',
  'src/app/(private)/hrm/api/hrm.api.ts',
  'src/app/(private)/inventory/inventory.api.ts',
  'src/app/(private)/low-stock/lowStock.api.ts',
  'src/app/(private)/production/api/production.api.ts',
  'src/app/(private)/purchase/api/purchase.api.ts',
  'src/app/(private)/sales/sales.api.ts',
  'src/lib/api/notification.api.ts',
];

const ENDPOINT_MODULES = [
  'src/app/types/api.ts',
  'src/app/(private)/hrm/api/hrm.endpoints.ts',
  'src/app/(private)/production/api/production.endpoints.ts',
  'src/app/(private)/purchase/api/purchase.endpoints.ts',
  'src/lib/api/notification.endpoints.ts',
];

type JsonSchema = Record<string, unknown>;
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface Operation {
  method: Method;
  path: string;
  params: string[];
  response: JsonSchema | 'noData';
  body?: JsonSchema;
  where: string;
}

// ---------- 1. 엔드포인트 상수 값 ----------
const API_BASE_URL = '/api/proxy';

const loadEndpoints = async () => {
  const values = new Map<string, unknown>();
  for (const file of ENDPOINT_MODULES) {
    const mod: Record<string, unknown> = await import(path.join(ROOT, file));
    for (const [name, value] of Object.entries(mod)) {
      if (!name.endsWith('_ENDPOINTS') || typeof value !== 'object' || value === null) continue;
      for (const [key, endpoint] of Object.entries(value)) values.set(`${name}.${key}`, endpoint);
    }
  }
  return values;
};

const paramNames = (fn: (...args: string[]) => string) => {
  const match = fn.toString().match(/^\(?([^)=]*)\)?\s*=>/);
  return (match?.[1] ?? '')
    .split(',')
    .map((p) => p.trim().split(':')[0]?.trim())
    .filter((p): p is string => Boolean(p));
};

const toTemplate = (value: unknown): { path: string; params: string[] } | null => {
  if (typeof value === 'string') return { path: value, params: [] };
  if (typeof value === 'function') {
    const params = paramNames(value as (...args: string[]) => string);
    const path = (value as (...args: string[]) => string)(...params.map((p) => `{${p}}`));
    return { path, params };
  }
  return null;
};

const contractPath = (url: string) =>
  url.replace(API_BASE_URL, '').split('?')[0].replace(/\/$/, '') || '/';

// ---------- 2. 타입 → JSON Schema ----------
const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
if (!configPath) throw new Error('tsconfig.json 없음');
const config = ts.parseJsonConfigFileContent(
  ts.readConfigFile(configPath, ts.sys.readFile).config,
  ts.sys,
  ROOT,
);
const program = ts.createProgram(
  API_FILES.map((f) => path.join(ROOT, f)),
  config.options,
);
const checker = program.getTypeChecker();

const components: Record<string, JsonSchema> = {};
/** 선언 위치(파일:시작) → 스키마 이름 */
const declarationNames = new Map<string, string>();
const mapRows: { file: string; name: string; schema: string }[] = [];

const domainOf = (file: string) => {
  const m = file.match(/\(private\)\/([^/]+)\//) ?? file.match(/src\/lib\/api\/([a-z]+)/);
  const d = m?.[1] ?? 'common';
  return d
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
};

const isProjectDecl = (decl: ts.Declaration) => {
  const file = decl.getSourceFile().fileName;
  return file.startsWith(path.join(ROOT, 'src')) && !file.includes('node_modules');
};

const namedDeclaration = (type: ts.Type): ts.Declaration | undefined => {
  // 제네릭 인스턴스(StatResponse<X>)는 이름 없이 펼친다
  if (type.aliasSymbol && !type.aliasTypeArguments?.length) {
    const decl = type.aliasSymbol.declarations?.[0];
    if (decl && isProjectDecl(decl)) return decl;
  }
  const symbol = type.getSymbol();
  if (symbol && symbol.flags & ts.SymbolFlags.Interface) {
    const decl = symbol.declarations?.[0];
    const args = (type as ts.TypeReference).typeArguments;
    if (decl && isProjectDecl(decl) && !args?.length) return decl;
  }
  return undefined;
};

const schemaNameFor = (decl: ts.Declaration) => {
  const key = `${decl.getSourceFile().fileName}:${decl.getStart()}`;
  const existing = declarationNames.get(key);
  if (existing) return { name: existing, isNew: false };
  const base = (decl as ts.InterfaceDeclaration).name.text;
  const file = path.relative(ROOT, decl.getSourceFile().fileName);
  // 같은 이름이 다른 선언에 이미 쓰였으면 도메인 이름을 앞에 붙인다
  let name = base;
  if (Object.values(Object.fromEntries(declarationNames)).includes(name) || components[name]) {
    name = `${domainOf(file)}${base}`;
  }
  let n = 2;
  while (components[name] && !declarationNames.has(key)) name = `${domainOf(file)}${base}${n++}`;
  declarationNames.set(key, name);
  mapRows.push({ file, name: base, schema: name });
  return { name, isNew: true };
};

const toSchema = (type: ts.Type, depth = 0): JsonSchema => {
  if (depth > 25) return {};
  const flags = type.getFlags();
  if (flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return {};
  if (flags & ts.TypeFlags.StringLiteral)
    return { type: 'string', const: (type as ts.StringLiteralType).value };
  if (flags & ts.TypeFlags.NumberLiteral)
    return { type: 'number', const: (type as ts.NumberLiteralType).value };
  if (flags & ts.TypeFlags.BooleanLiteral)
    return { type: 'boolean', const: checker.typeToString(type) === 'true' };
  if (flags & ts.TypeFlags.String) return { type: 'string' };
  if (flags & ts.TypeFlags.Number) return { type: 'number' };
  if (flags & ts.TypeFlags.Boolean) return { type: 'boolean' };
  if (flags & ts.TypeFlags.Null) return { type: 'null' };

  if (type.isUnion()) {
    const parts = type.types.filter((t) => !(t.getFlags() & ts.TypeFlags.Undefined));
    // boolean 은 true | false 유니온으로 들어온다
    if (parts.length === 2 && parts.every((t) => t.getFlags() & ts.TypeFlags.BooleanLiteral))
      return { type: 'boolean' };
    if (parts.every((t) => t.isStringLiteral()))
      return { type: 'string', enum: parts.map((t) => (t as ts.StringLiteralType).value) };
    const schemas = parts.map((t) => toSchema(t, depth + 1));
    return schemas.length === 1 ? schemas[0] : { anyOf: schemas };
  }

  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    const [item] = checker.getTypeArguments(type as ts.TypeReference);
    return { type: 'array', items: item ? toSchema(item, depth + 1) : {} };
  }

  if (type.isIntersection()) {
    return objectSchema(type, depth);
  }

  if (flags & ts.TypeFlags.Object) {
    const decl = namedDeclaration(type);
    if (decl) {
      const { name, isNew } = schemaNameFor(decl);
      if (isNew) {
        components[name] = {}; // 순환 참조 대비 자리 먼저
        components[name] = objectSchema(type, depth);
      }
      return { $ref: `#/components/schemas/${name}` };
    }
    return objectSchema(type, depth);
  }
  return {};
};

const objectSchema = (type: ts.Type, depth: number): JsonSchema => {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const prop of checker.getPropertiesOfType(type)) {
    // mapped type(StatResponse<T> = { [key in Period]: T })의 속성은 선언이 없다. 심볼에서 바로 읽는다
    const decl = prop.valueDeclaration ?? prop.declarations?.[0];
    const propType = decl
      ? checker.getTypeOfSymbolAtLocation(prop, decl)
      : checker.getTypeOfSymbol(prop);
    if (propType.getCallSignatures().length > 0) continue; // 메서드는 데이터가 아니다
    properties[prop.name] = toSchema(propType, depth + 1);
    const optional = (prop.flags & ts.SymbolFlags.Optional) !== 0;
    if (!optional) required.push(prop.name);
  }
  const index = checker.getIndexInfosOfType(type).at(0);
  const schema: JsonSchema = { type: 'object', properties };
  if (required.length) schema.required = required;
  if (index) schema.additionalProperties = toSchema(index.type, depth + 1);
  return schema;
};

// ---------- 3. 호출 찾기 ----------
const unresolved: string[] = [];
const operations: Operation[] = [];

const resolveUrl = (
  node: ts.Expression,
  endpoints: Map<string, unknown>,
): { path: string; params: string[] } | null => {
  if (ts.isParenthesizedExpression(node)) return resolveUrl(node.expression, endpoints);
  if (ts.isPropertyAccessExpression(node)) return toTemplate(endpoints.get(node.getText()));
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    return toTemplate(endpoints.get(node.expression.getText()));
  }
  if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (ts.isNoSubstitutionTemplateLiteral(node)) return { path: node.text, params: [] };
    // `${ENDPOINT}?${query}` 꼴. 첫 치환만 경로로 본다
    const first = node.templateSpans[0];
    const rest = first.literal.text;
    if (node.head.text === '' && (rest === '' || rest.startsWith('?'))) {
      return resolveUrl(first.expression, endpoints);
    }
    // `${ENDPOINT(id)}/suffix` 꼴. 뒤에 붙은 경로 조각을 잇는다
    if (node.head.text === '' && rest.startsWith('/') && node.templateSpans.length === 1) {
      const base = resolveUrl(first.expression, endpoints);
      return base && { path: `${base.path}${rest.split('?')[0]}`, params: base.params };
    }
    return null;
  }
  if (ts.isIdentifier(node)) {
    const symbol = checker.getSymbolAtLocation(node);
    const decl = symbol?.valueDeclaration;
    if (decl && ts.isVariableDeclaration(decl) && decl.initializer) {
      return resolveUrl(decl.initializer, endpoints);
    }
  }
  return null;
};

/** ApiResponse<T> 의 T. ApiResponseNoData 면 'noData' */
const dataTypeOfEnvelope = (type: ts.Type): ts.Type | 'noData' | null => {
  const data = type.getProperty('data');
  if (!data) return type.getProperty('success') ? 'noData' : null;
  const decl = data.valueDeclaration ?? data.declarations?.[0];
  return decl ? checker.getTypeOfSymbolAtLocation(data, decl) : null;
};

const promiseValue = (type: ts.Type) => {
  const args = checker.getTypeArguments(type as ts.TypeReference);
  return args[0] ?? type;
};

const enclosingFunction = (node: ts.Node): ts.Node | undefined => {
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isFunctionLike(current)) current = current.parent;
  return current;
};

const findParseData = (fn: ts.Node | undefined): ts.CallExpression | undefined => {
  let found: ts.CallExpression | undefined;
  const visit = (n: ts.Node) => {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'parseData'
    )
      found = n;
    ts.forEachChild(n, visit);
  };
  if (fn) visit(fn);
  return found;
};

const collect = (endpoints: Map<string, unknown>) => {
  for (const file of API_FILES) {
    const source = program.getSourceFile(path.join(ROOT, file));
    if (!source) throw new Error(`못 읽음: ${file}`);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) handleCall(node, file, endpoints);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
};

const handleCall = (call: ts.CallExpression, file: string, endpoints: Map<string, unknown>) => {
  const callee = call.expression;
  const line = call.getSourceFile().getLineAndCharacterOfPosition(call.getStart()).line + 1;
  const where = `${file}:${line}`;
  let method: Method | null = null;
  let response: JsonSchema | 'noData' | null = null;
  let body: JsonSchema | undefined;

  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === 'axios'
  ) {
    const name = callee.name.text;
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(name)) return;
    method = name as Method;
    const typeArg = call.typeArguments?.[0];
    const envelope = typeArg ? checker.getTypeFromTypeNode(typeArg) : undefined;
    const data = envelope ? dataTypeOfEnvelope(envelope) : 'noData';
    if (data === 'noData' || data === null) response = 'noData';
    else if (data.getFlags() & ts.TypeFlags.Unknown) {
      // ApiResponse<unknown> 뒤에 parseData(schema, ...) 로 확인하는 꼴
      const parsed = findParseData(enclosingFunction(call));
      response = parsed
        ? toSchema(checker.getTypeAtLocation(parsed))
        : (unresolved.push(`${where} 응답 타입 unknown`), {});
    } else response = toSchema(data);
    if (['post', 'put', 'patch'].includes(name) && call.arguments[1]) {
      const bodyType = checker.getTypeAtLocation(call.arguments[1]);
      body = checker.typeToString(bodyType) === 'FormData' ? undefined : toSchema(bodyType);
    }
  } else if (ts.isIdentifier(callee) && callee.text === 'getParsed') {
    method = 'get';
    const signature = checker.getResolvedSignature(call);
    const value = signature ? promiseValue(signature.getReturnType()) : undefined;
    response = value ? toSchema(value) : {};
  } else return;

  const urlNode = call.arguments[ts.isIdentifier(callee) ? 1 : 0];
  const resolved = urlNode ? resolveUrl(urlNode, endpoints) : null;
  if (!resolved) {
    unresolved.push(`${where} 경로를 못 풂: ${urlNode?.getText() ?? '(없음)'}`);
    return;
  }
  operations.push({
    method,
    path: contractPath(resolved.path),
    params: resolved.params,
    response,
    body,
    where,
  });
};

// ---------- 4. 계약에 쓰기 ----------
const envelopeOf = (data: JsonSchema) => ({
  allOf: [
    { $ref: '#/components/schemas/ApiEnvelope' },
    { type: 'object', required: ['data'], properties: { data } },
  ],
});

const operationId = (op: Operation) => {
  const words = op.path
    .split('/')
    .filter((p) => p && !p.startsWith('{'))
    .map((p) =>
      p.replace(/[^a-zA-Z0-9]+(.)?/g, (_m, c: string | undefined) => (c ?? '').toUpperCase()),
    )
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  const byParams = op.params.map((p) => `By${p.charAt(0).toUpperCase()}${p.slice(1)}`).join('');
  return `${op.method}${words.join('')}${byParams}`;
};

const usedOperationIds = new Set<string>();
const uniqueOperationId = (op: Operation) => {
  const base = operationId(op);
  let id = base;
  for (let n = 2; usedOperationIds.has(id); n += 1) id = `${base}${n}`;
  usedOperationIds.add(id);
  return id;
};

const main = async () => {
  const endpoints = await loadEndpoints();
  collect(endpoints);

  const contract = parse(readFileSync(CONTRACT, 'utf8')) as {
    paths: Record<string, Record<string, unknown>>;
    components: { schemas: Record<string, JsonSchema> };
  };

  let added = 0;
  const seen = new Set<string>();
  for (const op of operations) {
    const key = `${op.method} ${op.path}`;
    if (seen.has(key)) continue; // 같은 요청을 부르는 함수가 둘 이상
    seen.add(key);
    const item = (contract.paths[op.path] ??= {});
    if (item[op.method]) continue; // 이미 계약에 있는 것(창고)은 손대지 않는다
    if (op.params.length && !item.parameters) {
      item.parameters = op.params.map((name) => ({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' },
      }));
    }
    item[op.method] = {
      operationId: uniqueOperationId(op),
      tags: [op.path.split('/').filter(Boolean).slice(0, 2).join('/')],
      'x-source': op.where.replace(/:\d+$/, ''),
      ...(op.body && {
        requestBody: {
          required: true,
          content: { 'application/json': { schema: op.body } },
        },
      }),
      responses: {
        '200':
          op.response === 'noData'
            ? { $ref: '#/components/responses/NoData' }
            : {
                description: 'OK',
                content: { 'application/json': { schema: envelopeOf(op.response) } },
              },
        default: { $ref: '#/components/responses/Error' },
      },
    };
    added += 1;
  }
  for (const [name, schema] of Object.entries(components)) {
    contract.components.schemas[name] ??= schema;
  }

  console.log(
    `호출 ${operations.length}개, 계약에 추가 ${added}개, 스키마 ${Object.keys(components).length}개`,
  );
  if (unresolved.length) console.log(`못 푼 것 ${unresolved.length}개\n${unresolved.join('\n')}`);
  if (DRY_RUN) return;
  writeFileSync(CONTRACT, stringify(contract, { lineWidth: 100 }));
  writeFileSync(MAP_FILE, JSON.stringify(mapRows, null, 2));
};

await main();
