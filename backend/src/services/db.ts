import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

// Types
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
  doctorId?: string; // Foreign Key -> doctors.id
  procedureDate?: string;
  urgencyLevel?: 'critical' | 'urgent' | 'routine';
  urgencyLabel?: string;
  reviewerId?: string;
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

export interface AnalyticsMetric {
  metricName: string;
  metricValue: number;
  period: string;
  updatedAt: string;
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

// In-memory / JSON persistence for Mock Mode fallback
class MockDatabase {
  private filePath: string;
  public data: {
    users: Record<string, User>;
    cases: Record<string, Case>;
    documents: Record<string, Document>;
    aiReports: Record<string, AiReport>;
    secondOpinions: Record<string, SecondOpinion>;
    analytics: Record<string, AnalyticsMetric>;
    doctors: Record<string, Doctor>;
    doctorReviews: Record<string, DoctorReview>;
  };

  constructor() {
    this.filePath = path.join(process.cwd(), 'mock_db.json');
    this.data = {
      users: {},
      cases: {},
      documents: {},
      aiReports: {},
      secondOpinions: {},
      analytics: {},
      doctors: {},
      doctorReviews: {}
    };
    this.load();
    this.seedDefaults();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Failed to load mock database:', error);
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save mock database:', error);
    }
  }

  private seedDefaults() {
    // 1. Seed default users
    if (Object.keys(this.data.users).length === 0) {
      const defaultUsers: User[] = [
        { 
          id: 'usr_pat1', 
          email: 'patient@clarity.com', 
          role: 'patient', 
          createdAt: new Date().toISOString(),
          name: 'Mxolisi Blessed Masuku',
          age: 45,
          gender: 'Male',
          medicalAidNo: 'MEM-88712-B',
          region: 'Harare'
        },
        { id: 'usr_rev1', email: 'reviewer@clarity.com', role: 'reviewer', createdAt: new Date().toISOString() },
        { id: 'usr_exec1', email: 'exec@example.com', role: 'cimas_executive', createdAt: new Date().toISOString() }
      ];
      defaultUsers.forEach(u => this.data.users[u.id] = u);
      this.save();
    }

    // 2. Seed default doctors
    if (!this.data.doctors || Object.keys(this.data.doctors).length === 0) {
      this.data.doctors = {};
      const defaultDoctors: Doctor[] = [
        { id: 'doc_ndlovu', name: 'Dr. S. Ndlovu', email: 'dr.ndlovu@clarity.com', specialty: 'Orthopedics', region: 'Harare', payout: 24500, casesCount: 12, secondOpinionsCount: 3, understandingScore: 92.5 },
        { id: 'doc_sibanda', name: 'Dr. A. Sibanda', email: 'dr.sibanda@clarity.com', specialty: 'Cardiology', region: 'Bulawayo', payout: 64200, casesCount: 8, secondOpinionsCount: 2, understandingScore: 89.2 },
        { id: 'doc_moyo', name: 'Dr. T. Moyo', email: 'dr.moyo@clarity.com', specialty: 'General Surgery', region: 'Mutare', payout: 15400, casesCount: 15, secondOpinionsCount: 4, understandingScore: 94.0 },
        { id: 'doc_chimuka', name: 'Dr. G. Chimuka', email: 'dr.chimuka@clarity.com', specialty: 'General Medicine', region: 'Gweru', payout: 8200, casesCount: 20, secondOpinionsCount: 1, understandingScore: 96.5 }
      ];
      defaultDoctors.forEach(d => this.data.doctors[d.id] = d);
      this.save();
    }

    // 3. Seed default metrics
    if (Object.keys(this.data.analytics).length === 0) {
      const defaultMetrics: AnalyticsMetric[] = [
        { metricName: 'totalCasesReviewed', metricValue: 342, period: 'all', updatedAt: new Date().toISOString() },
        { metricName: 'secondOpinionsRequested', metricValue: 87, period: 'all', updatedAt: new Date().toISOString() },
        { metricName: 'highCostProceduresReviewed', metricValue: 124, period: 'all', updatedAt: new Date().toISOString() },
        { metricName: 'memberUnderstandingScore', metricValue: 94.2, period: 'all', updatedAt: new Date().toISOString() },
        { metricName: 'transparencyScore', metricValue: 88.5, period: 'all', updatedAt: new Date().toISOString() },
        { metricName: 'potentialClaimsExposure', metricValue: 452000, period: 'all', updatedAt: new Date().toISOString() },
        { metricName: 'potentialClaimsReviewed', metricValue: 156000, period: 'all', updatedAt: new Date().toISOString() }
      ];
      defaultMetrics.forEach(m => this.data.analytics[m.metricName] = m);
      this.save();
    }
  }

  getUser(id: string): User | undefined { return this.data.users[id]; }
  getUserByEmail(email: string): User | undefined {
    return Object.values(this.data.users).find(u => u.email.toLowerCase() === email.toLowerCase());
  }
  saveUser(user: User): User {
    this.data.users[user.id] = user;
    this.save();
    return user;
  }

  getCase(id: string): Case | undefined { return this.data.cases[id]; }
  getCasesByPatient(patientId: string): Case[] {
    return Object.values(this.data.cases).filter(c => c.patientId === patientId);
  }
  getAllCases(): Case[] {
    return Object.values(this.data.cases);
  }
  saveCase(c: Case): Case {
    this.data.cases[c.id] = c;
    this.save();
    return c;
  }

  getDoctors(): Doctor[] {
    return Object.values(this.data.doctors || {});
  }
  getDoctor(id: string): Doctor | undefined {
    return this.data.doctors ? this.data.doctors[id] : undefined;
  }
  saveDoctor(doc: Doctor): Doctor {
    if (!this.data.doctors) this.data.doctors = {};
    this.data.doctors[doc.id] = doc;
    this.save();
    return doc;
  }

  getDocumentsByCase(caseId: string): Document[] {
    return Object.values(this.data.documents).filter(d => d.caseId === caseId);
  }
  saveDocument(d: Document): Document {
    this.data.documents[d.id] = d;
    this.save();
    return d;
  }

  getAiReportByCase(caseId: string): AiReport | undefined {
    return Object.values(this.data.aiReports).find(r => r.caseId === caseId);
  }
  saveAiReport(r: AiReport): AiReport {
    this.data.aiReports[r.id] = r;
    this.save();
    return r;
  }

  getSecondOpinionByCase(caseId: string): SecondOpinion | undefined {
    return Object.values(this.data.secondOpinions).find(o => o.caseId === caseId);
  }
  saveSecondOpinion(o: SecondOpinion): SecondOpinion {
    this.data.secondOpinions[o.id] = o;
    this.save();
    return o;
  }

  getAnalytics(): AnalyticsMetric[] {
    return Object.values(this.data.analytics);
  }
  updateAnalytics(metricName: string, metricValue: number, period: string = 'all'): AnalyticsMetric {
    const metric: AnalyticsMetric = {
      metricName,
      metricValue,
      period,
      updatedAt: new Date().toISOString()
    };
    this.data.analytics[metricName] = metric;
    this.save();
    return metric;
  }

  getDoctorReviews(doctorId: string): DoctorReview[] {
    if (!this.data.doctorReviews) this.data.doctorReviews = {};
    if (!doctorId) return Object.values(this.data.doctorReviews);
    return Object.values(this.data.doctorReviews).filter(r => r.doctorId === doctorId);
  }
  getDoctorReviewByCase(caseId: string): DoctorReview | undefined {
    if (!this.data.doctorReviews) this.data.doctorReviews = {};
    return Object.values(this.data.doctorReviews).find(r => r.caseId === caseId);
  }
  saveDoctorReview(review: DoctorReview): DoctorReview {
    if (!this.data.doctorReviews) this.data.doctorReviews = {};
    this.data.doctorReviews[review.id] = review;
    this.save();
    return review;
  }
}

const mockDb = new MockDatabase();

// Firebase Admin setup
const PROJECT_ID = 'clarity-health-a9113e';
let firestoreDb: admin.firestore.Firestore | null = null;
let useFirebase = false;

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: PROJECT_ID
    });
  }
  firestoreDb = admin.firestore();
  firestoreDb.settings({ ignoreUndefinedProperties: true });
  useFirebase = true;
  console.log(`Firebase Admin connected to Firestore project: ${PROJECT_ID}`);
} catch (error) {
  console.warn('Firebase Admin failed to initialize. Falling back to local Mock Database.', error);
  useFirebase = false;
}

// Export abstract interface
export const dbService = {
  async getUser(id: string): Promise<User | null> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('users').doc(id).get();
      return snap.exists ? (snap.data() as User) : null;
    }
    return mockDb.getUser(id) || null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      if (!snap.empty) {
        return snap.docs[0].data() as User;
      }
      return null;
    }
    return mockDb.getUserByEmail(email) || null;
  },

  async saveUser(user: User): Promise<User> {
    if (useFirebase && firestoreDb) {
      await firestoreDb.collection('users').doc(user.id).set(user);
      return user;
    }
    return mockDb.saveUser(user);
  },

  async getCase(id: string): Promise<Case | null> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('cases').doc(id).get();
      return snap.exists ? (snap.data() as Case) : null;
    }
    return mockDb.getCase(id) || null;
  },

  async getCasesByPatient(patientId: string): Promise<Case[]> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('cases')
        .where('patientId', '==', patientId)
        .get();
      return snap.docs.map(doc => doc.data() as Case);
    }
    return mockDb.getCasesByPatient(patientId);
  },

  async getAllCases(): Promise<Case[]> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('cases').get();
      return snap.docs.map(doc => doc.data() as Case);
    }
    return mockDb.getAllCases();
  },

  async saveCase(c: Case): Promise<Case> {
    if (useFirebase && firestoreDb) {
      await firestoreDb.collection('cases').doc(c.id).set(c);
      return c;
    }
    return mockDb.saveCase(c);
  },

  async getDoctors(): Promise<Doctor[]> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('doctors').get();
      return snap.docs.map(doc => doc.data() as Doctor);
    }
    return mockDb.getDoctors();
  },

  async getDoctor(id: string): Promise<Doctor | null> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('doctors').doc(id).get();
      return snap.exists ? (snap.data() as Doctor) : null;
    }
    return mockDb.getDoctor(id) || null;
  },

  async saveDoctor(doc: Doctor): Promise<Doctor> {
    if (useFirebase && firestoreDb) {
      await firestoreDb.collection('doctors').doc(doc.id).set(doc);
      return doc;
    }
    return mockDb.saveDoctor(doc);
  },

  async getDocumentsByCase(caseId: string): Promise<Document[]> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('documents')
        .where('caseId', '==', caseId)
        .get();
      return snap.docs.map(doc => doc.data() as Document);
    }
    return mockDb.getDocumentsByCase(caseId);
  },

  async saveDocument(d: Document): Promise<Document> {
    if (useFirebase && firestoreDb) {
      await firestoreDb.collection('documents').doc(d.id).set(d);
      return d;
    }
    return mockDb.saveDocument(d);
  },

  async getAiReportByCase(caseId: string): Promise<AiReport | null> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('aiReports')
        .where('caseId', '==', caseId)
        .limit(1)
        .get();
      if (!snap.empty) {
        return snap.docs[0].data() as AiReport;
      }
      return null;
    }
    return mockDb.getAiReportByCase(caseId) || null;
  },

  async saveAiReport(r: AiReport): Promise<AiReport> {
    if (useFirebase && firestoreDb) {
      await firestoreDb.collection('aiReports').doc(r.id).set(r);
      return r;
    }
    return mockDb.saveAiReport(r);
  },

  async getSecondOpinionByCase(caseId: string): Promise<SecondOpinion | null> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('secondOpinions')
        .where('caseId', '==', caseId)
        .limit(1)
        .get();
      if (!snap.empty) {
        return snap.docs[0].data() as SecondOpinion;
      }
      return null;
    }
    return mockDb.getSecondOpinionByCase(caseId) || null;
  },

  async saveSecondOpinion(o: SecondOpinion): Promise<SecondOpinion> {
    if (useFirebase && firestoreDb) {
      await firestoreDb.collection('secondOpinions').doc(o.id).set(o);
      return o;
    }
    return mockDb.saveSecondOpinion(o);
  },

  async getAnalytics(): Promise<AnalyticsMetric[]> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('analytics').get();
      return snap.docs.map(doc => doc.data() as AnalyticsMetric);
    }
    return mockDb.getAnalytics();
  },

  async updateAnalytics(metricName: string, value: number, period: string = 'all'): Promise<AnalyticsMetric> {
    if (useFirebase && firestoreDb) {
      const metric: AnalyticsMetric = {
        metricName,
        metricValue: value,
        period,
        updatedAt: new Date().toISOString()
      };
      await firestoreDb.collection('analytics').doc(metricName).set(metric);
      return metric;
    }
    return mockDb.updateAnalytics(metricName, value, period);
  },

  async getDoctorReviews(doctorId: string): Promise<DoctorReview[]> {
    if (useFirebase && firestoreDb) {
      let query: admin.firestore.Query = firestoreDb.collection('doctorReviews');
      if (doctorId) {
        query = query.where('doctorId', '==', doctorId);
      }
      const snap = await query.get();
      return snap.docs.map(doc => doc.data() as DoctorReview);
    }
    return mockDb.getDoctorReviews(doctorId);
  },

  async getDoctorReviewByCase(caseId: string): Promise<DoctorReview | null> {
    if (useFirebase && firestoreDb) {
      const snap = await firestoreDb.collection('doctorReviews')
        .where('caseId', '==', caseId)
        .limit(1)
        .get();
      if (!snap.empty) {
        return snap.docs[0].data() as DoctorReview;
      }
      return null;
    }
    return mockDb.getDoctorReviewByCase(caseId) || null;
  },

  async saveDoctorReview(review: DoctorReview): Promise<DoctorReview> {
    if (useFirebase && firestoreDb) {
      await firestoreDb.collection('doctorReviews').doc(review.id).set(review);
      return review;
    }
    return mockDb.saveDoctorReview(review);
  }
};
