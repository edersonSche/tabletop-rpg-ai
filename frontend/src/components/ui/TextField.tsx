import { memo, InputHTMLAttributes } from 'react';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  error?: string;
  inputClassName?: string;
}

export const TextField = memo(function TextField({
  label,
  error,
  inputClassName = '',
  ...props
}: TextFieldProps) {
  return (
    <div>
      {label && (
        <label className="font-pixel text-xs text-stone-400 block mb-2 tracking-wider">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`input-field ${error ? 'border-blood-600 focus:border-blood-500 focus:shadow-glow-red' : ''} ${inputClassName}`}
      />
      {error && (
        <p className="font-pixel text-xs text-blood-500 mt-1">{error}</p>
      )}
    </div>
  );
});
