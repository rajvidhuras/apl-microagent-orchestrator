import React from 'react';
import { X, ShieldCheck, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { Microservice } from '../types';

interface OwaspReportProps {
  isOpen: boolean;
  onClose: () => void;
  service: Microservice | null;
}

export const OwaspReport: React.FC<OwaspReportProps> = ({ isOpen, onClose, service }) => {
  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
            <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="text-emerald-500" />
                    OWASP Top 10 for LLM Applications 2025
                </h2>
                <p className="text-sm text-slate-600 mt-1">Security Audit for <span className="text-sky-700 font-semibold">{service.name}</span></p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-lg transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {service.owaspRisks.length === 0 ? (
                <div className="text-center py-12">
                    <ShieldCheck className="w-16 h-16 text-emerald-500/60 mx-auto mb-4" />
                    <p className="text-slate-800 font-medium">No automated risks detected.</p>
                    <p className="text-slate-500 text-sm">The initial scan did not flag any obvious vulnerabilities based on the description.</p>
                </div>
            ) : (
                service.owaspRisks.map((risk, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-5 border border-slate-200 flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                            {risk.severity === 'HIGH' ? <AlertOctagon className="text-red-500" /> : 
                             risk.severity === 'MEDIUM' ? <AlertTriangle className="text-amber-500" /> :
                             <Info className="text-blue-500" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-bold text-slate-900">{risk.id}</h4>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                    risk.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 
                                    risk.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {risk.severity}
                                </span>
                            </div>
                            <p className="text-slate-700 text-sm mb-3">{risk.description}</p>
                            
                            <div className="bg-white rounded p-3 text-xs border border-slate-200">
                                <span className="text-slate-500 font-bold uppercase tracking-wide block mb-1">Mitigation Strategy</span>
                                <span className="text-slate-700">{risk.mitigation}</span>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};
