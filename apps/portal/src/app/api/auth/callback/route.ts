import type { NextRequest } from 'next/server';
import { loginFlow } from '@portal/server/auth';

export const GET = (req: NextRequest) => loginFlow.finish(req);
