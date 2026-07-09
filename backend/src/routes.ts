import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { dbService, Case, Document, AiReport, SecondOpinion, User } from './services/db.js';
import { storageService } from './services/storage.js';
import { ocrService } from './services/ocr.js';
import { aiService } from './services/ai.js';
import { requireAuth } from './middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Helper to handle async express routes
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. Auth Sync Route — Called after Firebase sign-in to upsert user profile in DB.
// The token is already verified by requireAuth; this route applies it manually too.
router.post('/auth/sync', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const fbUser = req.firebaseUser!;
  const { name, partnerId } = req.body;
  const email = fbUser.email ?? '';

  // Look up existing user by Firebase UID first, then fall back to email
  let user = await dbService.getUser(fbUser.uid) || await dbService.getUserByEmail(email);

  if (!user) {
    // Determine role based on email for first-time users
    let role: 'patient' | 'reviewer' | 'cimas_executive' = 'patient';
    const emailLower = email.toLowerCase();
    if (emailLower.includes('exec') || emailLower.includes('operations')) {
      role = 'cimas_executive';
    } else if (emailLower.includes('review') || emailLower.includes('doctor') || emailLower.includes('doc')) {
      role = 'reviewer';
    }

    user = {
      id: fbUser.uid,
      email,
      role,
      createdAt: new Date().toISOString(),
      name: name || fbUser.name || (role === 'patient' ? 'New Member' : undefined),
      medicalAidNo: partnerId ? `MEM-${partnerId}` : undefined,
    };
    await dbService.saveUser(user);
  } else if (user.id !== fbUser.uid) {
    // Migrate old mock ID to Firebase UID
    const migratedUser: User = { ...user, id: fbUser.uid };
    await dbService.saveUser(migratedUser);
    user = migratedUser;
  }

  return res.json(user);
}));

// 2. Cases list API
router.get('/cases', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { patientId, role } = req.query;

  if (patientId) {
    const cases = await dbService.getCasesByPatient(patientId as string);
    return res.json(cases);
  }

  if (role === 'reviewer') {
    // Return all cases that are submitted for review or already reviewed
    const allCases = await dbService.getAllCases();
    const reviewerCases = allCases.filter(c => 
      c.status === 'second_opinion_requested' || c.status === 'reviewed'
    );
    return res.json(reviewerCases);
  }

  if (role === 'cimas_executive') {
    // Executive sees all cases
    const cases = await dbService.getAllCases();
    return res.json(cases);
  }

  return res.status(400).json({ error: 'Missing parameter patientId or role' });
}));

// 3. Create Case (Placeholder before upload)
router.post('/cases', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { patientId, title, specialty } = req.body;
  
  if (!patientId || !title || !specialty) {
    return res.status(400).json({ error: 'patientId, title, and specialty are required' });
  }

  const newCase: Case = {
    id: `case_${uuidv4().substring(0, 8)}`,
    patientId,
    title,
    specialty,
    status: 'pending_upload',
    createdAt: new Date().toISOString()
  };

  const savedCase = await dbService.saveCase(newCase);
  return res.status(201).json(savedCase);
}));

// 4. Get Case Detail (Case, Document, AI Report, Second Opinion)
router.get('/cases/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const c = await dbService.getCase(id);
  
  if (!c) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const documents = await dbService.getDocumentsByCase(id);
  const aiReport = await dbService.getAiReportByCase(id);
  const secondOpinion = await dbService.getSecondOpinionByCase(id);

  return res.json({
    case: c,
    documents,
    aiReport,
    secondOpinion
  });
}));

