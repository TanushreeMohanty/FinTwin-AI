import React from 'react';
import { TrendingUp, AlertCircle, Lightbulb } from 'lucide-react';

const InsightCard = ({ insight }) => (
  <div className={`p-4 rounded-xl border-l-4 mb-3 shadow-sm transition-all hover:shadow-md ${
    insight.type === 'danger' ? 'bg-red-50 border-red-500 text-red-900' :
    insight.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-900' :
    'bg-emerald-50 border-emerald-500 text-emerald-900'
  }`}>
    <div className="flex items-start gap-3">
      {insight.type === 'success' ? (
          <div className="bg-emerald-100 p-1.5 rounded-full"><TrendingUp size={18} className="text-emerald-600" /></div>
      ) : (
          <div className={`p-1.5 rounded-full ${insight.type === 'danger' ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertCircle size={18} className={insight.type === 'danger' ? 'text-red-600' : 'text-amber-600'} />
          </div>
      )}
      <div>
        <p className="text-sm font-bold leading-tight mb-1">{insight.message}</p>
        {insight.suggestion && (
            <div className="mt-2 text-xs flex gap-2 items-start opacity-90 bg-white/50 p-2 rounded-lg">
                <Lightbulb size={14} className="mt-0.5 shrink-0" />
                <span>{insight.suggestion}</span>
            </div>
        )}
      </div>
    </div>
  </div>
);

export default InsightCard;