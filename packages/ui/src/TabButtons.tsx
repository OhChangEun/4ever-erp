'use client';

interface TabButtonItem {
  id: string;
  name: string;
  icon?: string;
}

interface TabButtonsProps {
  tabs: TabButtonItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function TabButtons({ tabs, activeTab, onTabChange }: TabButtonsProps) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer whitespace-nowrap ${
            activeTab === tab.id
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {tab.icon && <i className={`${tab.icon} mr-1.5`}></i>}
          {tab.name}
        </button>
      ))}
    </div>
  );
}
