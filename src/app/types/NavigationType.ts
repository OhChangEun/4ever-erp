import { type ComponentType } from 'react';

export interface Tab {
  id: string;
  name: string;
  component: ComponentType;
  roles?: string[];
}
