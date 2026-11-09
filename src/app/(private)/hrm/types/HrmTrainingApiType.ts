import type { Schema } from '@/lib/api/contract';
import { PageRequest } from '@/app/types/Page';

export type TrainingListData = Schema<'TrainingListData'>;

export type TrainingListResponse = Schema<'TrainingListResponse'>;

export interface TrainingRequestParams extends PageRequest {
  department?: string;
  name?: string;
}

export type TrainingDetailResponse = Schema<'TrainingDetailResponse'>;
