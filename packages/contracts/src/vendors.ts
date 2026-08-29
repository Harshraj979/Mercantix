import { DocumentStatus, VendorStatus } from './enums';

export interface VendorDocumentResponse {
  id: string;
  vendorId: string;
  documentType: string;
  storageKey: string;
  verificationStatus: DocumentStatus;
  createdAt: Date;
}

export interface VendorBankAccountResponse {
  id: string;
  vendorId: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorResponse {
  id: string;
  ownerUserId: string;
  storeName: string;
  slug: string;
  description?: string | null;
  status: VendorStatus;
  commissionRate: number;
  documents?: VendorDocumentResponse[];
  bankAccount?: VendorBankAccountResponse | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicVendorResponse {
  id: string;
  storeName: string;
  slug: string;
  description?: string | null;
  status: VendorStatus;
  createdAt: Date;
}