// 5. Upload Document and Process Pipeline (OCR + AI)
router.post('/cases/:id/upload', requireAuth, upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const c = await dbService.getCase(id);
  if (!c) {
    return res.status(404).json({ error: 'Case not found' });
  }

  // Update status to processing
  c.status = 'processing';
  await dbService.saveCase(c);

  try {
    // Step 1: Upload to Storage
    const fileUrl = await storageService.saveFile(file, id);

    // Step 2: OCR Extraction
    const ocrResult = await ocrService.extractText(file.buffer, file.originalname, file.mimetype);

    // Update case details based on OCR auto-classification
    c.specialty = ocrResult.specialty;
    c.title = ocrResult.inferredTitle;
    
    // Auto-link to the correct attending doctor in the provider directory
    if (ocrResult.specialty === 'Orthopedics') {
      c.doctorId = 'doc_ndlovu';
    } else if (ocrResult.specialty === 'Cardiology') {
      c.doctorId = 'doc_sibanda';
    } else if (ocrResult.specialty === 'General Medicine') {
      c.doctorId = 'doc_chimuka';
    } else {
      c.doctorId = 'doc_moyo';
    }
    
    await dbService.saveCase(c);

    // Save document details
    const newDoc: Document = {
      id: `doc_${uuidv4().substring(0, 8)}`,
      caseId: id,
      fileUrl,
      extractedText: ocrResult.extractedText,
      uploadedAt: new Date().toISOString()
    };
    await dbService.saveDocument(newDoc);

    // Step 3: AI Report Generation
    const aiReport = await aiService.generateReport(id, ocrResult.extractedText);
    await dbService.saveAiReport(aiReport);

    // Step 4: Complete Pipeline
    c.status = 'completed';
    await dbService.saveCase(c);

    // Update analytics (mock incrementing)
    const metrics = await dbService.getAnalytics();
    const casesReviewedMetric = metrics.find(m => m.metricName === 'totalCasesReviewed');
    if (casesReviewedMetric) {
      await dbService.updateAnalytics(
        'totalCasesReviewed', 
        casesReviewedMetric.metricValue + 1
      );
    }

    // Add cost saving to potential claims reviewed if high cost
    if (ocrResult.specialty === 'Cardiology') {
      const claimsReviewed = metrics.find(m => m.metricName === 'potentialClaimsReviewed');
      if (claimsReviewed) {
        await dbService.updateAnalytics('potentialClaimsReviewed', claimsReviewed.metricValue + 22000);
      }
    } else if (ocrResult.specialty === 'Orthopedics') {
      const claimsReviewed = metrics.find(m => m.metricName === 'potentialClaimsReviewed');
      if (claimsReviewed) {
        await dbService.updateAnalytics('potentialClaimsReviewed', claimsReviewed.metricValue + 4500);
      }
    }

    return res.json({
      case: c,
      document: newDoc,
      aiReport
    });
  } catch (error: any) {
    console.error('Processing pipeline failed:', error);
    c.status = 'pending_upload'; // Rollback status
    await dbService.saveCase(c);
    return res.status(500).json({ error: `Pipeline failed: ${error.message}` });
  }
}));

// 6. Request Second Opinion
router.post('/cases/:id/second-opinion', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { procedureDate, urgencyLabel } = req.body;
  const c = await dbService.getCase(id);
  
  if (!c) {
    return res.status(404).json({ error: 'Case not found' });
  }

  // Determine urgency level and label based on procedureDate
  let urgencyLevel: 'critical' | 'urgent' | 'routine' = 'routine';
  let finalLabel = urgencyLabel || '';

  if (procedureDate) {
    const diffMs = new Date(procedureDate).getTime() - Date.now();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours >= 0) {
      if (diffHours < 12) {
        urgencyLevel = 'critical';
        if (!finalLabel) {
          finalLabel = diffHours < 1 
            ? 'Emergency/Delivery happening in under an hour!' 
            : `Baby delivery / Critical procedure in ${Math.round(diffHours)} hours`;
        }
      } else if (diffHours < 72) {
        urgencyLevel = 'urgent';
        if (!finalLabel) finalLabel = `Procedure scheduled in ${Math.round(diffHours / 24) || 1} days`;
      } else {
        urgencyLevel = 'routine';
        if (!finalLabel) finalLabel = `Procedure scheduled in ${Math.round(diffHours / 24)} days`;
      }
    } else {
      urgencyLevel = 'routine';
      if (!finalLabel) finalLabel = 'Scheduled procedure (Date passed)';
    }
  } else {
    urgencyLevel = 'routine';
    if (!finalLabel) finalLabel = 'Routine second opinion review';
  }

  // Auto-allocate to the least busy reviewer
  const allCases = await dbService.getAllCases();
  const reviewers = ['usr_rev1', 'usr_rev2', 'usr_rev3']; // Standard seeded reviewers
  
  const reviewerActiveCounts: Record<string, number> = {};
  reviewers.forEach(rId => {
    reviewerActiveCounts[rId] = 0;
  });

  allCases.forEach(caseItem => {
    if (caseItem.status === 'second_opinion_requested' && caseItem.reviewerId && reviewers.includes(caseItem.reviewerId)) {
      reviewerActiveCounts[caseItem.reviewerId]++;
    }
  });

  // Find reviewer with minimum active assignments
  let assignedReviewerId = reviewers[0];
  let minCount = reviewerActiveCounts[assignedReviewerId];
  reviewers.forEach(rId => {
    if (reviewerActiveCounts[rId] < minCount) {
      minCount = reviewerActiveCounts[rId];
      assignedReviewerId = rId;
    }
  });

  // Update status, dates and assignments
  c.status = 'second_opinion_requested';
  c.procedureDate = procedureDate || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  c.urgencyLevel = urgencyLevel;
  c.urgencyLabel = finalLabel;
  c.reviewerId = assignedReviewerId;

  await dbService.saveCase(c);

  // Update analytics count
  const metrics = await dbService.getAnalytics();
  const sopMetric = metrics.find(m => m.metricName === 'secondOpinionsRequested');
  if (sopMetric) {
    await dbService.updateAnalytics('secondOpinionsRequested', sopMetric.metricValue + 1);
  }

  return res.json(c);
}));

