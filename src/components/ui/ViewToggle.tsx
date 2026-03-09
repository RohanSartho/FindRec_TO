"use client";

import clsx from "clsx";
import { ElementType } from "react";

export interface ViewOption<T extends string> {
  id: T;
  label: string;
  icon: ElementType;
}

interface ViewToggleProps<T extends string> {
  options: ViewOption<T>[];
  value: T;
  onChange: (id: T) => void;
}

export function ViewToggle<T extends string>({ options, value, onChange }: ViewToggleProps<T>) {
  return (
    <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition",
            value === id ? "bg-brand text-white" : "text-gray-500 bg-white hover:bg-gray-50"
          )}
          aria-label={`${label} view`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
