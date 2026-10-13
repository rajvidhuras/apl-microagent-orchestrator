import React, { useState } from 'react';
import { UploadCloud, FileText, FileJson, AlertCircle } from 'lucide-react';
import yaml from 'js-yaml';
import { Microservice } from '../types';
import {
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT,
  DEFAULT_GPT_MODEL,
} from '../services/llmService';
import { readAplMetadata } from '../services/systemicStress';

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
        let parsedData: any;
        
        // Handle JSON
        if (file.name.toLowerCase().endsWith('.json')) {
            try {
                parsedData = JSON.parse(content);
            } catch (e) {
                throw new Error("Invalid JSON format");
            }
        } 
        // Handle YAML
        else {
            try {
                parsedData = yaml.load(content);
                if (parsedData === undefined) {
                     throw new Error("Could not initialize YAML parser.");
                }
            } catch(e2: any) {
                console.error("YAML Parse Error:", e2);
                throw new Error("Invalid YAML format. Please check syntax.");
            }
        }

        if (!parsedData) {
            throw new Error("File appears empty.");
        }

        console.log("Parsed Data:", parsedData);

        // Normalize structure to Microservice[]
        let rawServices: any[] = [];
        
        // Strategy 1: Root is Array (Standard List)
        if (Array.isArray(parsedData)) {
            rawServices = parsedData;
        } 
        // Strategy 2: 'services' key (Docker Compose / Custom)
        else if (parsedData.services) {
            if (Array.isArray(parsedData.services)) {
                rawServices = parsedData.services;
            } else if (typeof parsedData.services === 'object') {
                // Handle services: { name: { ... } } (Docker Compose style)
                rawServices = Object.entries(parsedData.services).map(([key, val]: [string, any]) => ({
                    name: key,
                    description: val.description || (val.image ? `Image: ${val.image}` : `Service defined in ${key}`),
                    endpoints: val.ports ? val.ports.map((p: any) => `port:${p}`) : [],
                    ...val
                }));
            }
        } 
        // Strategy 3: 'microservices' key
        else if (parsedData.microservices && Array.isArray(parsedData.microservices)) {
            rawServices = parsedData.microservices;
        }
        // Strategy 4: OpenAPI / Swagger Spec (Single Service)
        else if (parsedData.openapi || parsedData.swagger) {
            const title = parsedData.info?.title || file.name.split('.')[0];
            const desc = parsedData.info?.description || 'Imported from OpenAPI definition';
            const endpoints = parsedData.paths ? Object.keys(parsedData.paths) : [];
            
            rawServices = [{
                name: title,
                description: desc,
                endpoints: endpoints,
                isAgentic: false,
                aplSource: parsedData
            }];
        }
        // Strategy 5: Kubernetes Manifest (Single Service/Deployment or List)
        else if (parsedData.kind) {
            if (parsedData.kind === 'List' && Array.isArray(parsedData.items)) {
                 rawServices = parsedData.items.map((i: any) => ({
                     name: i.metadata?.name || 'K8s Resource',
                     description: `Kubernetes ${i.kind}`,
                     endpoints: [],
                     ...i.spec
                 }));
            } else if (parsedData.metadata?.name) {
                 rawServices = [{
                     name: parsedData.metadata.name,
                     description: `Kubernetes ${parsedData.kind}`,
                     endpoints: [],
                     ...parsedData.spec
                 }];
            }
        }
        // Strategy 6: Root Object Map (e.g. { "service-a": { ... }, "service-b": { ... } })
        else if (typeof parsedData === 'object') {
             // If it's a map, try to extract keys as names
             const entries = Object.entries(parsedData);
             // Filter out likely metadata keys if mixed (e.g. "version": "3")
             const possibleServices = entries.filter(([key, val]) => {
                 if (key === 'version' || key === 'networks' || key === 'volumes') return false;
                 return typeof val === 'object' && val !== null;
             });

             if (possibleServices.length > 0) {
                 rawServices = possibleServices.map(([k, v]: [string, any]) => ({
                     name: k,
                     description: v.description || (v.image ? `Image: ${v.image}` : "Imported generic service"),
                     endpoints: v.ports || [],
                     ...v
                 }));
             }
        }

        if (rawServices.length === 0) {
             throw new Error("No identifiable service definitions found. Ensure file contains a list of services or a 'services' map.");
        }
        
        // Map to internal Microservice type
        const services: Microservice[] = rawServices.map((s: any, index: number) => ({
            id: s.id || `svc-${index}-${Date.now()}`,
            name: s.name || `Service ${index + 1}`,
            description: s.description || (s.image ? `Docker image: ${s.image}` : 'No description provided'),
            endpoints: Array.isArray(s.endpoints) ? s.endpoints : (s.url ? [s.url] : []),
            // AUTO-ENABLE AGENTIC MODE
            isAgentic: true, 
            connectionConfig: {
                url: AZURE_OPENAI_ENDPOINT,
                apiKey: AZURE_OPENAI_API_KEY,
                modelName: DEFAULT_GPT_MODEL
            },
            usageCount: 0,
            owaspRisks: [],
            // APL: optional domain + stress score declared in the definition
            ...readAplMetadata(s.aplSource ?? s)
        }));

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
                    {compact ? '' : <><br/>We will automatically apply the <span className="text-sky-600 font-medium">Agentic Wrapper</span> to all services.</>}
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