// 7. Submit Review Comment (Reviewer action)
router.post('/cases/:id/review', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reviewerId, comments } = req.body;

  if (!comments) {
    return res.status(400).json({ error: 'Comments are required' });
  }

  const c = await dbService.getCase(id);
  if (!c) {
    return res.status(404).json({ error: 'Case not found' });
  }

  c.status = 'reviewed';
  await dbService.saveCase(c);

  const opinion: SecondOpinion = {
    id: `sop_${uuidv4().substring(0, 8)}`,
    caseId: id,
    reviewerId,
    comments,
    createdAt: new Date().toISOString()
  };

  const savedOpinion = await dbService.saveSecondOpinion(opinion);

  return res.json({
    case: c,
    secondOpinion: savedOpinion
  });
}));

// 8. Analytics data for operations dashboard
router.get('/analytics', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const metrics = await dbService.getAnalytics();
  const allCases = await dbService.getAllCases();

  // Aggregate specialty volume
  const specialties = ['Orthopedics', 'Cardiology', 'Obstetrics & Gynecology', 'General Surgery', 'Pediatrics', 'General Medicine'];
  const caseVolumeByCategory = specialties.map(spec => {
    const count = allCases.filter(c => c.specialty === spec).length;
    return { category: spec, count };
  });

  // Aggregate second opinion requests by month (first half 2026)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const secondOpinionRequests = months.map((m, idx) => {
    const count = allCases.filter(c => {
      if (c.status !== 'second_opinion_requested' && c.status !== 'reviewed') return false;
      const date = new Date(c.createdAt);
      return date.getMonth() === idx;
    }).length;
    return { month: m, requests: count || 4 }; // fallback standard
  });

  // Aggregate top reviewed/completed procedures
  const procedureCounts: Record<string, number> = {};
  allCases.forEach(c => {
    if (c.status === 'completed' || c.status === 'reviewed') {
      procedureCounts[c.title] = (procedureCounts[c.title] || 0) + 1;
    }
  });
  const mostReviewedProcedures = Object.entries(procedureCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Remaining vs Audited Exposure
  const totalExposure = metrics.find(m => m.metricName === 'potentialClaimsExposure')?.metricValue || 452000;
  const totalReviewed = metrics.find(m => m.metricName === 'potentialClaimsReviewed')?.metricValue || 156000;
  const potentialClaimsExposureChart = [
    { name: 'Claims Reviewed', value: totalReviewed },
    { name: 'Remaining Exposure', value: Math.max(0, totalExposure - totalReviewed) }
  ];

  // Weekly member trends (Wk 1-4)
  const memberEngagementTrends = [
    { week: 'Wk 1', activeUsers: 220, reportsViewed: 195 },
    { week: 'Wk 2', activeUsers: 540, reportsViewed: 470 },
    { week: 'Wk 3', activeUsers: 1100, reportsViewed: 960 },
    { week: 'Wk 4', activeUsers: 2301, reportsViewed: 1840 }
  ];

  const charts = {
    caseVolumeByCategory,
    secondOpinionRequests,
    mostReviewedProcedures,
    potentialClaimsExposure: potentialClaimsExposureChart,
    memberEngagementTrends
  };

  return res.json({
    metrics: metrics.reduce((acc, m) => {
      acc[m.metricName] = m.metricValue;
      return acc;
    }, {} as Record<string, number>),
    charts
  });
}));

