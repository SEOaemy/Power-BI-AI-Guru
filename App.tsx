import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import KPICreationDAXGenerator from './components/KPICreationDAXGenerator';
import DataUpload from './components/pages/DataUpload';
import DataProfiling from './components/pages/DataProfiling';
import DataCleaning from './components/pages/DataCleaning';
import DataModeling from './components/pages/DataModeling';
import DashboardDesign from './components/pages/DashboardDesign';
import PublishShare from './components/pages/PublishShare';
import { Page, FullProfileResult, Relationship } from './types';

function App() {
  const [activePage, setActivePage] = useState<Page>('Data Upload');
  const [files, setFiles] = useState<File[]>([]);
  const [profiles, setProfiles] = useState<Record<string, FullProfileResult>>({});
  const [relationships, setRelationships] = useState<Relationship[]>([]);


  const handleProceed = (page: Page) => {
    setActivePage(page);
  };

  const renderActivePage = () => {
    switch (activePage) {
      case 'Data Upload':
        return <DataUpload files={files} setFiles={setFiles} onProceed={() => handleProceed('Data Profiling')} />;
      case 'Data Profiling':
        return <DataProfiling files={files} profiles={profiles} setProfiles={setProfiles} onProceed={() => handleProceed('Data Cleaning')} />;
      case 'Data Cleaning':
        return <DataCleaning files={files} profiles={profiles} setProfiles={setProfiles} onProceed={() => handleProceed('Data Modeling')} />;
      case 'Data Modeling':
        return <DataModeling profiles={profiles} relationships={relationships} setRelationships={setRelationships} onProceed={() => handleProceed('KPIs & DAX')} />;
      case 'KPIs & DAX':
        return <KPICreationDAXGenerator />;
      case 'Dashboard Design':
        return <DashboardDesign onProceed={() => handleProceed('Publish & Share')} />;
      case 'Publish & Share':
        return <PublishShare />;
      default:
        return <DataUpload files={files} setFiles={setFiles} onProceed={() => handleProceed('Data Profiling')} />;
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-200 font-sans flex flex-col">
      <Header />
      <div className="flex flex-grow" style={{ height: 'calc(100vh - 68px)' }}>
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="flex-grow p-4 sm:p-6 md:p-8 overflow-y-auto">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

export default App;