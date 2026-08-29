'use client';

import { useId } from 'react';

interface StarRatingProps {
  value: number;
  readOnly?: boolean;
  onRatingChange?: (rating: number) => void;
}

export function StarRating({ value, readOnly = false, onRatingChange }: StarRatingProps) {
  // Unique ID prefix to avoid collisions when multiple widgets appear on one page
  const groupId = useId();

  if (readOnly) {
    return (
      <span className="flex gap-0.5" aria-label={`Rating: ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= value ? 'text-yellow-400' : 'text-gray-300'}
            aria-hidden="true"
          >
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <fieldset
      className="flex gap-0.5"
      role="radiogroup"
      aria-label="Star rating"
      // Remove the default fieldset border/padding
      style={{ border: 'none', padding: 0, margin: 0 }}
    >
      {/* Screen-reader-only legend so assistive tech has a group label */}
      <legend className="sr-only">Rate this course</legend>

      {[1, 2, 3, 4, 5].map((star) => {
        const inputId = `${groupId}-star-${star}`;
        const checked = star === value;

        return (
          <label
            key={star}
            htmlFor={inputId}
            className={`
              text-2xl cursor-pointer transition-colors select-none
              ${star <= value ? 'text-yellow-400' : 'text-gray-300'}
              hover:text-yellow-400
              has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:rounded
            `}
            aria-label={`${star} out of 5 star${star !== 1 ? 's' : ''}`}
          >
            {/* Visually hidden radio input — keyboard / screen-reader accessible */}
            <input
              id={inputId}
              type="radio"
              name={`${groupId}-star-rating`}
              value={star}
              checked={checked}
              onChange={() => onRatingChange?.(star)}
              className="sr-only"
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            />
            ★
          </label>
        );
      })}
    </fieldset>
  );
}
