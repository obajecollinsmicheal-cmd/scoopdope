'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { assignmentsApi } from '@/lib/assignmentsApi';
import { toast } from '@/lib/toast';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';

interface ExistingSubmission {
  fileUrl: string;
  submittedAt: string;
}

interface SubmissionFormProps {
  assignmentId: string;
  onSuccess: () => void;
  existingSubmission?: ExistingSubmission;
}

interface FormValues {
  file: FileList;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  assignmentId,
  onSuccess,
  existingSubmission,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<FormValues>();

  // Consider the form dirty when a file has been selected (FileList is truthy
  // and non-empty) even before the user clicks "Submit".
  const selectedFiles = watch('file');
  const hasSelectedFile = selectedFiles && selectedFiles.length > 0;

  // isDirty from react-hook-form tracks whether the value differs from
  // defaultValues. For a file input we also check hasSelectedFile directly.
  useBeforeUnload(isDirty || !!hasSelectedFile);

  const onSubmit = async (data: FormValues) => {
    const file = data.file?.[0];
    if (!file) return;

    try {
      await assignmentsApi.submitAssignment(assignmentId, file);
      toast.success('Assignment submitted successfully!');
      onSuccess();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">
        {existingSubmission ? 'Resubmit Assignment' : 'Submit Assignment'}
      </h3>

      {existingSubmission && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
          You already submitted a file:{' '}
          <a
            href={existingSubmission.fileUrl}
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            View Submission
          </a>
          <p className="mt-1">
            Submitted on: {new Date(existingSubmission.submittedAt).toLocaleString()}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="file-upload" className="block text-sm font-medium mb-1">
            Select File (PDF, ZIP, etc.)
          </label>
          <Input
            id="file-upload"
            type="file"
            {...register('file', { required: !existingSubmission })}
          />
        </div>
        <Button
          type="submit"
          disabled={!hasSelectedFile || isSubmitting}
          className="w-full"
        >
          {isSubmitting
            ? 'Submitting...'
            : existingSubmission
              ? 'Update Submission'
              : 'Submit'}
        </Button>
      </form>
    </Card>
  );
};
