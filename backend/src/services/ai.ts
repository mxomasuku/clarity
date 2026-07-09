import { AiReport, Pathway } from './db.js';
import { v4 as uuidv4 } from 'uuid';

export const aiService = {
  async generateReport(caseId: string, extractedText: string): Promise<AiReport> {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    const textLower = extractedText.toLowerCase();

    let summary = '';
    let explanation = '';
    let pathways: Pathway[] = [];
    let questions: string[] = [];
    const extractedLines = extractedText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 8);

    // Case 1: Medial Meniscus Tear (Knee MRI)
    if (textLower.includes('meniscus') || textLower.includes('knee mri')) {
      summary = 'Your doctor recommends a left knee arthroscopy (a minimally invasive keyhole surgery) to evaluate and potentially repair or trim a torn shock-absorbing cartilage (medial meniscus) in your knee.';
      
      explanation = 'Your MRI report describes a "complex tear" in the posterior horn of the medial meniscus. The medial meniscus is a C-shaped piece of tough, rubbery cartilage that acts as a shock absorber between your thighbone (femur) and shinbone (tibia). A tear in this area can cause pain, swelling, stiffness, and sometimes mechanical symptoms like clicking, catching, or the knee "locking" in place. Because cartilage has a limited blood supply, it does not heal easily on its own. The proposed arthroscopic surgery involves inserting a tiny camera and specialized surgical instruments through small incisions in your knee to either repair the tear or trim away the torn tissue.';

      pathways = [
        {
          title: 'Conservative Management (Non-Surgical Care)',
          description: 'Focuses on rest, activity modification, ice, temporary use of anti-inflammatory supports, and structured physical therapy (physiotherapy) to strengthen the muscles supporting the knee joint.',
          benefits: 'Avoids surgical risks (such as infection or anesthesia complications), involves no surgical recovery downtime, and has lower immediate costs.',
          risks: 'May not resolve mechanical symptoms like locking or catching if a large cartilage flap is unstable, and symptoms may return upon resuming high-impact activities.',
          considerations: 'This is often a suitable first step for stable tears, degenerative tears, or patients with mild, manageable symptoms.'
        },
        {
          title: 'Arthroscopic Meniscal Repair (Surgical)',
          description: 'A surgeon accesses the joint through tiny keyhole incisions, inspects the tear, and uses small sutures to sew the torn edges of the meniscus back together.',
          benefits: 'Preserves the shock-absorbing cartilage, which helps distribute weight across the joint and reduces the long-term risk of developing knee osteoarthritis.',
          risks: 'Requires a longer recovery period (often 4-6 weeks on crutches and wearing a brace) to allow the tissue to heal. There is also a risk that the repair does not successfully fuse.',
          considerations: 'Typically recommended for younger, active patients with tears located in the outer portion of the meniscus where there is a good blood supply.'
        },
        {
          title: 'Partial Meniscectomy (Surgical Debridement)',
          description: 'The surgeon uses arthroscopic keyhole tools to trim away only the unstable, torn pieces of cartilage, leaving behind as much healthy, stable cartilage as possible.',
          benefits: 'Provides rapid relief from pain and mechanical locking, allows for faster recovery, and usually permits weight-bearing and return to normal walking within days.',
          risks: 'Removing cushioning cartilage increases the pressure on the bone surfaces, which can accelerate joint wear-and-tear and lead to osteoarthritis in the future.',
          considerations: 'Usually chosen when the tear is in an area with poor blood supply (inner zone) where a repair is unlikely to heal, or for complex degenerative tears.'
        }
      ];

      questions = [
        'Why is surgery recommended in my case rather than starting with physical therapy?',
        'Is my meniscus tear in an area that can be repaired (sewed together), or does it need to be trimmed (meniscectomy)?',
        'What is the expected recovery timeline, and how soon will I be able to walk, drive, or return to work?',
        'If we choose surgery, what will my physical rehabilitation schedule look like?',
        'What are the long-term effects on my knee joint if we choose conservative management versus a partial meniscectomy?'
      ];
    }
    // Case 2: Coronary Artery Disease (CABG)
    else if (textLower.includes('coronary') || textLower.includes('angiogram') || textLower.includes('cabg')) {
      summary = 'Your cardiologist recommends Coronary Artery Bypass Grafting (CABG, commonly called bypass surgery) to restore proper blood flow to your heart muscle due to blockages in three major arteries.';
      
      explanation = 'Your angiogram report shows severe blockages in three of your main heart arteries (triple-vessel disease), including an 85% blockage in your Left Anterior Descending (LAD) artery, which is critical for supplying blood to the front of your heart. When these arteries are narrowed by plaque, the heart muscle does not get enough oxygen-rich blood, causing chest pain (angina) and increasing the risk of a heart attack. Coronary Artery Bypass Grafting (CABG) is a major surgery where blood vessels (often taken from your chest wall, arm, or leg) are used to redirect blood flow around the blocked sections of your arteries, creating a "bypass" route to deliver blood to your heart.';

      pathways = [
        {
          title: 'Optimal Medical Therapy (OMT)',
          description: 'Uses a combination of prescription medications (cholesterol-lowering statins, blood-pressure drugs, blood thinners) alongside structured lifestyle changes (diet, exercise, smoking cessation) to manage plaque and prevent heart attacks.',
          benefits: 'Non-invasive, avoids surgical risks (such as stroke, infection, or cognitive changes), and has no post-operative recovery period.',
          risks: 'Does not physically open the blockages. Angina symptoms may persist, and in severe cases of triple-vessel disease, medical therapy alone may have a higher risk of heart attack or cardiac events compared to bypass surgery.',
          considerations: 'This is the foundation of cardiovascular care. It is always used in conjunction with other treatments, but on its own, it may not be sufficient for severe triple-vessel disease.'
        },
        {
          title: 'Coronary Artery Bypass Grafting (CABG - Surgical)',
          description: 'A cardiothoracic surgeon performs open-heart surgery to attach healthy blood vessels around the blocked portions of your coronary arteries.',
          benefits: 'Provides the most complete restoration of blood flow, offers significant long-term relief from chest pain, improves quality of life, and is proven to extend survival in patients with severe triple-vessel disease.',
          risks: 'A major open-heart surgery involving general anesthesia. Risks include surgical site infection, bleeding, heart rhythm disturbances, stroke, and a prolonged recovery period (typically 6-12 weeks).',
          considerations: 'This is considered the gold standard for patients with severe multi-vessel disease, especially when the critical LAD artery is blocked or if the patient has diabetes.'
        },
        {
          title: 'Percutaneous Coronary Intervention (PCI / Angioplasty & Stenting)',
          description: 'A cardiologist inserts a thin tube (catheter) through a blood vessel in the wrist or groin, inflates a small balloon to open the blocked artery, and places a mesh tube (stent) to keep it open.',
          benefits: 'Minimally invasive, performed under local anesthesia, requires only a short hospital stay (often overnight), and provides rapid relief from angina symptoms.',
          risks: 'Higher rate of blockages reforming in the same area over time compared to bypass surgery, meaning additional procedures may be needed. In complex triple-vessel disease, placing stents in all blockages can be highly technically challenging.',
          considerations: 'An alternative to bypass surgery that may be considered for patients who are too high-risk for open-heart surgery or who have specific blockages suitable for stents.'
        }
      ];

      questions = [
        'Why is bypass surgery (CABG) recommended for me instead of using stents (angioplasty)?',
        'What are the risks and benefits of performing this surgery on a beating heart (off-pump) versus using a heart-lung machine (on-pump)?',
        'What blood vessels will be used as grafts (e.g., chest wall arteries vs. leg veins), and what are the pros and cons of each?',
        'How long will I be in the hospital, and what does the home recovery process look like?',
        'What lifestyle and medication changes will I need to maintain after the surgery to prevent new blockages from forming?'
      ];
    }
    // Generic fallback for uploaded documents that do not match a known clinical pattern.
    else {
      const noReadableText = textLower.includes('no readable text was extracted');
      summary = noReadableText
        ? 'The document was uploaded successfully, but the local reader could not extract readable clinical text from it. The AI report is limited until OCR returns usable text.'
        : 'The document was uploaded and the available text was processed. A specific recommendation was not confidently classified, so this report focuses on what was extracted and what to clarify with your healthcare team.';
      
      explanation = noReadableText
        ? 'The upload pipeline stored the file and attempted extraction, but this local implementation could not read text from the file content. This can happen with scanned PDFs, photos, or image files unless an OCR provider is configured. Upload a text-based file to test the AI analysis path, or connect the OCR service before testing image-based medical records.'
        : [
            'The reader found the following text fragments and passed them to the AI analysis layer:',
            '',
            ...extractedLines.map(line => `- ${line}`),
            '',
            'Because the extracted text does not clearly match a supported clinical pattern yet, the AI is not making a procedure-specific explanation. Use the extracted text tab to confirm whether the reader captured the right content.'
          ].join('\n');

      pathways = [
        {
          title: 'Verify Extracted Text',
          description: 'Review the document text captured by the reader before relying on the AI explanation.',
          benefits: 'Confirms whether the pipeline is reading the uploaded file correctly.',
          risks: 'If the extracted text is incomplete or incorrect, downstream AI analysis may be misleading.',
          considerations: 'Use a text-based document for the clearest local test, or connect production OCR for scanned images and photos.'
        },
        {
          title: 'Clarify The Recommendation',
          description: 'Ask the clinician what diagnosis, treatment, medication, test, or procedure is being recommended.',
          benefits: 'Keeps the conversation focused on the actual clinical decision.',
          risks: 'Vague or missing recommendations make it hard to compare options or understand urgency.',
          considerations: 'Look for words such as diagnosis, impression, plan, recommendation, procedure, or prescription in the extracted text.'
        },
        {
          title: 'Request Human Review',
          description: 'Send the extracted document and AI summary to a qualified reviewer when the recommendation is unclear or high-stakes.',
          benefits: 'Adds clinical oversight before a patient acts on a complex recommendation.',
          risks: 'AI-only summaries are educational and can miss context that is obvious to a clinician.',
          considerations: 'Use this for invasive procedures, high-cost treatments, urgent timelines, or uncertainty about alternatives.'
        }
      ];

      questions = [
        'Did the extracted text match the original document accurately?',
        'What is the exact diagnosis or clinical concern in this document?',
        'What treatment, medication, test, or procedure is being recommended?',
        'How urgent is the recommendation, and what happens if I wait?',
        'What alternatives should I understand before making a decision?'
      ];
    }

    return {
      id: `rep_${uuidv4().substring(0, 8)}`,
      caseId,
      summary,
      explanation,
      pathways,
      questions,
      disclaimer: 'This information is educational and should not replace advice from a qualified healthcare professional.',
      createdAt: new Date().toISOString()
    };
  }
};
