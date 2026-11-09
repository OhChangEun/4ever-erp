import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import plugin from './index.mjs';

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const ROOT = '/repo';
const at = (file: string) => `${ROOT}/${file}`;

tester.run('domain-boundary', plugin.rules['domain-boundary'], {
  valid: [
    // 같은 도메인 안
    {
      code: "import { x } from '@/app/(private)/inventory/inventory.keys';",
      filename: at('src/app/(private)/inventory/inventory.mutations.ts'),
    },
    {
      code: "import { x } from './inventory.keys';",
      filename: at('src/app/(private)/inventory/a.ts'),
    },
    // 다른 도메인은 공개 API 로
    {
      code: "import { purchaseRequestKeys } from '@/app/(private)/purchase';",
      filename: at('src/app/(private)/inventory/inventory.mutations.ts'),
    },
    {
      code: "import { NewOrderModal } from '@/app/(private)/sales/ui';",
      filename: at('src/app/(private)/dashboard/components/ActionCard.tsx'),
    },
    // 라우트 공용(_로 시작)
    {
      code: "import P from '../_RouteProviders';",
      filename: at('src/app/(private)/sales/layout.tsx'),
    },
    // 공통 코드끼리
    {
      code: "import { x } from '@/lib/AppError';",
      filename: at('src/app/components/common/A.tsx'),
    },
    // 목과 테스트는 도메인을 본다
    {
      code: "import { x } from '@/app/(private)/sales/sales.keys';",
      filename: at('src/mocks/handlers/sales.handlers.ts'),
    },
  ],
  invalid: [
    {
      code: "import { purchaseRequestKeys } from '@/app/(private)/purchase/api/purchase.keys';",
      filename: at('src/app/(private)/inventory/inventory.mutations.ts'),
      errors: [{ messageId: 'deepImport' }],
    },
    {
      code: "import { LOW } from '../../inventory/inventory.constants';",
      filename: at('src/app/(private)/low-stock/components/LowStockList.tsx'),
      errors: [{ messageId: 'deepImport' }],
    },
    {
      code: "export { x } from '@/app/(private)/sales/sales.keys';",
      filename: at('src/app/(private)/dashboard/a.ts'),
      errors: [{ messageId: 'deepImport' }],
    },
    {
      code: "import { x } from '@/app/(private)/sales';",
      filename: at('src/lib/query/a.ts'),
      errors: [{ messageId: 'sharedImportsDomain' }],
    },
  ],
});

tester.run('no-component-mutation', plugin.rules['no-component-mutation'], {
  valid: [
    {
      code: "import { useMutation } from '@tanstack/react-query';",
      filename: at('src/app/(private)/sales/sales.mutations.ts'),
    },
    {
      code: "import { useMutation } from '@tanstack/react-query';",
      filename: at('src/lib/query/useInvalidatingMutation.ts'),
    },
    {
      code: "import { useQuery } from '@tanstack/react-query';",
      filename: at('src/app/(private)/sales/components/A.tsx'),
    },
    {
      code: "import { useMutation } from '@tanstack/react-query';",
      filename: at('src/app/(private)/sales/a.test.tsx'),
    },
  ],
  invalid: [
    {
      code: "import { useQuery, useMutation } from '@tanstack/react-query';",
      filename: at('src/app/(private)/sales/components/modals/A.tsx'),
      errors: [{ messageId: 'componentMutation' }],
    },
  ],
});

tester.run('no-arbitrary-color', plugin.rules['no-arbitrary-color'], {
  valid: [
    {
      code: 'const a = <div className="bg-blue-500 text-white w-[120px]" />;',
      filename: at('src/a.tsx'),
    },
    {
      code: 'const a = <div className={`h-[3px] ${on ? "bg-gray-100" : ""}`} />;',
      filename: at('src/a.tsx'),
    },
  ],
  invalid: [
    {
      code: 'const a = <div className="px-4 bg-[#2563EB] text-white" />;',
      filename: at('src/a.tsx'),
      errors: [{ messageId: 'arbitraryColor' }],
    },
    {
      code: 'const a = <div className={`p-2 ${x} text-[rgb(1,2,3)]`} />;',
      filename: at('src/a.tsx'),
      errors: [{ messageId: 'arbitraryColor' }],
    },
    {
      code: "const cls = on ? 'border-[#fff]' : 'border-gray-200';",
      filename: at('src/a.tsx'),
      errors: [{ messageId: 'arbitraryColor' }],
    },
  ],
});
