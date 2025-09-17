import React, { useCallback, useRef, useState } from 'react';
import { ArrowUpTrayIcon, XCircleIcon, DocumentTextIcon, TableCellsIcon, CodeBracketIcon } from '../IconComponents';

interface DataUploadProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onProceed: () => void;
}

const DataUpload: React.FC<DataUploadProps> = ({ files, setFiles, onProceed }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  }, [setFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
       const newFiles = Array.from(e.target.files);
       setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };
    
  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
    
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

  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white">Data Upload & Ingestion</h2>
        <p className="text-gray-400 mt-2">Start by uploading your data files. Supported formats: CSV, Excel, JSON.</p>
      </div>
      
      <form id="form-file-upload" onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()}>
        <input ref={inputRef} type="file" id="input-file-upload" multiple={true} onChange={handleChange} className="hidden" />
        <label 
          id="label-file-upload" 
          htmlFor="input-file-upload" 
          className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${dragActive ? 'border-cyan-400 bg-gray-700/50' : 'border-gray-600 hover:border-cyan-500 hover:bg-gray-700/30'}`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <ArrowUpTrayIcon className={`w-12 h-12 mb-4 transition-transform duration-300 ${dragActive ? 'text-cyan-400 scale-110' : 'text-gray-500'}`} />
            <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-500">CSV, XLSX, or JSON files</p>
          </div> 
        </label>
         { dragActive && <div className="absolute inset-0 w-full h-full rounded-lg" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}></div> }
      </form>
      
      {files.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-200 mb-4">File Queue</h3>
          <ul className="space-y-3">
            {files.map((file, index) => (
              <li key={index} className="flex items-center justify-between bg-gray-900/70 p-3 rounded-lg border border-gray-700 animate-fade-in">
                <div className="flex items-center space-x-4">
                  {getFileIcon(file.name)}
                  <div>
                    <p className="font-medium text-gray-200">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => removeFile(index)} className="p-1 text-gray-500 hover:text-red-400 rounded-full transition-colors" aria-label="Remove file">
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </li>
            ))}
          </ul>
           <div className="mt-6 text-center">
                <button 
                    onClick={onProceed}
                    disabled={files.length === 0}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-transform duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
                >
                    Proceed to Profiling
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default DataUpload;