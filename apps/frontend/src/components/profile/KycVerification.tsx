'use client';
import { useState, useEffect } from 'react';
import { kycApi, KycCustomer, SubmitKycDocumentsRequest } from '@/lib/kycApi';
import { Button } from '@/components/ui/Button';

interface KycVerificationProps {
  stellarPublicKey: string | null | undefined;
}

export function KycVerification({ stellarPublicKey }: KycVerificationProps) {
  const [status, setStatus] = useState<KycCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState<'id_card' | 'passport' | 'drivers_license'>('id_card');
  const [documentUrl, setDocumentUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');

  useEffect(() => {
    if (stellarPublicKey) {
      kycApi.getStatus(stellarPublicKey).then((data) => {
        setStatus(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [stellarPublicKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stellarPublicKey || !documentUrl.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: SubmitKycDocumentsRequest = {
        stellarPublicKey,
        documentType,
        documentUrl: documentUrl.trim(),
        ...(selfieUrl.trim() && { selfieUrl: selfieUrl.trim() }),
      };
      const updated = await kycApi.submitDocuments(payload);
      setStatus(updated);
      setDocumentUrl('');
      setSelfieUrl('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!stellarPublicKey) {
    return (
      <div className="border rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-lg">KYC Verification</h2>
        <p className="text-sm text-gray-600">
          Please configure your Stellar public key before submitting KYC documents.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border rounded-xl p-6">
        <div className="animate-pulse h-6 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="animate-pulse h-4 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  const statusColors = {
    none: 'text-gray-600 bg-gray-100',
    pending: 'text-yellow-700 bg-yellow-100',
    approved: 'text-green-700 bg-green-100',
    rejected: 'text-red-700 bg-red-100',
  };

  return (
    <div className="border rounded-xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-lg">KYC Verification</h2>
        <p className="text-sm text-gray-600">
          Complete identity verification to enable token withdrawals above the threshold.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium uppercase ${
            statusColors[status?.status ?? 'none']
          }`}
        >
          {status?.status ?? 'none'}
        </span>
      </div>

      {status?.status === 'approved' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          ✅ Your identity has been verified. You can now withdraw tokens without restrictions.
        </div>
      )}

      {status?.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          ❌ Verification was rejected. Please contact support or resubmit with valid documents.
        </div>
      )}

      {status?.status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          ⏳ Your documents are under review. This may take 1-3 business days.
        </div>
      )}

      {(status?.status === 'none' || status?.status === 'rejected') && (
        <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Document Type</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as any)}
            >
              <option value="id_card">ID Card</option>
              <option value="passport">Passport</option>
              <option value="drivers_license">Driver's License</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Document URL *</label>
            <input
              type="url"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/your-document.jpg"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Selfie URL (optional)</label>
            <input
              type="url"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/your-selfie.jpg"
              value={selfieUrl}
              onChange={(e) => setSelfieUrl(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={submitting || !documentUrl.trim()}>
            {submitting ? 'Submitting...' : 'Submit for Verification'}
          </Button>
        </form>
      )}
    </div>
  );
}
