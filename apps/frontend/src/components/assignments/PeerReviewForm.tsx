'use client';

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { assignmentsApi } from '@/lib/assignmentsApi';
import { toast } from '@/lib/toast';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';

interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  maxPoints: number;
}

interface ReviewScore {
  criterionId: string;
  score: number;
  feedback: string;
}

interface FormValues {
  scores: ReviewScore[];
  overallFeedback: string;
}

interface PeerReviewFormProps {
  submissionId: string;
  rubric: RubricCriterion[];
  onSuccess: () => void;
}

export const PeerReviewForm: React.FC<PeerReviewFormProps> = ({
  submissionId,
  rubric,
  onSuccess,
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { isDirty, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      scores: rubric.map((c) => ({ criterionId: c.id, score: 0, feedback: '' })),
      overallFeedback: '',
    },
  });

  const { fields } = useFieldArray({ control, name: 'scores' });

  // Warn on browser close / tab close / back-button when the form is dirty
  useBeforeUnload(isDirty);

  const onSubmit = async (data: FormValues) => {
    try {
      await assignmentsApi.submitReview(submissionId, {
        scores: data.scores,
        overallFeedback: data.overallFeedback,
      });
      toast.success('Review submitted successfully!');
      onSuccess();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Peer Review</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {fields.map((field, index) => {
          const criterion = rubric[index];
          return (
            <div key={field.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between font-medium">
                <span>{criterion.title}</span>
                <span className="text-sm text-gray-500">Max: {criterion.maxPoints} pts</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{criterion.description}</p>

              {/* Hidden field to preserve criterionId */}
              <input type="hidden" {...register(`scores.${index}.criterionId`)} />

              <div className="flex gap-4 items-center">
                <label
                  htmlFor={`score-${index}`}
                  className="text-sm font-medium"
                >
                  Score:
                </label>
                <Input
                  id={`score-${index}`}
                  type="number"
                  min={0}
                  max={criterion.maxPoints}
                  className="w-24"
                  {...register(`scores.${index}.score`, {
                    required: true,
                    valueAsNumber: true,
                    min: 0,
                    max: criterion.maxPoints,
                  })}
                />
              </div>

              <div>
                <label
                  htmlFor={`feedback-${index}`}
                  className="text-sm font-medium"
                >
                  Feedback for this criterion:
                </label>
                <textarea
                  id={`feedback-${index}`}
                  className="w-full p-2 border rounded-md text-sm mt-1"
                  rows={2}
                  placeholder="How can they improve?"
                  {...register(`scores.${index}.feedback`)}
                />
              </div>
            </div>
          );
        })}

        <div>
          <label htmlFor="overallFeedback" className="block text-sm font-medium mb-1">
            Overall Feedback
          </label>
          <textarea
            id="overallFeedback"
            className="w-full p-3 border rounded-md"
            rows={4}
            placeholder="Final thoughts on the submission..."
            {...register('overallFeedback', { required: true })}
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Submitting Review...' : 'Submit Peer Review'}
        </Button>
      </form>
    </Card>
  );
};
