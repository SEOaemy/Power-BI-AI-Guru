import React, { useState, useCallback } from 'react';
import { generateDaxFromNaturalLanguage } from '../services/geminiService';
import { DaxGenerationResponse } from '../types';
import { SparklesIcon, LightBulbIcon, ExclamationTriangleIcon } from './IconComponents';
import CodeBlock from './CodeBlock';
import LoadingSpinner from './LoadingSpinner';

const KPICreationDAXGenerator: React.FC = () => {
  const [userInput, setUserInput] = useState<string>('');
  const [generatedResult, setGeneratedResult] = useState<DaxGenerationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userInput.trim()) {
      setError("Please enter a description for the KPI you want to create.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedResult(null);

    try {
      const result = await generateDaxFromNaturalLanguage(userInput);
      setGeneratedResult(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [userInput]);
  
  const examplePrompts = [
    "Calculate total sales revenue.",
    "Show the year-over-year sales growth.",
    "Count the number of unique customers this month.",
    "Find the average product price for the 'Electronics' category."
  ];

  const handleExampleClick = (prompt: string) => {
      setUserInput(prompt);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white">Natural Language to DAX Generator</h2>
        <p className="text-gray-400 mt-2">Describe the KPI or measure you need, and let AI craft the DAX formula for you.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="e.g., 'Calculate the total sales for the last quarter'"
          className="w-full h-28 p-4 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow duration-200 resize-none"
          disabled={isLoading}
          aria-label="KPI description input"
        />
        <div className="flex items-center justify-center">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-transform duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                <span>Generate DAX</span>
              </>
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">Or try an example:</p>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
            {examplePrompts.map((prompt, index) => (
                <button key={index} onClick={() => handleExampleClick(prompt)} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 py-1 px-3 rounded-full transition-colors">
                    {prompt}
                </button>
            ))}
        </div>
      </div>

      <div className="mt-8">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {generatedResult && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">Generated DAX Formula</h3>
              <CodeBlock code={generatedResult.dax_formula} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">Explanation</h3>
              <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                <p className="text-gray-300 whitespace-pre-wrap">{generatedResult.explanation}</p>
              </div>
            </div>
             <div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2 flex items-center gap-2">
                <LightBulbIcon className="w-6 h-6 text-yellow-400" />
                Optimization Tips
              </h3>
              <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                <p className="text-gray-300 whitespace-pre-wrap">{generatedResult.optimization_tips}</p>
              </div>
            </div>
             <div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-6 h-6 text-orange-400" />
                Common Pitfalls
              </h3>
              <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                <p className="text-gray-300 whitespace-pre-wrap">{generatedResult.common_pitfalls}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICreationDAXGenerator;
