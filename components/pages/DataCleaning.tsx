import React, { useState, useEffect } from 'react';
import { FullProfileResult, CleaningSuggestion, ColumnIssue, AppliedAction, CleaningActionType } from '../../types';
import { generateCleaningSuggestions } from '../../services/geminiService';
import { FunnelIcon, ExclamationTriangleIcon } from '../IconComponents';
import LoadingSpinner from '../LoadingSpinner';

interface DataCleaningProps {
  files: File[];
  profiles: Record<string, FullProfileResult>;
  setProfiles: React.Dispatch<React.SetStateAction<Record<string, FullProfileResult>>>;
  onProceed: () => void;
}

type SuggestionsState = Record<string, Record<string, CleaningSuggestion[]>>;
type LoadingState = Record<string, 'pending' | 'loading' | 'done' | 'error'>;

const DataCleaning: React.FC<DataCleaningProps> = ({ files, profiles, setProfiles, onProceed }) => {
  const [activeFile, setActiveFile] = useState<string | null>(files.length > 0 ? files[0].name : null);
  const [suggestions, setSuggestions] = useState<SuggestionsState>({});
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});
  const [selectedActions, setSelectedActions] = useState<Record<string, AppliedAction>>({});

  useEffect(() => {
    const fetchSuggestionsForFile = async (fileName: string) => {
      if (loadingStates[fileName] === 'loading' || loadingStates[fileName] === 'done') return;

      setLoadingStates(prev => ({ ...prev, [fileName]: 'loading' }));
      const profile = profiles[fileName];
      if (!profile) {
          setLoadingStates(prev => ({ ...prev, [fileName]: 'error' }));
          return;
      }
      
      const issuesToFetch: ColumnIssue[] = [];
      profile.columns.forEach(col => {
        // Issue 1: Missing values
        if (col.missingValues > 0) {
            issuesToFetch.push({
                fileName: fileName,
                columnName: col.name,
                issueType: 'missing_values',
                details: {
                    missingCount: col.missingValues,
                    totalRows: profile.rowCount,
                },
            });
        }
        // Issue 2: Mixed data type
        if (col.dataType === 'mixed' && col.nonNumericCount && col.nonNumericCount > 0) {
            issuesToFetch.push({
                fileName: fileName,
                columnName: col.name,
                issueType: 'mixed_type',
                details: {
                    nonNumericCount: col.nonNumericCount,
                    totalRows: profile.rowCount,
                },
            });
        }
      });

      try {
        const suggestionPromises = issuesToFetch.map(issue => 
          generateCleaningSuggestions(issue).then(sugs => ({ columnName: issue.columnName, suggestions: sugs }))
        );
        
        const results = await Promise.all(suggestionPromises);

        const fileSuggestions: Record<string, CleaningSuggestion[]> = {};
        results.forEach(result => {
          if (!fileSuggestions[result.columnName]) {
            fileSuggestions[result.columnName] = [];
          }
          fileSuggestions[result.columnName].push(...result.suggestions);
        });

        setSuggestions(prev => ({ ...prev, [fileName]: fileSuggestions }));
        setLoadingStates(prev => ({ ...prev, [fileName]: 'done' }));

      } catch (error) {
        console.error(`Failed to fetch suggestions for ${fileName}:`, error);
        setLoadingStates(prev => ({ ...prev, [fileName]: 'error' }));
      }
    };

    if (activeFile) {
      fetchSuggestionsForFile(activeFile);
    }
  }, [activeFile, files, profiles, loadingStates]);

  const handleActionSelect = (file: string, column: string, suggestion: CleaningSuggestion) => {
      const key = `${file}-${column}`;
      setSelectedActions(prev => ({
          ...prev,
          [key]: { file, column, suggestion }
      }));
  };
  
  const handleApplyChanges = () => {
    const newProfiles = JSON.parse(JSON.stringify(profiles));

    const actionsByFile: Record<string, AppliedAction[]> = {};
    Object.values(selectedActions).forEach(action => {
        if (!actionsByFile[action.file]) {
            actionsByFile[action.file] = [];
        }
        actionsByFile[action.file].push(action);
    });

    for (const fileName in actionsByFile) {
        const fileProfile = newProfiles[fileName];
        if (!fileProfile) continue;

        const actions = actionsByFile[fileName];
        let maxRowsToRemove = 0;

        actions.forEach(action => {
            const column = fileProfile.columns.find((c: { name: string; }) => c.name === action.column);
            if (!column) return;
            const originalMissingCount = column.missingValues;

            switch (action.suggestion.action) {
                case CleaningActionType.REMOVE_ROWS:
                    if (originalMissingCount > maxRowsToRemove) {
                        maxRowsToRemove = originalMissingCount;
                    }
                    column.missingValues = 0;
                    break;
                
                case CleaningActionType.FILL_MEAN:
                case CleaningActionType.FILL_MEDIAN:
                case CleaningActionType.FILL_MODE:
                case CleaningActionType.FILL_CUSTOM:
                    column.missingValues = 0;
                    column.uniqueValues += 1;
                    break;
                
                case CleaningActionType.CHANGE_TYPE:
                    if (action.suggestion.parameters?.targetType) {
                        column.dataType = action.suggestion.parameters.targetType;
                        // Simulate missing values from failed conversion
                        if (action.suggestion.parameters.targetType === 'number' && column.nonNumericCount) {
                            column.missingValues += column.nonNumericCount;
                            column.nonNumericCount = 0; // The non-numeric values are now "missing"
                        }
                    }
                    break;

                default:
                    break;
            }
        });

        if (maxRowsToRemove > 0) {
            const originalRowCount = fileProfile.rowCount;
            fileProfile.rowCount -= maxRowsToRemove;
            if (fileProfile.rowCount < 0) fileProfile.rowCount = 0;

            fileProfile.columns.forEach((col: any) => {
                if (!actions.some(a => a.column === col.name && a.suggestion.action === CleaningActionType.REMOVE_ROWS)) {
                   const removalRatio = maxRowsToRemove / originalRowCount;
                   const estimatedRemovals = Math.round(col.missingValues * removalRatio);
                   col.missingValues -= estimatedRemovals;
                   if (col.missingValues < 0) col.missingValues = 0;
                }
            });
        }
    }

    setProfiles(newProfiles);
    onProceed();
  };

  const renderSuggestionOptions = (fileName: string, columnName: string, suggestionsList: CleaningSuggestion[]) => {
      const key = `${fileName}-${columnName}`;
      const currentSelection = selectedActions[key]?.suggestion;
      
      // Deduplicate suggestions based on action and description
      const uniqueSuggestions = suggestionsList.filter((sug, index, self) =>
        index === self.findIndex((s) => (
            s.action === sug.action && s.description === sug.description
        ))
      );

      return (
          <fieldset className="mt-2">
            <legend className="sr-only">Cleaning options</legend>
            <div className="space-y-2">
            {uniqueSuggestions.map((sug, index) => (
                <div key={index} className="flex items-center">
                    <input
                        id={`${key}-${index}`}
                        name={key}
                        type="radio"
                        onChange={() => handleActionSelect(fileName, columnName, sug)}
                        checked={currentSelection?.action === sug.action && currentSelection?.description === sug.description}
                        className="h-4 w-4 text-cyan-600 border-gray-500 focus:ring-cyan-500"
                    />
                    <label htmlFor={`${key}-${index}`} className="ml-3 block text-sm font-medium text-gray-300">
                        {sug.description}
                    </label>
                </div>
            ))}
            </div>
          </fieldset>
      )
  };

  const renderActiveFileContent = () => {
      if (!activeFile) return null;
      const state = loadingStates[activeFile];
      const fileSuggestions = suggestions[activeFile];
      const profile = profiles[activeFile];
      
      if (state === 'loading') {
          return <div className="flex justify-center items-center p-10"><LoadingSpinner /> <span className="ml-3">Fetching AI Suggestions...</span></div>;
      }
      if (state === 'error') {
          return <div className="text-center p-10 text-red-400">Failed to load cleaning suggestions.</div>;
      }

      const columnsWithIssues = profile ? profile.columns.filter(c => c.missingValues > 0 || c.dataType === 'mixed') : [];

      if (columnsWithIssues.length === 0) {
           return <div className="text-center p-10 text-gray-400">No immediate cleaning issues found for this file.</div>;
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {columnsWithIssues.map(column => (
                <div key={column.name} className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
                    <h4 className="font-bold text-white">{column.name}</h4>
                    {column.missingValues > 0 && (
                        <p className="text-sm text-yellow-400 flex items-center gap-1 mt-1">
                            <ExclamationTriangleIcon className="w-4 h-4" />
                            {column.missingValues.toLocaleString()} Missing Values
                        </p>
                    )}
                    {column.dataType === 'mixed' && (
                         <p className="text-sm text-orange-400 flex items-center gap-1 mt-1">
                            <ExclamationTriangleIcon className="w-4 h-4" />
                            Mixed Data Types ({column.nonNumericCount} non-numeric)
                        </p>
                    )}
                    <div className="mt-4 border-t border-gray-600 pt-3">
                         {fileSuggestions && fileSuggestions[column.name] ?
                            renderSuggestionOptions(activeFile, column.name, fileSuggestions[column.name]) :
                            <LoadingSpinner />
                        }
                    </div>
                </div>
            ))}
        </div>
      );
  };


  if (files.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700 text-center">
        <h2 className="text-3xl font-bold text-white">Data Cleaning</h2>
        <p className="text-gray-400 mt-4">No files to clean. Please start by uploading your data.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-3"><FunnelIcon className="w-8 h-8"/> AI-Assisted Data Cleaning</h2>
            <p className="text-gray-400 mt-2">Review and apply AI-powered suggestions to improve your data quality.</p>
        </div>
        
        <div className="border-b border-gray-600">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {files.map(file => (
                    <button
                        key={file.name}
                        onClick={() => setActiveFile(file.name)}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeFile === file.name
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-400'
                            }`
                        }
                    >
                        {file.name}
                    </button>
                ))}
            </nav>
        </div>
        
        {renderActiveFileContent()}
      </div>

      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700 mt-8">
        <h3 className="text-xl font-semibold mb-4">Staged Changes</h3>
        {Object.keys(selectedActions).length === 0 ? (
            <p className="text-gray-500">No cleaning actions have been selected yet.</p>
        ) : (
            <ul className="space-y-2">
                {Object.values(selectedActions).map(action => (
                    <li key={`${action.file}-${action.column}`} className="text-gray-300">
                        <span className="font-semibold text-cyan-400">{action.file}</span> &gt; <span className="font-semibold text-gray-100">{action.column}</span>: {action.suggestion.description}
                    </li>
                ))}
            </ul>
        )}
        <div className="mt-6 text-center">
            <button
                onClick={handleApplyChanges}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-transform duration-200 transform hover:scale-105"
            >
                Apply Changes & Proceed to Modeling
            </button>
        </div>
      </div>
    </div>
  );
};

export default DataCleaning;