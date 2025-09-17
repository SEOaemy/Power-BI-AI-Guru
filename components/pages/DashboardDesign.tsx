import React from 'react';
import { PaintBrushIcon, ArrowRightCircleIcon } from '../IconComponents';

interface DashboardDesignProps {
    onProceed: () => void;
}

const DashboardDesign: React.FC<DashboardDesignProps> = ({ onProceed }) => {
  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700 text-center flex flex-col items-center">
      <PaintBrushIcon className="w-16 h-16 text-cyan-400 mb-4" />
      <h1 className="text-3xl font-bold text-white">Dashboard Design</h1>
      <p className="text-gray-400 mt-4 max-w-2xl">
        In this step, you will arrange your visuals, apply formatting, and ensure your dashboard tells a clear and compelling story. Good design focuses on clarity, user experience, and aesthetic appeal.
      </p>
      <p className="text-gray-500 mt-2 text-sm">
        (Feature coming soon: AI suggestions for layout, color palettes, and chart types based on your data)
      </p>
      <div className="mt-8">
          <button 
              onClick={onProceed}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-transform duration-200 transform hover:scale-105"
          >
              <span>Proceed to Publish & Share</span>
              <ArrowRightCircleIcon className="w-5 h-5" />
          </button>
      </div>
    </div>
  );
};

export default DashboardDesign;