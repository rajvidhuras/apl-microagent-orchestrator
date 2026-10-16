import React, { useState, useEffect } from 'react';
import { X, Save, Server } from 'lucide-react';
import { Microservice } from '../types';
import {
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT,
  DEFAULT_GPT_MODEL,
} from '../services/llmService';

interface ServiceConfigModalProps {
  service: Microservice | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (serviceId: string, config: Microservice['connectionConfig']) => void;
}

export const ServiceConfigModal: React.FC<ServiceConfigModalProps> = ({ service, isOpen, onClose, onSave }) => {
  const [url, setUrl] = useState('');
  // API Key is managed globally, no need to ask user
  const [modelName, setModelName] = useState(DEFAULT_GPT_MODEL);

  useEffect(() => {
    if (service?.connectionConfig) {
      setUrl(service.connectionConfig.url);
      setModelName(service.connectionConfig.modelName || DEFAULT_GPT_MODEL);
    } else {
      setUrl(AZURE_OPENAI_ENDPOINT);
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const handleSave = () => {
    // Pass the hardcoded key here to satisfy the type definition, 
    // even though the service uses the global instance.
    onSave(service.id, {
      url,
      apiKey: AZURE_OPENAI_API_KEY,
      modelName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900">Configure {service.name}</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                <X size={24} />
            </button>
        </div>
        
        <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
                Configure this service as an agent. The <strong>Azure GPT-OSS API key</strong> is read from the application settings.
            </p>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Endpoint URL</label>
                <div className="relative">
                    <Server className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        placeholder={AZURE_OPENAI_ENDPOINT}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Target Model</label>
                <input 
                    type="text" 
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder={`e.g. ${DEFAULT_GPT_MODEL}`}
                />
            </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
            <button 
                onClick={handleSave}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
                <Save size={16} />
                Save Connection
            </button>
        </div>
      </div>
    </div>
  );
};
