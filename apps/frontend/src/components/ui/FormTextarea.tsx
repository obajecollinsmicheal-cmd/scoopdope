import React from 'react';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  characterCount?: number;
  characterLimit?: number;
}

/**
 * FormTextarea Component
 * 
 * A wrapper around the native textarea element that properly associates error messages
 * with the textarea using aria-describedby and role="alert" for accessibility.
 * 
 * Supports character counting and limits with live updates.
 * Meets WCAG 2.1 Level AA requirements for form validation (3.3.1 Error Identification).
 * 
 * @example
 * ```tsx
 * <FormTextarea
 *   label="Message"
 *   name="message"
 *   error={formErrors.message}
 *   helperText="Max 500 characters"
 *   characterLimit={500}
 *   characterCount={text.length}
 *   {...register('message')}
 * />
 * ```
 */
export function FormTextarea({
  label,
  error,
  helperText,
  id,
  name,
  required,
  characterCount,
  characterLimit,
  className = '',
  rows = 4,
  ...props
}: FormTextareaProps) {
  const fieldId = id || name || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const counterId = `${fieldId}-counter`;

  // Build aria-describedby: error message takes priority, then helper text, then counter
  const describedByParts: string[] = [];
  if (error) describedByParts.push(errorId);
  else {
    if (helperText) describedByParts.push(helperId);
    if (characterLimit) describedByParts.push(counterId);
  }
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

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
      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors resize-none
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
      {!error && (
        <div className="flex items-center justify-between gap-2">
          {helperText && (
            <p
              id={helperId}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {helperText}
            </p>
          )}
          {characterLimit && typeof characterCount === 'number' && (
            <p
              id={counterId}
              className={`text-xs font-medium ${
                characterCount >= characterLimit
                  ? 'text-red-600 dark:text-red-400'
                  : characterCount >= characterLimit * 0.9
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-gray-500 dark:text-gray-400'
              }`}
              aria-live="polite"
            >
              {characterCount}/{characterLimit}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
