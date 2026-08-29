import React from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

/**
 * FormField Component
 * 
 * A wrapper around the native input element that properly associates error messages
 * with the input using aria-describedby and role="alert" for accessibility.
 * 
 * Meets WCAG 2.1 Level AA requirements for form validation (3.3.1 Error Identification).
 * 
 * @example
 * ```tsx
 * <FormField
 *   label="Email"
 *   name="email"
 *   type="email"
 *   error={formErrors.email}
 *   helperText="We'll never share your email"
 *   {...register('email')}
 * />
 * ```
 */
export function FormField({
  label,
  error,
  helperText,
  id,
  name,
  required,
  className = '',
  ...props
}: FormFieldProps) {
  const fieldId = id || name || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;

  // Build aria-describedby: error message takes priority, then helper text
  const describedBy = error ? errorId : helperText ? helperId : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="ml-1 text-red-500" aria-label="required">*</span>}
        </label>
      )}
      <input
        id={fieldId}
        name={name}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${error ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus-visible:ring-blue-500'}
          ${className}`}
        {...props}
      />
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-red-600 dark:text-red-400 font-medium"
        >
          {error}
        </p>
      )}
      {!error && helperText && (
        <p
          id={helperId}
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
