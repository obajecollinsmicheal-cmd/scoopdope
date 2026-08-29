'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { FormField } from '@/components/ui/FormField';
import { FormTextarea } from '@/components/ui/FormTextarea';

interface FormState {
  bio: string;
  expertise: string;
  motivation: string;
  linkedinUrl: string;
  portfolioUrl: string;
  agreementAccepted: boolean;
}

interface FormErrors {
  bio?: string;
  expertise?: string;
  motivation?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
}

const INITIAL: FormState = {
  bio: '',
  expertise: '',
  motivation: '',
  linkedinUrl: '',
  portfolioUrl: '',
  agreementAccepted: false,
};

export default function InstructorApplyPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value =
      e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    
    if (!form.bio.trim()) {
      newErrors.bio = 'Professional bio is required';
    } else if (form.bio.trim().length < 50) {
      newErrors.bio = 'Professional bio must be at least 50 characters';
    }
    
    if (!form.expertise.trim()) {
      newErrors.expertise = 'Areas of expertise are required';
    } else if (form.expertise.trim().length < 20) {
      newErrors.expertise = 'Please provide more details about your expertise (min. 20 characters)';
    }
    
    if (!form.motivation.trim()) {
      newErrors.motivation = 'Motivation is required';
    } else if (form.motivation.trim().length < 50) {
      newErrors.motivation = 'Please tell us more about your motivation (min. 50 characters)';
    }
    
    if (form.linkedinUrl.trim() && !isValidUrl(form.linkedinUrl)) {
      newErrors.linkedinUrl = 'Please enter a valid LinkedIn URL';
    }
    
    if (form.portfolioUrl.trim() && !isValidUrl(form.portfolioUrl)) {
      newErrors.portfolioUrl = 'Please enter a valid portfolio URL';
    }
    
    return newErrors;
  };

  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    const newErrors = validateForm();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setError('Please fix the errors below before submitting.');
      return;
    }

    if (!form.agreementAccepted) {
      setError('You must accept the instructor agreement to apply.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/v1/instructor-applications', {
        bio: form.bio,
        expertise: form.expertise,
        motivation: form.motivation,
        linkedinUrl: form.linkedinUrl || undefined,
        portfolioUrl: form.portfolioUrl || undefined,
        agreementAccepted: form.agreementAccepted,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? 'Failed to submit application. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <ProtectedRoute>
        <main className="max-w-xl mx-auto p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Application Submitted!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Our team will review your application and get back to you within 3–5 business days.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Become an Instructor
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Share your knowledge and earn BST tokens. Fill out the form below and our team will
          review your application.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <FormTextarea
            label="Professional Bio"
            name="bio"
            id="bio"
            required
            minLength={50}
            rows={4}
            placeholder="Tell us about your background and experience (min. 50 characters)"
            value={form.bio}
            onChange={set('bio')}
            error={errors.bio}
            helperText={`${form.bio.length}/500`}
            characterCount={form.bio.length}
            characterLimit={500}
            disabled={submitting}
            maxLength={500}
          />

          <FormTextarea
            label="Areas of Expertise"
            name="expertise"
            id="expertise"
            required
            minLength={20}
            rows={2}
            placeholder="e.g. Stellar blockchain, Soroban smart contracts, DeFi"
            value={form.expertise}
            onChange={set('expertise')}
            error={errors.expertise}
            disabled={submitting}
            maxLength={500}
          />

          <FormTextarea
            label="Why do you want to teach on scoopdope?"
            name="motivation"
            id="motivation"
            required
            minLength={50}
            rows={4}
            placeholder="Describe your motivation and what courses you plan to create (min. 50 characters)"
            value={form.motivation}
            onChange={set('motivation')}
            error={errors.motivation}
            helperText={`${form.motivation.length}/1000`}
            characterCount={form.motivation.length}
            characterLimit={1000}
            disabled={submitting}
            maxLength={1000}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="LinkedIn URL"
              name="linkedinUrl"
              id="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/..."
              value={form.linkedinUrl}
              onChange={set('linkedinUrl')}
              error={errors.linkedinUrl}
              helperText="Optional - your professional profile"
              disabled={submitting}
            />
            <FormField
              label="Portfolio / Website URL"
              name="portfolioUrl"
              id="portfolioUrl"
              type="url"
              placeholder="https://..."
              value={form.portfolioUrl}
              onChange={set('portfolioUrl')}
              error={errors.portfolioUrl}
              helperText="Optional - showcase your work"
              disabled={submitting}
            />
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Instructor Agreement</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              By applying, you agree to create original, high-quality educational content, respect
              intellectual property rights, and abide by the scoopdope community guidelines and
              content policies.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreementAccepted}
                onChange={set('agreementAccepted')}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-describedby="agreement-required"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I have read and agree to the Instructor Agreement{' '}
                <span className="text-red-500" aria-label="required">*</span>
              </span>
            </label>
            {!form.agreementAccepted && submitting && (
              <p id="agreement-required" role="alert" className="text-sm text-red-600 dark:text-red-400 font-medium mt-2">
                You must accept the instructor agreement
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </main>
    </ProtectedRoute>
  );
}
