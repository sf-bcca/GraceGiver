// components/CustomTooltip.tsx
import React from 'react';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-lg">
        <p className="font-bold text-slate-800">{label}</p>
        <p className="text-indigo-600">
          {`Amount: $${payload[0].value.toLocaleString()}`}
        </p>
      </div>
    );
  }

  return null;
};

export default CustomTooltip;
