import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ServiceCard } from './components/ServiceCard';
import { ServiceConfigModal } from './components/ServiceConfigModal';
import { Orchestrator } from './components/Orchestrator';
import { AgentsLeaderboard } from './components/AgentsLeaderboard';
import { OwaspReport } from './components/OwaspReport';
import { Registry } from './components/Registry';
import { SystemicStress } from './components/SystemicStress';
import { Microservice } from './types';
import { Network, Bot, BarChart3, Upload, ClipboardList, Activity } from 'lucide-react';
import { analyzeOwaspRisks } from './services/llmService.ts';

type Tab = 'lab' | 'studio' | 'analytics' | 'registry' | 'systemic';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('lab');
  const [services, setServices] = useState<Microservice[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [securityModalServiceId, setSecurityModalServiceId] = useState<string | null>(null);

  const handleServicesLoaded = async (newServices: Microservice[]) => {
    // Append new services instead of replacing, to allow multi-file upload
    setServices(prev => [...prev, ...newServices]);
    
    // Auto-trigger security analysis in background for new services
    const analysedServices = await Promise.all(newServices.map(async (svc) => {
        const risks = await analyzeOwaspRisks(svc.name, svc.description, svc.endpoints);
        return { ...svc, owaspRisks: risks };
    }));
    
    setServices(prev => {
        // Merge the analysed versions back in
        return prev.map(p => {
            const foundAnalyzed = analysedServices.find(a => a.id === p.id);
            return foundAnalyzed || p;
        });
    });
  };

  const handleOpenConfig = (service: Microservice) => {
    setSelectedServiceId(service.id);
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = (serviceId: string, config: any) => {
    setServices(prev => prev.map(s => 
      s.id === serviceId 
        ? { ...s, isAgentic: true, connectionConfig: config } 
        : s
    ));
  };

  const handleOpenSecurity = (service: Microservice) => {
    setSecurityModalServiceId(service.id);
  };

  const handleUpdateAgent = (agentId: string, patch: Partial<Microservice>) => {
    setServices(prev => prev.map(s => (s.id === agentId ? { ...s, ...patch } : s)));
  };

  const handleAgentsUsed = (agentIds: string[]) => {
    setServices(prev => prev.map(s => 
        agentIds.includes(s.id) 
            ? { ...s, usageCount: s.usageCount + 1 }
            : s
    ));
  };

  const selectedService = services.find(s => s.id === selectedServiceId) || null;
  const securityService = services.find(s => s.id === securityModalServiceId) || null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-900 flex flex-col font-sans selection:bg-sky-200/60" style={{ fontFamily: 'Aptos, "Segoe UI", "Inter", system-ui, sans-serif' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-tr from-sky-500 to-cyan-400 rounded-lg shadow-lg shadow-sky-200/40">
                    <Network className="text-white" size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">MicroAgent Orchestrator</h1>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wider">GPT-OSS 120B POWERED</p>
                </div>
            </div>
            
            {/* Tab Navigation */}
            <nav className="flex space-x-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                <button 
                    onClick={() => setActiveTab('lab')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'lab' ? 'bg-sky-100 text-sky-900 shadow-sm border border-sky-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                    <Upload size={16} />
                    Service Lab
                </button>
                <button 
                    onClick={() => setActiveTab('studio')}
                    disabled={services.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'studio' ? 'bg-sky-100 text-sky-900 shadow-sm border border-sky-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                >
                    <Bot size={16} />
                    Orchestration Studio
                </button>
                <button 
                    onClick={() => setActiveTab('analytics')}
                    disabled={services.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-sky-100 text-sky-900 shadow-sm border border-sky-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                >
                    <BarChart3 size={16} />
                    Analytics
                </button>
                <button 
                    onClick={() => setActiveTab('registry')}
                    disabled={services.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'registry' ? 'bg-sky-100 text-sky-900 shadow-sm border border-sky-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                >
                    <ClipboardList size={16} />
                    Registry
                </button>
                <button
                    onClick={() => setActiveTab('systemic')}
                    disabled={services.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'systemic' ? 'bg-sky-100 text-sky-900 shadow-sm border border-sky-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                >
                    <Activity size={16} />
                    Systemic Stress
                </button>
            </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 overflow-hidden flex flex-col">
        
        {/* Tab 1: Upload & Wrapper Creation */}
        {activeTab === 'lab' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Service Lab</h2>
                        <p className="text-slate-600">Upload your YAML/JSON file. We will automatically apply the agentic wrapper.</p>
                    </div>
                    {services.length > 0 && (
                        <button 
                            onClick={() => setServices([])} 
                            className="text-sm text-red-400 hover:text-red-300 hover:underline px-4 py-2"
                        >
                            Reset Library
                        </button>
                    )}
                </div>

                <div className="mt-8">
                    <FileUpload 
                        onServicesLoaded={handleServicesLoaded} 
                        compact={services.length > 0} 
                    />
                </div>

                {services.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {services.map(svc => (
                            <ServiceCard 
                                key={svc.id} 
                                service={svc} 
                                onConnect={handleOpenConfig} 
                                onViewSecurity={handleOpenSecurity}
                            />
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* Tab 2: Orchestration Studio (List + Chat) */}
        {activeTab === 'studio' && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Orchestration Studio</h2>
                    <p className="text-slate-600">Push your problem to the chat. View all available microservices on the left.</p>
                </div>
                <div className="flex-1 min-h-[600px]">
                    <Orchestrator agents={services} onAgentsUsed={handleAgentsUsed} />
                </div>
            </div>
        )}

        {/* Tab 3: Analytics Leaderboard */}
        {activeTab === 'analytics' && (
            <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Micro-Agent Leaderboard</h2>
                    <p className="text-slate-600">Tracking execution counts and agent performance.</p>
                </div>
                <AgentsLeaderboard agents={services} />
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 text-center shadow-sm">
                        <div className="text-4xl font-bold text-slate-900 mb-2">{services.length}</div>
                        <div className="text-sm text-slate-600">Total Services</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 text-center shadow-sm">
                        <div className="text-4xl font-bold text-emerald-600 mb-2">{services.filter(s => s.isAgentic).length}</div>
                        <div className="text-sm text-slate-600">Active Agents</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 text-center shadow-sm">
                        <div className="text-4xl font-bold text-sky-600 mb-2">
                            {services.reduce((acc, curr) => acc + curr.usageCount, 0)}
                        </div>
                        <div className="text-sm text-slate-600">Total Invocations</div>
                    </div>
                </div>
            </div>
        )}

        {/* Tab 4: Operational Registry */}
        {activeTab === 'registry' && (
            <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Registry agents={services} />
            </div>
        )}

        {/* Tab 5: Systemic Stress (joint-probability dimension) */}
        {activeTab === 'systemic' && (
            <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SystemicStress agents={services} onUpdateAgent={handleUpdateAgent} />
            </div>
        )}

      </main>

      {/* Modals */}
      <ServiceConfigModal 
        isOpen={isConfigModalOpen} 
        onClose={() => setIsConfigModalOpen(false)}
        service={selectedService}
        onSave={handleSaveConfig}
      />

      <OwaspReport 
        isOpen={!!securityModalServiceId}
        onClose={() => setSecurityModalServiceId(null)}
        service={securityService}
      />
    </div>
  );
};

export default App;
