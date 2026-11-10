import type { QuickActionKey } from '../dashboard.utils';

export interface ActionCardProps {
  /** 메시지 키. 제목과 설명은 화면이 이 키로 꺼낸다 */
  actionKey: QuickActionKey;
  icon: string;
  color: string;
  href: string;
}
