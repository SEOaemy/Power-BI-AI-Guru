import React, { useState, useEffect } from 'react';
import { FullProfileResult, Relationship, RelationshipSuggestion, RelationshipType } from '../../types';
import { generateRelationshipSuggestions } from '../../services/geminiService';
import { CubeTransparentIcon, ArrowRightCircleIcon, CpuChipIcon, LinkIcon, TrashIcon, ChevronDownIcon, InformationCircleIcon } from '../IconComponents';
import LoadingSpinner from '../LoadingSpinner';

interface DataModelingProps {
    profiles: Record<string, FullProfileResult>;
    relationships: Relationship[];
    setRelationships: React.Dispatch<React.SetStateAction<Relationship[]>>;
    onProceed: () => void;
}

const DataModeling: React.FC<DataModelingProps> = ({ profiles, relationships, setRelationships, onProceed }) => {
    const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchSuggestions = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await generateRelationshipSuggestions(profiles);
                setSuggestions(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to fetch AI suggestions.");
            } finally {
                setIsLoading(false);
            }
        };

        // Initialize all tables to a collapsed state
        const initialExpandedState = Object.keys(profiles).reduce((acc, key) => ({ ...acc, [key]: false }), {});
        setExpandedTables(initialExpandedState);

        fetchSuggestions();
    }, [profiles]);

    const handleAcceptSuggestion = (suggestion: RelationshipSuggestion) => {
        const newRelationship: Relationship = {
            fromTable: suggestion.fromTable,
            fromColumn: suggestion.fromColumn,
            toTable: suggestion.toTable,
            toColumn: suggestion.toColumn,
            type: suggestion.type,
        };
        // Avoid adding duplicate relationships
        if (!relationships.some(r => JSON.stringify(r) === JSON.stringify(newRelationship))) {
            setRelationships(prev => [...prev, newRelationship]);
        }
        // Remove the accepted suggestion from the list
        setSuggestions(prev => prev.filter(s => s !== suggestion));
    };

    const handleRemoveRelationship = (index: number) => {
        setRelationships(prev => prev.filter((_, i) => i !== index));
    };
    
    const toggleTable = (tableName: string) => {
        setExpandedTables(prev => ({ ...prev, [tableName]: !prev[tableName] }));
    };

    const ConfidenceBadge: React.FC<{ level: 'High' | 'Medium' | 'Low' }> = ({ level }) => {
        const styles = {
            High: 'bg-green-500/20 text-green-300 border-green-500/30',
            Medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
            Low: 'bg-red-500/20 text-red-300 border-red-500/30',
        };
        return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${styles[level]}`}>{level} Confidence</span>;
    };

    if (Object.keys(profiles).length < 2) {
        return (
             <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700 text-center flex flex-col items-center">
                <CubeTransparentIcon className="w-16 h-16 text-cyan-400 mb-4" />
                <h1 className="text-3xl font-bold text-white">Data Modeling</h1>
                <p className="text-gray-400 mt-4 max-w-2xl">
                    Data modeling requires at least two data files to define relationships. Please upload another file to continue.
                </p>
                <div className="mt-8">
                    <button onClick={onProceed} className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-md transition-transform duration-200 transform hover:scale-105">
                        <span>Skip to KPIs & DAX</span>
                        <ArrowRightCircleIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-7xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white">AI-Assisted Data Modeling</h2>
                <p className="text-gray-400 mt-2">Define relationships between your tables to build a coherent data model.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Tables */}
                <div className="lg:col-span-1 bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700 h-fit">
                    <h3 className="text-xl font-semibold text-white mb-4">Available Tables</h3>
                    <div className="space-y-3">
                        {Object.entries(profiles).map(([fileName, profile]) => (
                            <div key={fileName} className="bg-gray-900/70 rounded-lg border border-gray-700">
                                <button onClick={() => toggleTable(fileName)} className="w-full flex justify-between items-center p-3 text-left">
                                    <span className="font-semibold text-gray-200">{fileName}</span>
                                    <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expandedTables[fileName] ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedTables[fileName] && (
                                    <ul className="p-3 border-t border-gray-700 max-h-48 overflow-y-auto">
                                        {profile.columns.map(col => <li key={col.name} className="text-sm text-gray-400 truncate py-0.5">{col.name}</li>)}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Suggestions & Defined Relationships */}
                <div className="lg:col-span-2 space-y-8">
                    {/* AI Suggestions */}
                    <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <CpuChipIcon className="w-6 h-6 text-cyan-400"/> AI Relationship Suggestions
                        </h3>
                        {isLoading && <div className="flex justify-center p-4"><LoadingSpinner /></div>}
                        {error && <p className="text-red-400">{error}</p>}
                        {!isLoading && !error && suggestions.length === 0 && <p className="text-gray-500">No new relationships suggested by the AI.</p>}
                        <div className="space-y-4">
                            {suggestions.map((sug, i) => (
                                <div key={i} className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 font-mono text-sm">
                                                <span className="font-semibold text-cyan-300">{sug.fromTable}</span>.<span>{sug.fromColumn}</span>
                                                <LinkIcon className="w-4 h-4 text-gray-500"/>
                                                <span className="font-semibold text-cyan-300">{sug.toTable}</span>.<span>{sug.toColumn}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 italic">{sug.reason}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <p className="text-sm font-semibold">{sug.type}</p>
                                            <ConfidenceBadge level={sug.confidence} />
                                        </div>
                                    </div>
                                    <div className="text-right mt-3">
                                        <button onClick={() => handleAcceptSuggestion(sug)} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md transition-colors">
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Defined Relationships */}
                    <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <LinkIcon className="w-6 h-6" /> Defined Relationships
                        </h3>
                        {relationships.length === 0 ? (
                            <p className="text-gray-500">No relationships defined yet. Accept an AI suggestion to get started.</p>
                        ) : (
                             <ul className="space-y-2">
                                {relationships.map((rel, i) => (
                                    <li key={i} className="flex justify-between items-center bg-gray-900/70 p-3 rounded-lg border border-gray-700">
                                        <div className="flex items-center gap-2 font-mono text-sm">
                                            <span className="font-semibold text-cyan-300">{rel.fromTable}</span>.<span>{rel.fromColumn}</span>
                                            <ArrowRightCircleIcon className="w-4 h-4 text-gray-500"/>
                                            <span className="font-semibold text-cyan-300">{rel.toTable}</span>.<span>{rel.toColumn}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                           <span className="text-sm text-gray-300">{rel.type}</span>
                                           <button onClick={() => handleRemoveRelationship(i)} className="text-gray-500 hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-10 text-center">
                <button onClick={onProceed} className="flex items-center justify-center space-x-2 mx-auto px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-transform duration-200 transform hover:scale-105">
                    <span>Proceed to KPIs & DAX</span>
                    <ArrowRightCircleIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default DataModeling;