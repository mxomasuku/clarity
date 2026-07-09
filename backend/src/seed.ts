import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Set Firebase Project ID
process.env.GCLOUD_PROJECT = 'clarity-health-a9113e';

// Initialize Firebase Admin (uses Default Credentials of the logged-in session)
let firestoreDb: admin.firestore.Firestore | null = null;
let useFirebase = false;
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'clarity-health-a9113e'
    });
  }
  firestoreDb = admin.firestore();
  firestoreDb.settings({ ignoreUndefinedProperties: true });
  useFirebase = true;
  console.log('Firebase Admin initialized for seeding.');
} catch (error) {
  console.warn('Firebase Admin failed to initialize. Seeding will write to local mock_db.json only.', error);
  useFirebase = false;
}

// Data structures matching services/db.ts
interface User {
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

interface Case {
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

interface Doctor {
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

interface Document {
  id: string;
  caseId: string;
  fileUrl: string;
  extractedText: string;
  uploadedAt: string;
}

interface Pathway {
  title: string;
  description: string;
  benefits: string;
  risks: string;
  considerations: string;
}

interface AiReport {
  id: string;
  caseId: string;
  summary: string;
  explanation: string;
  pathways: Pathway[];
  questions: string[];
  disclaimer: string;
  createdAt: string;
}

interface SecondOpinion {
  id: string;
  caseId: string;
  reviewerId?: string;
  comments: string;
  createdAt: string;
}

interface DoctorReview {
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

interface AnalyticsMetric {
  metricName: string;
  metricValue: number;
  period: string;
  updatedAt: string;
}

// Pool of Zimbabwean Names for Customer Generation
const shonaMaleNames = ['Tinashe', 'Farai', 'Tafadzwa', 'Blessing', 'Dumisani', 'Albert', 'Kudakwashe', 'Garikai', 'Munashe', 'Tanaka', 'Ranga', 'Simbarashe', 'Tatenda', 'Shingai', 'Tendai', 'Mxolisi', 'Sipho', 'Takunda', 'Tapiwa', 'Panashe'];
const shonaFemaleNames = ['Rudo', 'Nomsa', 'Chipo', 'Nyasha', 'Vimbai', 'Sekai', 'Rufaro', 'Rutendo', 'Tariro', 'Fadzai', 'Shamiso', 'Tendai', 'Patience', 'Tsitsi', 'Nokuthula', 'Ropafadzo', 'Chiedza', 'Ruvarashe', 'Runako'];
const zimbabweanSurnames = ['Moyo', 'Ndlovu', 'Sibanda', 'Ncube', 'Dube', 'Mutasa', 'Chimuka', 'Mpofu', 'Zhou', 'Mupfumi', 'Zikhali', 'Gumbo', 'Musoni', 'Masuku', 'Maphosa', 'Phiri', 'Nyoni', 'Chauke', 'Mhlanga', 'Chigumba', 'Mudzingwa'];

const regions = ['Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Masvingo', 'Kwekwe', 'Chinhoyi'];
const regionProbabilities = [0.45, 0.25, 0.10, 0.08, 0.05, 0.04, 0.03]; // Harare receives the most, etc.

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomRegion(): string {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < regions.length; i++) {
    cumulative += regionProbabilities[i];
    if (r <= cumulative) {
      return regions[i];
    }
  }
  return regions[0];
}

// Seeding Main Function
async function seed() {
  console.log('🚀 Starting Firestore Seeding script...');

  // Database containers
  const mockDbData = {
    users: {} as Record<string, User>,
    cases: {} as Record<string, Case>,
    documents: {} as Record<string, Document>,
    aiReports: {} as Record<string, AiReport>,
    secondOpinions: {} as Record<string, SecondOpinion>,
    analytics: {} as Record<string, AnalyticsMetric>,
    doctors: {} as Record<string, Doctor>,
    doctorReviews: {} as Record<string, DoctorReview>
  };

  // 1. Seed Reviewers, Executives, and Demo Patient
  const systemUsers: User[] = [
    {
      id: 'usr_pat1',
      email: 'patient@clarity.com',
      role: 'patient',
      createdAt: new Date().toISOString(),
      name: 'Mxolisi Blessed Masuku',
      age: 45,
      gender: 'Male',
      medicalAidNo: 'CIMAS-88712-B',
      region: 'Harare'
    },
    {
      id: 'usr_rev1',
      email: 'reviewer@clarity.com',
      role: 'reviewer',
      createdAt: new Date().toISOString(),
      name: 'Dr. Tendai Moyo (Reviewer)',
      region: 'Harare'
    },
    {
      id: 'usr_rev2',
      email: 'reviewer2@clarity.com',
      role: 'reviewer',
      createdAt: new Date().toISOString(),
      name: 'Dr. Nomsa Ncube (Reviewer)',
      region: 'Bulawayo'
    },
    {
      id: 'usr_rev3',
      email: 'reviewer3@clarity.com',
      role: 'reviewer',
      createdAt: new Date().toISOString(),
      name: 'Dr. Tafadzwa Sibanda (Reviewer)',
      region: 'Mutare'
    },
    {
      id: 'usr_exec1',
      email: 'cimas_exec@cimas.co.zw',
      role: 'cimas_executive',
      createdAt: new Date().toISOString(),
      name: 'Cimas Health Executive'
    }
  ];

  systemUsers.forEach(u => mockDbData.users[u.id] = u);

  // 2. Generate exactly 2,300 additional customer records (making 2,301 total)
  console.log('Generating 2300 realistic customer records...');
  for (let i = 1; i <= 2300; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale ? getRandomElement(shonaMaleNames) : getRandomElement(shonaFemaleNames);
    const lastName = getRandomElement(zimbabweanSurnames);
    const fullName = `${firstName} ${lastName}`;
    const email = `patient.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@clarity.com`;
    const patientId = `usr_pat_${i + 1}`; // usr_pat1 is already taken

    const customer: User = {
      id: patientId,
      email,
      role: 'patient',
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      name: fullName,
      age: Math.floor(Math.random() * 63) + 18, // 18 to 80
      gender: isMale ? 'Male' : 'Female',
      medicalAidNo: `CIMAS-${Math.floor(10000 + Math.random() * 90000)}-${getRandomElement(['A', 'B', 'C'])}`,
      region: getRandomRegion()
    };
    mockDbData.users[customer.id] = customer;
  }
  console.log('✅ Generated 2,301 total users.');

  // 3. Seed 17 Attending Doctors Directory distributed across Zimbabwean cities
  console.log('Seeding 17 doctors...');
  const docProfiles = [
    { id: 'doc_r_mutasa', name: 'Dr. Rudo Mutasa', email: 'dr.r.mutasa@clarity.com', specialty: 'Obstetrics & Gynecology', region: 'Harare' },
    { id: 'doc_t_moyo_og', name: 'Dr. Tinashe Moyo', email: 'dr.t.moyo.og@clarity.com', specialty: 'Obstetrics & Gynecology', region: 'Harare' },
    { id: 'doc_s_ndlovu_og', name: 'Dr. Sipho Ndlovu', email: 'dr.s.ndlovu.og@clarity.com', specialty: 'Obstetrics & Gynecology', region: 'Bulawayo' },
    { id: 'doc_n_ncube_og', name: 'Dr. Nomsa Ncube', email: 'dr.n.ncube.og@clarity.com', specialty: 'Obstetrics & Gynecology', region: 'Bulawayo' },
    { id: 'doc_f_chimuka_og', name: 'Dr. Farai Chimuka', email: 'dr.f.chimuka.og@clarity.com', specialty: 'Obstetrics & Gynecology', region: 'Mutare' },
    { id: 'doc_t_moyo_surg', name: 'Dr. Tendai Moyo', email: 'dr.t.moyo.surg@clarity.com', specialty: 'General Surgery', region: 'Harare' },
    { id: 'doc_m_chipo_surg', name: 'Dr. Michelle Chipo', email: 'dr.m.chipo.surg@clarity.com', specialty: 'General Surgery', region: 'Gweru' },
    { id: 'doc_t_sibanda_surg', name: 'Dr. Tafadzwa Sibanda', email: 'dr.t.sibanda.surg@clarity.com', specialty: 'General Surgery', region: 'Bulawayo' },
    { id: 'doc_n_mutasa_ped', name: 'Dr. Nyasha Mutasa', email: 'dr.n.mutasa.ped@clarity.com', specialty: 'Pediatrics', region: 'Harare' },
    { id: 'doc_k_ncube_ped', name: 'Dr. Kumbirai Ncube', email: 'dr.k_ncube.ped@clarity.com', specialty: 'Pediatrics', region: 'Bulawayo' },
    { id: 'doc_b_dube_ped', name: 'Dr. Blessing Dube', email: 'dr.b.dube.ped@clarity.com', specialty: 'Pediatrics', region: 'Mutare' },
    { id: 'doc_v_zhou_cardio', name: 'Dr. Vimbai Zhou', email: 'dr.v.zhou.cardio@clarity.com', specialty: 'Cardiology', region: 'Harare' },
    { id: 'doc_d_mpofu_cardio', name: 'Dr. Dumisani Mpofu', email: 'dr.d.mpofu.cardio@clarity.com', specialty: 'Cardiology', region: 'Bulawayo' },
    { id: 'doc_s_chimuka_ortho', name: 'Dr. Sekai Chimuka', email: 'dr.s.chimuka.ortho@clarity.com', specialty: 'Orthopedics', region: 'Harare' },
    { id: 'doc_b_dube_ortho', name: 'Dr. Bongani Dube', email: 'dr.b.dube.ortho@clarity.com', specialty: 'Orthopedics', region: 'Bulawayo' },
    { id: 'doc_r_mupfumi_gm', name: 'Dr. Rufaro Mupfumi', email: 'dr.r.mupfumi.gm@clarity.com', specialty: 'General Medicine', region: 'Gweru' },
    { id: 'doc_a_zikhali_gm', name: 'Dr. Albert Zikhali', email: 'dr.a.zikhali.gm@clarity.com', specialty: 'General Medicine', region: 'Masvingo' }
  ];

  const doctors: Doctor[] = docProfiles.map(dp => ({
    id: dp.id,
    name: dp.name,
    email: dp.email,
    specialty: dp.specialty,
    region: dp.region,
    payout: 0,
    casesCount: 0,
    secondOpinionsCount: 0,
    understandingScore: 0,
    cSectionCount: 0,
    normalDeliveryCount: 0,
    reviewCount: 0
  }));

  // Helper map for fast lookup
  const doctorsMap = new Map<string, Doctor>();
  doctors.forEach(d => doctorsMap.set(d.id, d));

  // 4. Generate 350 realistic cases, documents, AI reports, reviews and ratings
  console.log('Generating 350 cases with realistic clinical data...');
  const patientIds = Object.keys(mockDbData.users).filter(id => mockDbData.users[id].role === 'patient');
  const reviewers = ['usr_rev1', 'usr_rev2', 'usr_rev3'];

  // Case templates by specialty
  const caseTemplates = [
    {
      specialty: 'Obstetrics & Gynecology',
      title: 'C-Section Delivery Recommendation',
      procedure: 'C-Section',
      cost: 1700,
      extractedText: (patName: string, docName: string) => `OBSTETRICS CLINICAL STATEMENT
Patient: ${patName}
Referral: ${docName} (OB/GYN)
Diagnosis: Full term pregnancy (39 weeks). Fetal presentation is breech. Maternal request/prior history.
Plan: Scheduled primary elective Cesarean Section (C-Section). Estimated hospital stay: 3 days. Estimated cost: $1,700.`,
      summary: 'Your OB/GYN recommends a scheduled Cesarean Section (C-Section) delivery due to fetal presentation or maternal medical indications.',
      explanation: 'A Cesarean section is the surgical delivery of a baby through incisions in your abdomen and uterus. This is recommended when vaginal delivery poses risks, such as when the baby is in a breech (feet-first) position, or if there is severe fetal distress or placenta complications.',
      pathways: [
        { title: 'Cesarean Section (C-Section)', description: 'Surgical delivery via abdominal incision.', benefits: 'Ensures safe delivery in breech/compromised positions; avoids labor pain.', risks: 'Longer recovery time (6-8 weeks); risk of surgical infection, bleeding.', considerations: 'Clinically indicated for fetal breech or placenta previa.' },
        { title: 'Normal Vaginal Delivery', description: 'Natural vaginal delivery when labor progresses.', benefits: 'Quick recovery (1-2 weeks); lower risk of surgical complications.', risks: 'Risk of perineal tearing; unexpected emergency C-Section if labor fails.', considerations: 'Standard gold standard if baby rotates and no maternal complications exist.' }
      ],
      questions: [
        'Why is a C-Section recommended instead of waiting for natural labor?',
        'Are there any methods to rotate the baby (like external cephalic version) before scheduling?',
        'What is the recovery protocol and does Cimas cover the cost difference ($1700 vs $185)?'
      ]
    },
    {
      specialty: 'Obstetrics & Gynecology',
      title: 'Normal Childbirth Delivery Plan',
      procedure: 'Normal Delivery',
      cost: 185,
      extractedText: (patName: string, docName: string) => `CLINICAL BIRTH PLAN
Patient: ${patName}
Referral: ${docName} (OB/GYN)
Diagnosis: Healthy full term pregnancy (38 weeks), vertex position.
Plan: Spontaneous vaginal delivery (Normal Delivery) with standard nursing care. Estimated cost: $185.`,
      summary: 'Your OB/GYN has mapped out a vaginal childbirth plan, which is standard for healthy, uncomplicated term pregnancies.',
      explanation: 'Vaginal delivery is the natural birth process. The baby passes through the birth canal. It is the safest method of birth for both mother and baby for uncomplicated pregnancies, with minimal post-birth pain and hospital stay.',
      pathways: [
        { title: 'Normal Delivery', description: 'Vaginal birth with pain management options.', benefits: 'Shortest hospital stay; minimal surgical risks.', risks: 'Labor pains; potential minor tears.', considerations: 'Recommended for healthy pregnancies with vertex (head-down) baby.' }
      ],
      questions: [
        'What pain management options (epidural, gas) will be available?',
        'What triggers an emergency C-section during active labor?',
        'How long will I remain in the facility post-birth?'
      ]
    },
    {
      specialty: 'Obstetrics & Gynecology',
      title: 'Myomectomy for Uterine Fibroids',
      procedure: 'Myomectomy / Fibroids Removal',
      cost: 3200,
      extractedText: (patName: string, docName: string) => `PELVIC ULTRASOUND & CONSULTATION
Patient: ${patName}
Referral: ${docName} (OB/GYN)
Diagnosis: Symptomatic uterine fibroids causing severe menorrhagia and pelvic pressure.
Plan: Recommend laparoscopic myomectomy to remove fibroids while preserving fertility. Estimated cost: $3,200.`,
      summary: 'Your doctor recommends a myomectomy, a surgical procedure to remove uterine fibroids (non-cancerous muscle growths in the womb) to stop heavy bleeding.',
      explanation: 'Fibroids are benign growths in the uterus that can cause pelvic pain, cramping, and heavy periods. A myomectomy removes the fibroids while leaving the uterus intact, preserving your ability to become pregnant in the future.',
      pathways: [
        { title: 'Laparoscopic Myomectomy', description: 'Keyhole surgical removal of fibroids.', benefits: 'Fertility preservation; small incisions; shorter recovery than open surgery.', risks: 'Risk of scarring; potential recurrence of fibroids; general anesthesia risks.', considerations: 'Best for symptomatic women desiring future pregnancy.' },
        { title: 'Uterine Artery Embolization (UAE)', description: 'Minimally invasive blocking of fibroid blood supply.', benefits: 'No surgery; fast recovery.', risks: 'May impact fertility; pain immediately post-procedure.', considerations: 'Suitable for women who do not plan future pregnancies.' }
      ],
      questions: [
        'What are the sizes and locations of my fibroids?',
        'Can my symptoms be managed with medication (hormonal therapies) instead of surgery?',
        'Will I need a C-Section for future pregnancies after a myomectomy?'
      ]
    },
    {
      specialty: 'General Surgery',
      title: 'Laparoscopic Cholecystectomy for Gallstones',
      procedure: 'Laparoscopic Cholecystectomy',
      cost: 2500,
      extractedText: (patName: string, docName: string) => `UPPER ABDOMINAL ULTRASOUND REPORT
Patient: ${patName}
Referral: ${docName} (General Surgery)
Diagnosis: Chronic cholecystitis with multiple gallstones. Thickened gallbladder wall (4mm).
Plan: Scheduled elective laparoscopic cholecystectomy (gallbladder removal). Estimated cost: $2,500.`,
      summary: 'Your surgeon recommends removing your gallbladder (cholecystectomy) using keyhole surgery to treat painful gallstone attacks.',
      explanation: 'The gallbladder stores bile. When gallstones form, they block bile ducts, causing severe pain after meals. Removing the gallbladder is the standard treatment. The liver will continue to produce bile, which will flow directly into your intestine instead.',
      pathways: [
        { title: 'Laparoscopic Cholecystectomy', description: 'Keyhole removal of the gallbladder.', benefits: 'Permanent cure; low pain; quick return to daily activities (1-2 weeks).', risks: 'Bile duct injury (rare); temporary digestive changes.', considerations: 'Surgical standard for recurring gallbladder pain.' },
        { title: 'Conservative Dietary Management', description: 'Avoiding fatty meals to prevent gallstone attacks.', benefits: 'Avoids surgery entirely.', risks: 'High risk of future attacks; potential infection or blockages (acute cholecystitis).', considerations: 'Only recommended for patients unable to undergo surgery due to health risks.' }
      ],
      questions: [
        'What are the risks if I choose to wait and manage with diet?',
        'How will my digestion change after gallbladder removal?',
        'Is this procedure done as day surgery, or will I be admitted overnight?'
      ]
    },
    {
      specialty: 'General Surgery',
      title: 'Emergency Appendectomy',
      procedure: 'Appendectomy',
      cost: 1800,
      extractedText: (patName: string, docName: string) => `EMERGENCY SURGICAL ADMISSION
Patient: ${patName}
Referral: ${docName} (General Surgery)
Diagnosis: Acute appendicitis. Rebound tenderness in right lower quadrant. Elevated WBC.
Plan: Perform urgent appendectomy to prevent appendix rupture. Estimated cost: $1,800.`,
      summary: 'Your surgical team recommends an emergency appendectomy to remove an inflamed appendix before it ruptures.',
      explanation: 'Appendicitis is a sudden swelling of the appendix. If not removed quickly, it can burst, spreading bacteria throughout the abdomen and causing life-threatening complications. The surgery removes the appendix via laparoscopy or open incision.',
      pathways: [
        { title: 'Emergency Appendectomy', description: 'Urgent removal of appendix.', benefits: 'Prevents rupture; immediate relief from severe infection.', risks: 'Infection of incision; brief recovery downtime.', considerations: 'Required standard of care for acute appendicitis.' }
      ],
      questions: [
        'Is the appendix ruptured, or is it intact?',
        'Will this be performed laparoscopically (keyhole) or via open surgery?',
        'How long must I restrict heavy lifting or physical activity?'
      ]
    },
    {
      specialty: 'Pediatrics',
      title: 'Pediatric Wellness Checkup',
      procedure: 'Pediatric Checkup / Baby Visit',
      cost: 80,
      extractedText: (patName: string, docName: string) => `PEDIATRIC OUTPATIENT RECORD
Patient: ${patName} (Infant)
Referral: ${docName} (Pediatrics)
Diagnosis: Routine 6-month wellness checkup. Growth tracking, vaccination status.
Plan: Wellness examination and administration of scheduled vaccines. Estimated cost: $80.`,
      summary: 'Your pediatrician has scheduled a routine wellness exam to monitor your child\'s growth, development, and vaccines.',
      explanation: 'Routine pediatric checkups occur at key intervals. The pediatrician measures weight, length, head circumference, assesses developmental milestones (sitting, tracking), and administers immunizations to protect against childhood diseases.',
      pathways: [
        { title: 'Routine Baby Visit', description: 'Comprehensive wellness check and immunization.', benefits: 'Early detection of developmental issues; vaccination defense.', risks: 'Mild vaccine fever or soreness.', considerations: 'Standard preventative care schedule.' }
      ],
      questions: [
        'Is my baby meeting all developmental milestones for 6 months?',
        'What side effects should I watch for after today\'s vaccinations?',
        'When is the next scheduled wellness visit?'
      ]
    },
    {
      specialty: 'Orthopedics',
      title: 'Arthroscopy for Meniscus Tear',
      procedure: 'Knee Arthroscopy',
      cost: 4500,
      extractedText: (patName: string, docName: string) => `ORTHOPEDIC MRI INTERPRETATION
Patient: ${patName}
Referral: ${docName} (Orthopedics)
Diagnosis: Left knee MRI shows complex tear of the posterior horn of the medial meniscus. Joint locking.
Plan: Recommend left knee arthroscopy for partial meniscectomy or repair. Estimated cost: $4,500.`,
      summary: 'Your orthopedist recommends a knee arthroscopy (minimally invasive keyhole joint surgery) to repair or trim a torn meniscus.',
      explanation: 'The meniscus is a rubbery disc of cartilage that cushions your knee. A tear causes pain, swelling, and physical locking where the knee catches. Keyhole surgery is performed to insert a tiny camera and instruments to either sew the tear or trim away damaged flaps.',
      pathways: [
        { title: 'Arthroscopic Knee Surgery', description: 'Keyhole repair or trimming of the tear.', benefits: 'Resolves catching and locking; quick return to walking.', risks: 'Small risk of infection; does not fully eliminate future arthritis risks.', considerations: 'Indicated for unstable tears causing locking.' },
        { title: 'Physical Therapy & Rehabilitation', description: 'Conservative strengthening exercises.', benefits: 'No surgical risks; preserves all native cartilage.', risks: 'Locking and swelling may persist if the tear is large.', considerations: 'Reasonable first step for stable, non-locking tears.' }
      ],
      questions: [
        'Is my tear in a zone that can be repaired (sewn) or must it be trimmed (removed)?',
        'Can we try 6 weeks of structured physical therapy before committing to surgery?',
        'How long will I need crutches after the procedure?'
      ]
    },
    {
      specialty: 'Cardiology',
      title: 'Coronary Bypass Grafting (CABG)',
      procedure: 'Coronary Bypass (CABG)',
      cost: 22000,
      extractedText: (patName: string, docName: string) => `CORONARY ANGIOGRAM & PLAN
Patient: ${patName}
Referral: ${docName} (Cardiology)
Diagnosis: Severe triple-vessel coronary artery disease. 90% stenosis in LAD, 85% in RCA.
Plan: Coronary Artery Bypass Grafting (CABG) surgery recommended. Estimated cost: $22,000.`,
      summary: 'Your cardiologist recommends Coronary Artery Bypass Grafting (CABG) surgery to route blood around blockages in three of your main heart arteries.',
      explanation: 'CABG (pronounced "cabbage") is open-heart surgery. Grafts (healthy blood vessels taken from your leg, chest, or arm) are used to bypass blocked arteries, restoring rich blood flow to your heart muscle, alleviating chest pain, and preventing heart attacks.',
      pathways: [
        { title: 'Coronary Artery Bypass (CABG)', description: 'Surgical bypass grafting around heart blockages.', benefits: 'Most complete revascularization; outstanding long-term survival in multi-vessel disease.', risks: 'Major surgery risks (bleeding, infection, stroke); long recovery (6-12 weeks).', considerations: 'Standard of care for severe three-vessel disease.' },
        { title: 'Angioplasty & Stenting (PCI)', description: 'Opening arteries with balloons and stents.', benefits: 'Minimally invasive; short hospital stay (1 day); quick recovery.', risks: 'Higher rate of blockages reoccurring; less effective for complex multi-vessel blockages.', considerations: 'Alternative for high-surgical-risk patients.' }
      ],
      questions: [
        'Why is open-heart surgery preferred over stents for my blockages?',
        'What is the expected length of stay in the cardiac ICU?',
        'What cardiac rehab options are covered by Cimas?'
      ]
    },
    {
      specialty: 'General Medicine',
      title: 'Hypertension and Diabetes Assessment',
      procedure: 'Chronic Illness Consultation',
      cost: 50,
      extractedText: (patName: string, docName: string) => `CHRONIC CLINIC CHART NOTE
Patient: ${patName}
Referral: ${docName} (General Medicine)
Diagnosis: Essential hypertension and Type II Diabetes Mellitus. BP 145/92. HbA1c 7.4.
Plan: Adjust metformin and lisinopril dosages. Counsel on diet. Follow up in 3 months. Cost: $50.`,
      summary: 'Your primary care provider has assessed your blood pressure and diabetes management, modifying your prescriptions to improve control.',
      explanation: 'Managing high blood pressure and diabetes requires regular monitoring of vitals and blood chemistry. This routine visit ensures your medications are functioning properly without side effects, preventing long-term cardiovascular or renal damage.',
      pathways: [
        { title: 'Prescription Adjustment', description: 'Optimizing drug therapy with diet counsel.', benefits: 'Maintains BP < 130/80 and HbA1c < 7.0; prevents strokes and kidney damage.', risks: 'Potential drug interactions or minor side effects (cough, stomach upset).', considerations: 'Essential for active chronic disease control.' }
      ],
      questions: [
        'Do I need to check my blood sugar at home daily?',
        'Are there generic alternatives to my current prescriptions?',
        'What dietary changes will help reduce my dependency on these medications?'
      ]
    }
  ];

  // Map caseTemplates by specialty for quick retrieval
  const templatesBySpecialty = new Map<string, typeof caseTemplates>();
  caseTemplates.forEach(t => {
    if (!templatesBySpecialty.has(t.specialty)) {
      templatesBySpecialty.set(t.specialty, []);
    }
    templatesBySpecialty.get(t.specialty)!.push(t);
  });

  // Seed 350 cases
  console.log('Seeding 350 cases...');
  for (let i = 1; i <= 350; i++) {
    // Select patient (usr_pat1 gets the first case, others randomized)
    const patId = i === 1 ? 'usr_pat1' : getRandomElement(patientIds);
    const patientObj = mockDbData.users[patId];

    // Select doctor randomly
    const doc = getRandomElement(doctors);
    const docObj = doctorsMap.get(doc.id)!;

    // Retrieve template corresponding to doctor specialty
    const templates = templatesBySpecialty.get(doc.specialty) || caseTemplates;
    let template = getRandomElement(templates);

    // Make sure doc_r_mutasa and doc_s_ndlovu_og OB/GYN cases are heavily weighted towards C-sections
    if (doc.specialty === 'Obstetrics & Gynecology') {
      if (doc.id === 'doc_r_mutasa' || doc.id === 'doc_s_ndlovu_og') {
        // 85% C-Section
        template = Math.random() < 0.85 ? templates.find(t => t.procedure === 'C-Section')! : templates.find(t => t.procedure === 'Normal Delivery')!;
      } else {
        // 25% C-Section (realistic standard)
        template = Math.random() < 0.25 ? templates.find(t => t.procedure === 'C-Section')! : templates.find(t => t.procedure === 'Normal Delivery')!;
      }
    }

    const caseId = `case_${i}_seed`;
    const createdDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000); // last 60 days

    // Randomize status
    // 60% completed, 15% reviewed, 15% second_opinion_requested, 10% processing
    const statusRand = Math.random();
    let status: Case['status'] = 'completed';
    if (statusRand < 0.10) {
      status = 'processing';
    } else if (statusRand < 0.25) {
      status = 'second_opinion_requested';
    } else if (statusRand < 0.40) {
      status = 'reviewed';
    }

    // Set procedureDate and reviewer if second_opinion_requested or reviewed
    let procedureDate: string | undefined;
    let urgencyLevel: Case['urgencyLevel'];
    let urgencyLabel: string | undefined;
    let reviewerId: string | undefined;

    if (status === 'second_opinion_requested' || status === 'reviewed') {
      reviewerId = getRandomElement(reviewers);
      const hoursAhead = Math.floor(Math.random() * 120); // 0 to 5 days ahead
      const pDateObj = new Date(createdDate.getTime() + hoursAhead * 60 * 60 * 1000);
      procedureDate = pDateObj.toISOString();

      if (hoursAhead < 4) {
        urgencyLevel = 'critical';
        urgencyLabel = template.procedure === 'C-Section' || template.procedure === 'Normal Delivery'
          ? `Baby delivery happening in ${hoursAhead || 1} hours`
          : `Emergency procedure in ${hoursAhead || 1} hours`;
      } else if (hoursAhead < 72) {
        urgencyLevel = 'urgent';
        urgencyLabel = `Procedure scheduled in ${Math.floor(hoursAhead / 24) || 1} days`;
      } else {
        urgencyLevel = 'routine';
        urgencyLabel = `Procedure scheduled in ${Math.floor(hoursAhead / 24)} days`;
      }
    }

    // Update doctor metrics
    docObj.casesCount += 1;
    docObj.payout += template.cost;
    if (template.procedure === 'C-Section') {
      docObj.cSectionCount = (docObj.cSectionCount || 0) + 1;
    } else if (template.procedure === 'Normal Delivery') {
      docObj.normalDeliveryCount = (docObj.normalDeliveryCount || 0) + 1;
    }
    if (status === 'second_opinion_requested' || status === 'reviewed') {
      docObj.secondOpinionsCount += 1;
    }

    const c: Case = {
      id: caseId,
      patientId: patId,
      title: template.title,
      specialty: template.specialty,
      status,
      createdAt: createdDate.toISOString(),
      doctorId: doc.id,
      procedureDate,
      urgencyLevel,
      urgencyLabel,
      reviewerId
    };

    mockDbData.cases[caseId] = c;

    // Save document details
    const docId = `doc_${i}_seed`;
    const docText = template.extractedText(patientObj.name || 'Mxolisi Blessed Masuku', docObj.name);
    const d: Document = {
      id: docId,
      caseId,
      fileUrl: `/uploads/${caseId}_file.pdf`,
      extractedText: docText,
      uploadedAt: c.createdAt
    };
    mockDbData.documents[docId] = d;

    // Save AI report
    const aiId = `rep_${i}_seed`;
    const report: AiReport = {
      id: aiId,
      caseId,
      summary: template.summary,
      explanation: template.explanation,
      pathways: template.pathways,
      questions: template.questions,
      disclaimer: 'This information is educational and should not replace advice from a qualified healthcare professional.',
      createdAt: c.createdAt
    };
    mockDbData.aiReports[aiId] = report;

    // Save reviewer second opinions if status is reviewed
    if (status === 'reviewed') {
      const sopId = `sop_${i}_seed`;
      let comments = `Independent review of the records confirms clinical justification for ${template.procedure}. `;
      if (template.procedure === 'C-Section') {
        comments += 'Breech positioning verified via ultrasound. The risk of vaginal breech birth outweighs surgical risks. Plan authorized.';
      } else if (template.procedure === 'Knee Arthroscopy') {
        comments += 'MRI shows unstable cartilage tear locking the knee joint. Arthroscopic debridement is indicated. Approved.';
      } else {
        comments += 'Procedure indications meet Cimas clinical criteria. Approved.';
      }

      const opinion: SecondOpinion = {
        id: sopId,
        caseId,
        reviewerId,
        comments,
        createdAt: new Date(createdDate.getTime() + 12 * 60 * 60 * 1000).toISOString() // 12 hrs later
      };
      mockDbData.secondOpinions[sopId] = opinion;
    }

    // Save doctor reviews (patient reviews) for completed or reviewed cases (about 60% of them)
    if ((status === 'completed' || status === 'reviewed') && Math.random() < 0.6) {
      const reviewId = `rev_${i}_seed`;

      // Rating calculations
      let easeOfCommunication = Math.floor(Math.random() * 2) + 4; // 4 or 5
      let explanationOfDecision = Math.floor(Math.random() * 2) + 4; // 4 or 5
      let otherConcernsRaise = Math.floor(Math.random() * 2) + 4; // 4 or 5
      let recommendToCaredOne = Math.floor(Math.random() * 2) + 4; // 4 or 5
      let servedOnTime = Math.floor(Math.random() * 3) + 3; // 3, 4 or 5
      let valueForMoney = Math.floor(Math.random() * 2) + 4; // 4 or 5
      let decisionJustified = Math.floor(Math.random() * 2) + 4; // 4 or 5

      let overallComment = 'Great service, the doctor was very helpful and professional.';

      // Make doc_r_mutasa and doc_s_ndlovu_og receive some negative/concerning feedback about C-sections
      if (template.procedure === 'C-Section' && (doc.id === 'doc_r_mutasa' || doc.id === 'doc_s_ndlovu_og') && Math.random() < 0.7) {
        easeOfCommunication = Math.floor(Math.random() * 2) + 2; // 2 or 3
        explanationOfDecision = Math.floor(Math.random() * 2) + 2; // 2 or 3
        decisionJustified = Math.floor(Math.random() * 2) + 1; // 1 or 2
        recommendToCaredOne = Math.floor(Math.random() * 2) + 2; // 2 or 3
        otherConcernsRaise = Math.floor(Math.random() * 2) + 1; // 1 or 2 (couldn't raise concerns)

        overallComment = `I felt extremely pressured by the doctor to schedule a C-section instead of trying normal delivery. The decision did not feel justified.`;
      } else {
        const commentsPool = [
          'Excellent communication and very clear pathways provided.',
          'Saved me from excessive hospital costs by suggesting standard clinics.',
          'Explained everything very well, served on time.',
          'Highly recommended. Professional staff and quick recovery advice.',
          'Gave me peace of mind about my child\'s vaccination schedule.'
        ];
        overallComment = getRandomElement(commentsPool);
      }

      const overallRating = Number(((easeOfCommunication + explanationOfDecision + (6 - otherConcernsRaise) + recommendToCaredOne + servedOnTime + valueForMoney + decisionJustified) / 7).toFixed(1));

      const review: DoctorReview = {
        id: reviewId,
        caseId,
        patientId: patId,
        doctorId: doc.id,
        createdAt: new Date(createdDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days later
        easeOfCommunication,
        easeOfCommunicationComment: 'Ease of communication assessment',
        explanationOfDecision,
        explanationOfDecisionComment: 'Clear explanation of decisions',
        otherConcernsRaise,
        otherConcernsRaiseComment: 'Concerns raising availability',
        recommendToCaredOne,
        recommendToCaredOneComment: 'Recommendation probability',
        servedOnTime,
        servedOnTimeComment: 'Punctuality of the service',
        valueForMoney,
        valueForMoneyComment: 'Cost value assessment',
        decisionJustified,
        decisionJustifiedComment: 'Clinical recommendation justification scale',
        overallComment,
        overallRating
      };

      mockDbData.doctorReviews[reviewId] = review;

      // Update doctor review aggregates
      docObj.reviewCount = (docObj.reviewCount || 0) + 1;
    }
  }

  // 5. Update Doctor average understanding scores based on reviews
  doctors.forEach(doc => {
    const docReviews = Object.values(mockDbData.doctorReviews).filter(r => r.doctorId === doc.id);
    if (docReviews.length > 0) {
      // Calculate understanding rating from explanationOfDecision and decisionJustified (normalized to 100%)
      const sum = docReviews.reduce((acc, r) => acc + r.explanationOfDecision + r.decisionJustified, 0);
      const avg = sum / (docReviews.length * 2); // 1 to 5 scale
      doc.understandingScore = Number(((avg / 5) * 100).toFixed(1));
    } else {
      doc.understandingScore = 90.0; // default
    }
    // Save updated doctor in our mock database
    mockDbData.doctors[doc.id] = doc;
  });

  // 6. Calculate dynamic system-wide dashboard metrics from the seeded data
  console.log('Calculating dynamically aggregated analytics from seeded cases...');
  const allCasesList = Object.values(mockDbData.cases);
  const allReviewsList = Object.values(mockDbData.doctorReviews);

  const completedCasesCount = allCasesList.filter(c => c.status === 'completed' || c.status === 'reviewed').length;
  const secondOpinionsCount = allCasesList.filter(c => c.status === 'second_opinion_requested' || c.status === 'reviewed').length;

  // Average understanding score of all reviews (normalized to 100%)
  const totalUnderstandingScore = allReviewsList.reduce((acc, r) => acc + (r.explanationOfDecision / 5) * 100, 0);
  const avgUnderstanding = allReviewsList.length > 0 ? totalUnderstandingScore / allReviewsList.length : 94.2;

  // Average easeOfCommunication rating as transparency score
  const totalCommunication = allReviewsList.reduce((acc, r) => acc + (r.easeOfCommunication / 5) * 100, 0);
  const avgTransparency = allReviewsList.length > 0 ? totalCommunication / allReviewsList.length : 88.5;

  // Sum up all case costs for exposure, and completed/reviewed for potential claim payout audited
  let potentialClaimsExposure = 0;
  let potentialClaimsReviewed = 0;
  let highCostCount = 0;

  allCasesList.forEach(c => {
    // Determine cost based on procedure type by checking document text or setting default
    const docRecord = Object.values(mockDbData.documents).find(d => d.caseId === c.id);
    let cost = 185; // default normal delivery
    if (docRecord) {
      if (docRecord.extractedText.includes('C-Section')) cost = 1700;
      else if (docRecord.extractedText.includes('Myomectomy')) cost = 3200;
      else if (docRecord.extractedText.includes('Cholecystectomy')) cost = 2500;
      else if (docRecord.extractedText.includes('Appendectomy')) cost = 1800;
      else if (docRecord.extractedText.includes('Arthroscopy')) cost = 4500;
      else if (docRecord.extractedText.includes('CABG')) cost = 22000;
      else if (docRecord.extractedText.includes('Pediatric')) cost = 80;
      else if (docRecord.extractedText.includes('Chronic Clinic')) cost = 50;
    }
    potentialClaimsExposure += cost;
    if (c.status === 'completed' || c.status === 'reviewed') {
      potentialClaimsReviewed += cost;
    }
    if (cost >= 1000) {
      highCostCount += 1;
    }
  });

  const analyticsMetrics: AnalyticsMetric[] = [
    { metricName: 'totalCasesReviewed', metricValue: completedCasesCount, period: 'all', updatedAt: new Date().toISOString() },
    { metricName: 'secondOpinionsRequested', metricValue: secondOpinionsCount, period: 'all', updatedAt: new Date().toISOString() },
    { metricName: 'highCostProceduresReviewed', metricValue: highCostCount, period: 'all', updatedAt: new Date().toISOString() },
    { metricName: 'memberUnderstandingScore', metricValue: Number(avgUnderstanding.toFixed(1)), period: 'all', updatedAt: new Date().toISOString() },
    { metricName: 'transparencyScore', metricValue: Number(avgTransparency.toFixed(1)), period: 'all', updatedAt: new Date().toISOString() },
    { metricName: 'potentialClaimsExposure', metricValue: potentialClaimsExposure, period: 'all', updatedAt: new Date().toISOString() },
    { metricName: 'potentialClaimsReviewed', metricValue: potentialClaimsReviewed, period: 'all', updatedAt: new Date().toISOString() }
  ];

  analyticsMetrics.forEach(m => mockDbData.analytics[m.metricName] = m);

  // 7. Write everything to mock_db.json
  const localDbPath = path.join(process.cwd(), 'mock_db.json');
  console.log(`Writing data to local JSON DB file: ${localDbPath}`);
  fs.writeFileSync(localDbPath, JSON.stringify(mockDbData, null, 2), 'utf8');
  console.log('✅ Local mock_db.json written successfully!');

  // 8. Write to Firestore if connected
  if (useFirebase && firestoreDb) {
    console.log('Writing records to Firestore...');
    const collections = ['users', 'doctors', 'cases', 'documents', 'aiReports', 'secondOpinions', 'doctorReviews', 'analytics'];

    // Define a batch helper class that commits groups of 400 documents
    class FirestoreBatchManager {
      private batch = firestoreDb!.batch();
      private count = 0;
      private commits: Promise<any>[] = [];

      async set(collectionName: string, docId: string, data: any) {
        const docRef = firestoreDb!.collection(collectionName).doc(docId);
        this.batch.set(docRef, data);
        this.count++;

        if (this.count >= 400) {
          console.log(`Committing batch of ${this.count} records...`);
          this.commits.push(this.batch.commit());
          this.batch = firestoreDb!.batch();
          this.count = 0;
        }
      }

      async finish() {
        if (this.count > 0) {
          console.log(`Committing final batch of ${this.count} records...`);
          this.commits.push(this.batch.commit());
        }
        await Promise.all(this.commits);
        console.log('All Firestore batches committed successfully!');
      }
    }

    const batchManager = new FirestoreBatchManager();

    // Users
    for (const [id, data] of Object.entries(mockDbData.users)) {
      await batchManager.set('users', id, data);
    }
    // Doctors
    for (const [id, data] of Object.entries(mockDbData.doctors)) {
      await batchManager.set('doctors', id, data);
    }
    // Cases
    for (const [id, data] of Object.entries(mockDbData.cases)) {
      await batchManager.set('cases', id, data);
    }
    // Documents
    for (const [id, data] of Object.entries(mockDbData.documents)) {
      await batchManager.set('documents', id, data);
    }
    // AI Reports
    for (const [id, data] of Object.entries(mockDbData.aiReports)) {
      await batchManager.set('aiReports', id, data);
    }
    // Second Opinions
    for (const [id, data] of Object.entries(mockDbData.secondOpinions)) {
      await batchManager.set('secondOpinions', id, data);
    }
    // Doctor Reviews
    for (const [id, data] of Object.entries(mockDbData.doctorReviews)) {
      await batchManager.set('doctorReviews', id, data);
    }
    // Analytics
    for (const [id, data] of Object.entries(mockDbData.analytics)) {
      await batchManager.set('analytics', id, data);
    }

    await batchManager.finish();
    console.log('✅ Firestore write completed successfully!');
  }

  console.log('🎉 Firestore and mock DB Seeding Completed Successfully! 🎉');
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
