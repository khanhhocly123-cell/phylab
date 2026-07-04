"use client";

import React from "react";

interface RulerProps {
  left: number;
  width: number;
}

export default function Ruler({ left, width }: RulerProps) {
  return (
    <div 
      className="absolute z-10 bg-amber-50/90 border border-amber-200/60 rounded-md shadow-xs animate-scale-up py-1 px-3 pointer-events-none select-none flex flex-col justify-between"
      style={{
        left: left,
        top: 256,
        width: width,
        height: 26
      }}
    >
      {/* Millimeter and Centimeter tick marks */}
      <div className="w-full h-2.5 flex justify-between relative">
        {Array.from({ length: 51 }).map((_, i) => {
          const isMajor = i % 5 === 0;
          const isMid = i % 5 !== 0 && i % 2.5 === 0;
          return (
            <div 
              key={i} 
              className="bg-amber-900/60"
              style={{
                width: isMajor ? "1.5px" : "0.5px",
                height: isMajor ? "10px" : "6px",
              }}
            />
          );
        })}
      </div>
      
      {/* Centimeter numbers */}
      <div className="w-full flex justify-between text-[7px] font-black text-amber-900/50 font-mono leading-none px-0.5">
        <span>0</span>
        <span>10</span>
        <span>20</span>
        <span>30</span>
        <span>40</span>
        <span>50</span>
        <span>60</span>
        <span>70</span>
        <span>80</span>
        <span>90</span>
        <span>100</span>
      </div>
    </div>
  );
}
