// apps/web/src/features/projects/components/ValidatedInput.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label?: string;
  helperText?: string;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  name,
  label,
  helperText,
  className = "",
  ...props
}) => {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name];

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={name} className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={name}
        {...register(name)}
        spellCheck="true" // Rule 1: Always enforce native browser spellcheck
        className={`px-3 py-2 border rounded-md bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors ${
          error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error?.message && (
        <span className="text-xs text-red-500 font-medium">
          {String(error.message)}
        </span>
      )}
      {!error?.message && helperText && (
        <span className="text-xs text-slate-400">
          {helperText}
        </span>
      )}
    </div>
  );
};