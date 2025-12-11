import React from 'react';
import { PieChart } from 'lucide-react';

const SpendingGraph = ({ transactions }) => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const total = expenses.reduce((acc, t) => acc + t.amount, 0);
    
    if (total === 0) return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 text-center text-gray-400 text-sm">
            <PieChart className="mx-auto mb-2 opacity-50" />
            No expense data to analyze yet.
        </div>
    );

    const catTotals = {};
    expenses.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.amount);
    
    const sortedCats = Object.entries(catTotals)
        .sort(([,a], [,b]) => b - a)
        .map(([cat, amount]) => ({
            cat, 
            amount, 
            percent: (amount / total) * 100
        }));

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart size={18} className="text-blue-500" /> Spending Breakdown
            </h4>
            <div className="space-y-4">
                {sortedCats.map((item, idx) => (
                    <div key={idx} className="group">
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-semibold text-gray-700">{item.cat}</span>
                            <span className="text-gray-500 font-medium">{Math.round(item.percent)}% <span className="text-gray-300">|</span> ₹{item.amount.toLocaleString()}</span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                    idx === 0 ? 'bg-rose-500' : 
                                    idx === 1 ? 'bg-orange-400' : 
                                    idx === 2 ? 'bg-blue-400' : 
                                    idx === 3 ? 'bg-indigo-400' : 'bg-slate-300'
                                }`} 
                                style={{ width: `${item.percent}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpendingGraph;