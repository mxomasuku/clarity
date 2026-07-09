import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:5001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Derive the file server base URL from the API URL (strip /api suffix)
export const FILE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export interface User {
  id: string;
  email: string;
  role: 'patient' | 'reviewer' | 'cimas_executive';
  createdAt: string;
  name?: string;
  age?: number;
  gender?: 'Male' | 'Female';
  medicalAidNo?: string;
  region?: string;
}

export interface Case {
  id: string;
  patientId: string;
  title: string;
  specialty: string;
  status: 'pending_upload' | 'processing' | 'completed' | 'second_opinion_requested' | 'reviewed';
  createdAt: string;
  doctorId?: string;
  procedureDate?: string;
  urgencyLevel?: 'critical' | 'urgent' | 'routine';
  urgencyLabel?: string;
  reviewerId?: string;
}

export interface Document {
  id: string;
  caseId: string;
  fileUrl: string;
  extractedText: string;
  uploadedAt: string;
}

export interface Pathway {
  title: string;
  description: string;
  benefits: string;
  risks: string;
  considerations: string;
}

export interface AiReport {
  id: string;
  caseId: string;
  summary: string;
  explanation: string;
  pathways: Pathway[];
  questions: string[];
  disclaimer: string;
  createdAt: string;
}

export interface SecondOpinion {
  id: string;
  caseId: string;
  reviewerId?: string;
  comments: string;
  createdAt: string;
}

export interface CaseDetailResponse {
  case: Case;
  documents: Document[];
  aiReport: AiReport | null;
  secondOpinion: SecondOpinion | null;
}

export interface AnalyticsResponse {
  metrics: Record<string, number>;
  charts: {
    caseVolumeByCategory: Array<{ category: string; count: number }>;
    secondOpinionRequests: Array<{ month: string; requests: number }>;
    mostReviewedProcedures: Array<{ name: string; value: number }>;
    potentialClaimsExposure: Array<{ name: string; value: number }>;
    memberEngagementTrends: Array<{ week: string; activeUsers: number; reportsViewed: number }>;
  };
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty: string;
  region: string;
  payout: number;
  casesCount: number;
  secondOpinionsCount: number;
  understandingScore: number;
  cSectionCount?: number;
  normalDeliveryCount?: number;
  reviewCount?: number;
}

export interface DoctorReview {
  id: string;
  caseId: string;
  patientId: string;
  doctorId: string;
  createdAt: string;
  easeOfCommunication: number;
  easeOfCommunicationComment?: string;
  explanationOfDecision: number;
  explanationOfDecisionComment?: string;
  otherConcernsRaise: number;
  otherConcernsRaiseComment?: string;
  recommendToCaredOne: number;
  recommendToCaredOneComment?: string;
  servedOnTime: number;
  servedOnTimeComment?: string;
  valueForMoney: number;
  valueForMoneyComment?: string;
  decisionJustified: number;
  decisionJustifiedComment?: string;
  overallComment?: string;
  overallRating: number;
}

export interface DoctorDetailResponse {
  doctor: Doctor;
  cases: Case[];
}

export interface PatientProfileResponse {
  user: User;
  cases: Case[];
}

// API Functions
export const api = {
  // Sync user profile with backend (called after Firebase sign-in)
  async syncUser(name?: string, partnerId?: string): Promise<User> {
    const response = await apiClient.post<User>('/auth/sync', { name, partnerId });
    return response.data;
  },

  // Cases
  async getCases(params: { patientId?: string; role?: string }): Promise<Case[]> {
    const response = await apiClient.get<Case[]>('/cases', { params });
    return response.data;
  },

  async createCase(data: { patientId: string; title: string; specialty: string }): Promise<Case> {
    const response = await apiClient.post<Case>('/cases', data);
    return response.data;
  },

  async getCaseDetail(caseId: string): Promise<CaseDetailResponse> {
    const response = await apiClient.get<CaseDetailResponse>(`/cases/${caseId}`);
    return response.data;
  },

  // File Upload
  async uploadDocument(caseId: string, file: File, onUploadProgress?: (progressEvent: any) => void): Promise<{
    case: Case;
    document: Document;
    aiReport: AiReport;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/cases/${caseId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return response.data;
  },

  // Second Opinion Workflow
  async requestSecondOpinion(caseId: string, procedureDate?: string, urgencyLabel?: string): Promise<Case> {
    const response = await apiClient.post<Case>(`/cases/${caseId}/second-opinion`, { procedureDate, urgencyLabel });
    return response.data;
  },

  async submitReview(caseId: string, reviewerId: string, comments: string): Promise<{
    case: Case;
    secondOpinion: SecondOpinion;
  }> {
    const response = await apiClient.post(`/cases/${caseId}/review`, { reviewerId, comments });
    return response.data;
  },

  // Patient Doctor Reviews
  async submitDoctorReview(caseId: string, reviewData: any): Promise<DoctorReview> {
    const response = await apiClient.post<DoctorReview>(`/cases/${caseId}/doctor-review`, reviewData);
    return response.data;
  },

  async getDoctorReview(caseId: string): Promise<DoctorReview | null> {
    const response = await apiClient.get<DoctorReview | null>(`/cases/${caseId}/doctor-review`);
    return response.data;
  },

  async getDoctorReviews(doctorId: string): Promise<DoctorReview[]> {
    const response = await apiClient.get<DoctorReview[]>(`/doctors/${doctorId}/reviews`);
    return response.data;
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsResponse> {
    const response = await apiClient.get<AnalyticsResponse>('/analytics');
    return response.data;
  },

  // Doctors Directory
  async getDoctors(): Promise<Doctor[]> {
    const response = await apiClient.get<Doctor[]>('/doctors');
    return response.data;
  },

  async getDoctorDetail(doctorId: string): Promise<DoctorDetailResponse> {
    const response = await apiClient.get<DoctorDetailResponse>(`/doctors/${doctorId}`);
    return response.data;
  },

  // Patient Profile
  async getUserProfile(userId: string): Promise<PatientProfileResponse> {
    const response = await apiClient.get<PatientProfileResponse>(`/users/${userId}`);
    return response.data;
  },
};
