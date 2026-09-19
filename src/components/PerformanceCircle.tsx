'use client';

import React from 'react';

interface PerformanceCircleProps {
  percentage: number;
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export default function PerformanceCircle({
  percentage,
  label,
  sublabel,
  size = 110,
  strokeWidth = 9,
  color = '#3b69fc',
}: PerformanceCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-3 text-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-300 dark:text-slate-800"
          />
          {/* Animated Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono font-black text-black dark:text-white">
          <span className="text-xl font-black">{percentage}%</span>
        </div>
      </div>

      <span className="text-xs font-black text-black dark:text-white mt-2.5 block">{label}</span>
      {sublabel && (
        <span className="text-[10px] font-extrabold text-black dark:text-slate-300 mt-0.5 block">{sublabel}</span>
      )}
    </div>
  );
}