// 12. Submit Doctor Review from Patient
router.post('/cases/:id/doctor-review', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    easeOfCommunication,
    easeOfCommunicationComment,
    explanationOfDecision,
    explanationOfDecisionComment,
    otherConcernsRaise,
    otherConcernsRaiseComment,
    recommendToCaredOne,
    recommendToCaredOneComment,
    servedOnTime,
    servedOnTimeComment,
    valueForMoney,
    valueForMoneyComment,
    decisionJustified,
    decisionJustifiedComment,
    overallComment
  } = req.body;

  const c = await dbService.getCase(id);
  if (!c) {
    return res.status(404).json({ error: 'Case not found' });
  }
  if (!c.doctorId) {
    return res.status(400).json({ error: 'No doctor is linked to this case' });
  }

  // Calculate average rating
  const ratingsSum = 
    Number(easeOfCommunication) + 
    Number(explanationOfDecision) + 
    (6 - Number(otherConcernsRaise)) + // invert scale
    Number(recommendToCaredOne) + 
    Number(servedOnTime) + 
    Number(valueForMoney) + 
    Number(decisionJustified);
  
  const overallRating = Number((ratingsSum / 7).toFixed(1));

  const reviewId = `rev_${uuidv4().substring(0, 8)}`;
  const reviewData = {
    id: reviewId,
    caseId: id,
    patientId: c.patientId,
    doctorId: c.doctorId,
    createdAt: new Date().toISOString(),
    easeOfCommunication: Number(easeOfCommunication),
    easeOfCommunicationComment,
    explanationOfDecision: Number(explanationOfDecision),
    explanationOfDecisionComment,
    otherConcernsRaise: Number(otherConcernsRaise),
    otherConcernsRaiseComment,
    recommendToCaredOne: Number(recommendToCaredOne),
    recommendToCaredOneComment,
    servedOnTime: Number(servedOnTime),
    servedOnTimeComment,
    valueForMoney: Number(valueForMoney),
    valueForMoneyComment,
    decisionJustified: Number(decisionJustified),
    decisionJustifiedComment,
    overallComment,
    overallRating
  };

  await dbService.saveDoctorReview(reviewData);

  // Update doctor rating details in db
  const doc = await dbService.getDoctor(c.doctorId);
  if (doc) {
    const reviews = await dbService.getDoctorReviews(c.doctorId);
    doc.reviewCount = reviews.length;
    const totalExpDec = reviews.reduce((acc, r) => acc + r.explanationOfDecision + r.decisionJustified, 0);
    const avg = totalExpDec / (reviews.length * 2);
    doc.understandingScore = Number(((avg / 5) * 100).toFixed(1));
    await dbService.saveDoctor(doc);
  }

  return res.status(201).json(reviewData);
}));

// 13. Get Doctor Reviews Directory
router.get('/doctors/:id/reviews', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const reviews = await dbService.getDoctorReviews(id);
  return res.json(reviews);
}));

// 14. Get Specific Patient Review
router.get('/cases/:id/doctor-review', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const review = await dbService.getDoctorReviewByCase(id);
  return res.json(review || null);
}));

// 9. Doctors Directory
router.get('/doctors', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const doctors = await dbService.getDoctors();
  return res.json(doctors);
}));

// 10. Get Doctor Detail Profile & Cases
router.get('/doctors/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await dbService.getDoctor(id);
  if (!doc) {
    return res.status(404).json({ error: 'Doctor not found' });
  }
  
  // Get all cases referred by this doctor
  const allCases = await dbService.getAllCases();
  const cases = allCases.filter(c => c.doctorId === id);
  
  return res.json({
    doctor: doc,
    cases
  });
}));

// 11. Get Patient Profile & Cases
router.get('/users/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userObj = await dbService.getUser(id);
  if (!userObj) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get cases for this patient
  const cases = await dbService.getCasesByPatient(id);
  
  return res.json({
    user: userObj,
    cases
  });
}));

export default router;
