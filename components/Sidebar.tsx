import React from 'react';
import { Page } from '../types';
import {
  CalculatorIcon,
  CloudArrowUpIcon,
  CubeTransparentIcon,
  MagnifyingGlassCircleIcon,
  PaintBrushIcon,
  TableCellsIcon,
  WandSparklesIcon,
} from './IconComponents';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const navItems = [
    { name: 'Data Upload', icon: CloudArrowUpIcon, page: 'Data Upload' as Page },
    { name: 'Data Profiling', icon: MagnifyingGlassCircleIcon, page: 'Data Profiling' as Page },
    { name: 'Data Cleaning', icon: WandSparklesIcon, page: 'Data Cleaning' as Page },
    { name: 'Data Modeling', icon: CubeTransparentIcon, page: 'Data Modeling' as Page },
    { name: 'KPIs & DAX', icon: CalculatorIcon, page: 'KPIs & DAX' as Page },
    { name: 'Dashboard Design', icon: PaintBrushIcon, page: 'Dashboard Design' as Page },
    { name: 'Publish & Share', icon: TableCellsIcon, page: 'Publish & Share' as Page },
  ];

  return (
    <aside className="w-64 bg-gray-800 p-4 hidden md:flex flex-col flex-shrink-0 border-r border-gray-700">
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isCurrent = activePage === item.page;
          const Icon = item.icon;
          return (
             <button
              key={item.name}
              onClick={() => setActivePage(item.page)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 text-left ${
                isCurrent
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              aria-current={isCurrent ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
