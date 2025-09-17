import React, { useEffect, useState } from 'react';
import * as xlsx from 'xlsx';
import { DocumentTextIcon, TableCellsIcon, CodeBracketIcon, InformationCircleIcon, ChevronDownIcon, ExclamationTriangleIcon, ArrowRightCircleIcon } from '../IconComponents';
import { FileProfile, FullProfileResult, ColumnProfile } from '../../types';
import { generateInsightsFromProfile } from '../../services/geminiService';
import LoadingSpinner from '../LoadingSpinner';

interface DataProfilingProps {
  files: File[];
  profiles: Record<string, FullProfileResult>;
  setProfiles: React.Dispatch<React.SetStateAction<Record<string, FullProfileResult>>>;
  onProceed: () => void;
}

// --- Helper Functions ---

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
    
const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'csv' || extension === 'xlsx' || extension === 'xls') {
        return <TableCellsIcon className="w-8 h-8 text-green-400 flex-shrink-0" />;
    }
    if (extension === 'json') {
        return <CodeBracketIcon className="w-8 h-8 text-yellow-400 flex-shrink-0" />;
    }
    return <DocumentTextIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />;
};

const isNumeric = (str: string) => {
    if (typeof str !== 'string' || str.trim() === '') return false;
    // This regex handles integers, decimals, and negative numbers.
    return /^-?\d*\.?\d+$/.test(str.trim());
};

const parseFile = async (file: File): Promise<{ header: string[], rows: (string|number|boolean|null)[][] }> => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'csv': {
            const content = await file.text();
            const lines = content.split('\n').filter(line => line.trim() !== '');
            if (lines.length === 0) return { header: [], rows: [] };
            const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));
            return { header, rows };
        }
        case 'xlsx':
        case 'xls': {
            const buffer = await file.arrayBuffer();
            const workbook = xlsx.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            if (!Array.isArray(data) || data.length === 0) return { header: [], rows: [] };
            const header = (data[0] as any[]).map(String);
            const rows = data.slice(1) as (string|number|boolean|null)[][];
            return { header, rows };
        }
        case 'json': {
            const content = await file.text();
            const data = JSON.parse(content);
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error("JSON file must be a non-empty array of objects.");
            }
            const firstItem = data[0];
            if (typeof firstItem !== 'object' || firstItem === null) {
                throw new Error("JSON file must be an array of objects.");
            }
            const header = Object.keys(firstItem);
            const rows = data.map(item => 
                header.map(key => {
                    const value = item[key];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'object') return JSON.stringify(value);
                    return value;
                })
            );
            return { header, rows };
        }
        default:
            throw new Error(`Unsupported file type: .${extension}`);
    }
};


// --- Main Component ---

