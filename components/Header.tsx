
import React from 'react';
import { ChartBarIcon } from './IconComponents';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="w-8 h-8 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Power BI <span className="text-cyan-400">Guru</span> Assistant
          </h1>
        </div>
        <p className="text-sm text-gray-400 hidden sm:block">Your AI partner for DAX generation</p>
      </div>
    </header>
  );
};

export default Header;
