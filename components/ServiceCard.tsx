import React from 'react';
import { ShieldAlert, Terminal, CheckCircle2, Bot } from 'lucide-react';
import { Microservice } from '../types';

interface ServiceCardProps {
  service: Microservice;
  onConnect: (service: Microservice) => void;
  onViewSecurity: (service: Microservice) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onConnect, onViewSecurity }) => {
  const highRisks = service.owaspRisks.filter(r => r.severity === 'HIGH').length;

  return (
    <div className={`
        relative p-6 rounded-xl border transition-all duration-300 flex flex-col h-full
        ${service.isAgentic 
            ? 'bg-white border-sky-200 shadow-[0_12px_30px_rgba(14,165,233,0.12)]' 
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}
    `}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${service.isAgentic ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
                {service.isAgentic ? <Bot size={20} /> : <Terminal size={20} />}
            </div>
            <div>
                <h3 className="font-semibold text-slate-900">{service.name}</h3>
                <span className="text-xs text-slate-500 font-mono">{service.endpoints.length} Endpoints</span>
            </div>
        </div>
        {service.isAgentic && <CheckCircle2 className="text-sky-600 w-5 h-5" />}
      </div>

      <p className="text-sm text-slate-600 mb-6 flex-grow line-clamp-3">
        {service.description}
      </p>

      {/* Security Status */}
      <div className="mb-4">
        <button 
            onClick={(e) => { e.stopPropagation(); onViewSecurity(service); }}
            className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border
                ${highRisks > 0 
                    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}
            `}
        >
            <span className="flex items-center gap-2">
                <ShieldAlert size={14} />
                OWASP Analysis
            </span>
            <span>{highRisks} High Risks</span>
        </button>
      </div>

      {/* Actions */}
      <button
        onClick={() => onConnect(service)}
        className={`
            w-full py-2.5 rounded-lg text-sm font-medium transition-colors
            ${service.isAgentic 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200' 
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-200/50'}
        `}
      >
        {service.isAgentic ? 'Configure Connection' : 'Promote to Agent'}
      </button>
    </div>
  );
};