const DataProfiling: React.FC<DataProfilingProps> = ({ files, profiles, setProfiles, onProceed }) => {
  const [status, setStatus] = useState<Record<string, 'pending' | 'profiling' | 'insights' | 'complete' | 'error'>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  useEffect(() => {
    const runProfiling = async (file: File) => {
        if (status[file.name] && status[file.name] !== 'pending') return;

        try {
            // 1. Set status to 'profiling'
            setStatus(prev => ({ ...prev, [file.name]: 'profiling' }));
            
            // 2. Read and parse file
            const { header, rows: rawRows } = await parseFile(file);

            if (header.length === 0 && rawRows.length === 0) {
                throw new Error("File is empty or could not be parsed.");
            }

            // Convert all cell data to string for consistent profiling
            const rows = rawRows.map(row => 
                header.map((_, colIndex) => {
                    const cell = row[colIndex];
                    if (cell === null || cell === undefined) return '';
                    return String(cell);
                })
            );
            
            // 3. Generate basic profile
            const columnProfiles: ColumnProfile[] = header.map((colName, colIndex) => {
                const columnValues = rows.map(row => row[colIndex]);
                const missingValues = columnValues.filter(val => val === null || val === undefined || val.trim() === '').length;
                const uniqueValues = new Set(columnValues.filter(val => val !== null && val !== undefined && val.trim() !== '')).size;
                
                let dataType: ColumnProfile['dataType'] = 'unknown';
                let nonNumericCount = 0;
                const nonNullValues = columnValues.filter(val => val !== null && val !== undefined && val.trim() !== '');

                if (nonNullValues.length > 0) {
                    const numericValues = nonNullValues.filter(isNumeric);
                    const stringValues = nonNullValues.filter(val => !isNumeric(val));
                    
                    if (numericValues.length > 0 && stringValues.length > 0) {
                        dataType = 'mixed';
                        nonNumericCount = stringValues.length;
                    } else if (numericValues.length > 0) {
                        dataType = 'number';
                    } else {
                        dataType = 'string';
                    }
                }

                const profile: ColumnProfile = { name: colName, dataType, missingValues, uniqueValues };
                if (dataType === 'mixed') {
                    profile.nonNumericCount = nonNumericCount;
                }
                return profile;
            });

            const basicProfile: FileProfile = {
                rowCount: rows.length,
                columnCount: header.length,
                columns: columnProfiles,
            };
            
            // 4. Set status to 'insights'
            setStatus(prev => ({ ...prev, [file.name]: 'insights' }));

            // 5. Call Gemini service
            const insights = await generateInsightsFromProfile(basicProfile, file.name);

            // 6. Update state with full profile
            setProfiles(prev => ({
                ...prev,
                [file.name]: { ...basicProfile, aiInsights: insights }
            }));

            // 7. Set status to 'complete'
            setStatus(prev => ({ ...prev, [file.name]: 'complete' }));
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during analysis.";
            setStatus(prev => ({ ...prev, [file.name]: 'error' }));
            setErrors(prev => ({ ...prev, [file.name]: errorMessage }));
        }
    };

    if (files.length > 0) {
      files.forEach(file => {
          if (!status[file.name]) {
              runProfiling(file);
          }
      });
    }
  }, [files, status, setProfiles]);

  const toggleExpand = (fileName: string) => {
      setExpandedFile(prev => prev === fileName ? null : fileName);
  };
  
  const getStatusBadge = (fileName: string) => {
      const currentStatus = status[fileName] || 'pending';
      switch (currentStatus) {
          case 'profiling':
              return <div className="flex items-center gap-2"><LoadingSpinner /><span className="text-sm font-medium text-blue-400">Profiling...</span></div>;
          case 'insights':
               return <div className="flex items-center gap-2"><LoadingSpinner /><span className="text-sm font-medium text-purple-400">Generating Insights...</span></div>;
          case 'complete':
              return <span className="text-sm font-medium text-green-400">Complete</span>;
          case 'error':
              return <span className="text-sm font-medium text-red-400">Error</span>;
          default:
              return <span className="text-sm font-medium text-gray-500">Queued</span>;
      }
  };

  const allFilesProcessed = files.length > 0 && files.every(f => status[f.name] === 'complete' || status[f.name] === 'error');

  if (files.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700 text-center">
        <h2 className="text-3xl font-bold text-white">Data Profiling</h2>
        <p className="text-gray-400 mt-4">No files to profile. Please go back to the 'Data Upload' page to add your data files first.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white">Data Profiling Analysis</h2>
        <p className="text-gray-400 mt-2">Reviewing the structure and quality of your uploaded data.</p>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-200 mb-4">Files for Analysis</h3>
        <ul className="space-y-3">
          {files.map((file) => {
            const profile = profiles[file.name];
            const isExpanded = expandedFile === file.name;

            return (
              <li key={file.name} className="bg-gray-900/70 rounded-lg border border-gray-700 animate-fade-in transition-all duration-300">
                <button 
                  onClick={() => status[file.name] === 'complete' && toggleExpand(file.name)}
                  className="w-full flex items-center justify-between p-4 text-left"
                  disabled={status[file.name] !== 'complete'}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center space-x-4">
                    {getFileIcon(file.name)}
                    <div>
                      <p className="font-medium text-gray-200">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(file.name)}
                    {status[file.name] === 'complete' && (
                       <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </button>

                {isExpanded && profile && (
                  <div className="p-6 border-t border-gray-700 bg-gray-900/50">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 text-center">
                        <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Total Rows</p><p className="text-2xl font-bold text-white">{profile.rowCount.toLocaleString()}</p></div>
                        <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Total Columns</p><p className="text-2xl font-bold text-white">{profile.columnCount}</p></div>
                        <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Missing Values</p><p className="text-2xl font-bold text-white">{profile.columns.reduce((acc, col) => acc + col.missingValues, 0).toLocaleString()}</p></div>
                     </div>
                     
                     {profile.aiInsights && (
                        <div className="mb-6 bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4">
                           <h4 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2"><InformationCircleIcon className="w-6 h-6 text-cyan-400" /> AI-Powered Summary</h4>
                           <div className="space-y-3">
                             <div>
                               <h5 className="font-semibold text-gray-300">Suggested KPIs:</h5>
                               <ul className="list-disc list-inside text-gray-400 pl-2">
                                  {profile.aiInsights.suggested_kpis.map((kpi, i) => <li key={i}>{kpi}</li>)}
                               </ul>
                             </div>
                              <div>
                               <h5 className="font-semibold text-gray-300">Data Quality Notes:</h5>
                               <p className="text-gray-400">{profile.aiInsights.data_quality_summary}</p>
                             </div>
                           </div>
                        </div>
                     )}

                     <div>
                        <h4 className="text-lg font-semibold text-gray-200 mb-3">Column Details</h4>
                        <div className="overflow-x-auto rounded-lg border border-gray-700">
                           <table className="min-w-full divide-y divide-gray-700">
                              <thead className="bg-gray-800">
                                 <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Column Name</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Inferred Type</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Missing Values</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Unique Values</th>
                                 </tr>
                              </thead>
                              <tbody className="bg-gray-900 divide-y divide-gray-700">
                                 {profile.columns.map(col => (
                                    <tr key={col.name}>
                                       <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">{col.name}</td>
                                       <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 capitalize">{col.dataType}</td>
                                       <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{col.missingValues.toLocaleString()} ({profile.rowCount > 0 ? ((col.missingValues / profile.rowCount) * 100).toFixed(1) : 0}%)</td>
                                       <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{col.uniqueValues.toLocaleString()}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
                )}

                {status[file.name] === 'error' && (
                    <div className="p-4 border-t border-red-700 bg-red-900/50">
                        <div className="flex items-center gap-2 text-red-300">
                             <ExclamationTriangleIcon className="w-5 h-5"/>
                             <p><span className="font-bold">Analysis Failed:</span> {errors[file.name]}</p>
                        </div>
                    </div>
                )}
              </li>
            )
          })}
        </ul>
        {allFilesProcessed && (
            <div className="mt-8 text-center">
                <button 
                    onClick={onProceed}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-transform duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
                >
                    <span>Proceed to Data Cleaning</span>
                    <ArrowRightCircleIcon className="w-5 h-5" />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default DataProfiling;