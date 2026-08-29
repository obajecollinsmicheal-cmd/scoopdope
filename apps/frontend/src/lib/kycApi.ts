import api from './api';

export interface KycCustomer {
  id: string;
  stellarPublicKey: string;
  status: 'none' | 'pending' | 'approved' | 'rejected';
  documentType: 'id_card' | 'passport' | 'drivers_license' | null;
  documentUrl: string | null;
  selfieUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitKycDocumentsRequest {
  stellarPublicKey: string;
  documentType: 'id_card' | 'passport' | 'drivers_license';
  documentUrl: string;
  selfieUrl?: string;
}

export const kycApi = {
  /**
   * Get KYC status for a Stellar account
   */
  getStatus: (stellarPublicKey: string) =>
    api.get<KycCustomer>(`/kyc/status/${stellarPublicKey}`).then((r) => r.data),

  /**
   * Submit identity documents for KYC verification
   */
  submitDocuments: (data: SubmitKycDocumentsRequest) =>
    api.post<KycCustomer>('/kyc/documents', data).then((r) => r.data),
};
