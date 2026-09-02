import Link from 'next/link';
import { getColorClasses } from '../dashboard.utils';
import { ActionCardProps } from '../types/ActionCardType';
import { useModal } from '@/app/components/common/modal/useModal';
import NewOrderModal from '../../sales/components/modals/NewOrderModal';

export const ActionCard = ({ title, description, icon, color, href }: ActionCardProps) => {
  const { openModal } = useModal();

  // {
  //   showNewOrderModal && (
  //     <NewOrderModal
  //       showNewOrderModal={showNewOrderModal}
  //       setShowNewOrderModal={setShowNewOrderModal}
  //     />
  //   );
  // }

  const colors = getColorClasses(color);
  const handleClick = (e: React.MouseEvent) => {
    if (title === '신규 견적서 작성') {
      e.preventDefault(); // 페이지 이동 막기

      openModal(NewOrderModal, { title: '신규 견적 요청', width: '900px' });
    }
  };
  return (
    <Link
      href={href}
      onClick={handleClick}
      className="group flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer border border-transparent hover:border-gray-200"
    >
      <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
        <i className={`${icon} ${colors.icon} text-lg`}></i>
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-800">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      <i className="ri-arrow-right-line text-gray-400 group-hover:text-gray-600 transition-colors duration-200"></i>
    </Link>
  );
};
