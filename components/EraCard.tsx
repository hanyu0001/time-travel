import React from 'react';
import { HistoricalEra } from '../types';

interface EraCardProps {
  era: HistoricalEra;
  isSelected: boolean;
  onSelect: (era: HistoricalEra) => void;
}

export const EraCard: React.FC<EraCardProps> = ({ era, isSelected, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(era)}
      className={`
        cursor-pointer rounded-xl p-4 transition-all duration-300 border-2 relative overflow-hidden group
        ${isSelected 
          ? 'border-amber-500 bg-slate-800/80 shadow-[0_0_20px_rgba(245,158,11,0.3)] transform scale-105' 
          : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800'}
      `}
    >
      {/* Background Gradient Accent */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${era.color}`}></div>
      
      <div className="flex flex-col items-center text-center space-y-2">
        <span className="text-4xl filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300">{era.emoji}</span>
        <h3 className={`font-bold text-lg ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>{era.name}</h3>
        <p className="text-xs text-slate-400">{era.description}</p>
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
        </div>
      )}
    </div>
  );
};