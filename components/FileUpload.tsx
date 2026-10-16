import React, { useState } from 'react';
import { UploadCloud, FileText, FileJson, AlertCircle } from 'lucide-react';
import { Microservice } from '../types';
import {
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT,
  DEFAULT_GPT_MODEL,
} from '../services/llmService';
import { parseServiceDefinition } from '../services/serviceDefinition';

interface FileUploadProps {
  onServicesLoaded: (services: Microservice[]) => void;
  compact?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onServicesLoaded, compact = false }) => {
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const services = parseServiceDefinition(content, file.name, {
          url: AZURE_OPENAI_ENDPOINT,
          apiKey: AZURE_OPENAI_API_KEY,
          modelName: DEFAULT_GPT_MODEL,
        });
        onServicesLoaded(services);
      } catch (err: any) {
        console.error("Failed to parse file", err);
        setError(err.message || "Unknown parsing error");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      processFile(event.target.files[0]);
    }
  };

  return (
    <div className={`w-full mx-auto transition-all duration-300 ${compact ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <div 
            className={`
                border-2 border-dashed rounded-2xl transition-all group cursor-pointer relative flex flex-col items-center justify-center bg-white
                ${compact ? 'min-h-[120px] p-6 flex-row gap-6' : 'min-h-[300px] p-12'}
                ${dragActive 
                    ? 'border-sky-500 bg-sky-50 scale-[1.02]' 
                    : 'border-slate-300 hover:bg-slate-50 hover:border-slate-400'}
                ${error ? 'border-red-400 bg-red-50' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input 
                type="file" 
                accept=".yaml,.yml,.json" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            <div className={`rounded-full transition-colors flex-shrink-0 ${compact ? 'p-3 bg-sky-100' : 'p-6 mb-6 ' + (dragActive ? 'bg-sky-200' : 'bg-sky-100 group-hover:bg-sky-200')}`}>
                <UploadCloud className={`${compact ? 'w-6 h-6' : 'w-12 h-12'} ${dragActive ? 'text-sky-500' : 'text-sky-600'}`} />
            </div>
            
            <div className={`flex flex-col ${compact ? 'text-left items-start flex-1' : 'text-center items-center'}`}>
                <h3 className={`${compact ? 'text-lg' : 'text-2xl'} font-semibold text-slate-900 ${compact ? '' : 'mb-2'}`}>
                    {compact ? 'Upload another definition' : 'Upload Service Definition'}
                </h3>
                <p className={`text-slate-600 ${compact ? 'text-xs' : 'mb-8 max-w-md'}`}>
                    Drag & drop <strong>YAML</strong>, <strong>JSON</strong>, <strong>Docker Compose</strong>, or <strong>OpenAPI</strong> files.
                    {compact ? '' : <><br/>Imported services are added to the library as agents.</>}
                </p>

                {!compact && (
                    <div className="flex gap-4 text-xs text-slate-600 font-mono bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2">
                            <FileText size={14} />
                            <span>docker-compose.yml</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FileJson size={14} />
                            <span>openapi.json</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FileText size={14} />
                            <span>k8s.yaml</span>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="absolute bottom-4 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 z-20">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
        </div>
    </div>
  );
};
