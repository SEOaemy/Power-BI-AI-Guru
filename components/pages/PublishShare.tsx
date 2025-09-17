import React from 'react';
import { TableCellsIcon } from '../IconComponents';

const PublishShare: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700 text-center flex flex-col items-center">
      <TableCellsIcon className="w-16 h-16 text-cyan-400 mb-4" />
      <h1 className="text-3xl font-bold text-white">Publish & Share</h1>
      <p className="text-gray-400 mt-4 max-w-2xl">
        The final step is to publish your report to the Power BI Service. From there, you can share it with colleagues, set up scheduled data refreshes, and embed it in other applications.
      </p>
      <p className="text-gray-500 mt-2 text-sm">
        (Feature coming soon: A checklist and guide for best practices in publishing and security)
      </p>
       <div className="mt-8 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-white">Congratulations!</h3>
            <p className="text-gray-300">You have completed all the steps in the Power BI Guru Assistant.</p>
        </div>
    </div>
  );
};

export default PublishShare;