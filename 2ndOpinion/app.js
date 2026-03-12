/* ==========================================================================
   EzeeHealth 2nd Opinion — Clinical Review Platform
   ========================================================================== */

// ===== DATA =====
const VALID_INVITE_CODES = ['ezee2026!'];
const DEMO_USERS = [
  { email: 'demo@ezeehealth.com', password: 'demo1234', name: 'Dr. Demo User' },
  { email: 'admin@ezeehealth.com', password: 'admin1234', name: 'Dr. Admin' }
];

let currentUser = null;
let currentFilter = 'all';
let uploadedFiles = [];

const CASES = [
  {
    id: 'ICR-2026-001',
    patient: 'Patient A',
    age: 38, gender: 'Female', height: '162 cm', weight: '116 kg',
    occupation: 'Administrative Officer, Government Sector',
    intro: '38-year-old female, 162 cm, 116 kg, Administrative Officer in Government Sector',
    type: 'Bariatric Surgery',
    procedure: 'Laparoscopic Sleeve Gastrectomy',
    facility: 'Hospital X',
    status: 'pending',
    date: '2026-02-28',
    mrn: 'PA-884521',
    thiqa: 'THQ-2026-XXXX-A',
    icd10: 'E66.01, E11.65, I10, G47.33',
    cpt: '43775',
    pdf: './cases/case-001-bariatric.pdf',
    guidelineKey: 'bariatric_surgery',
    extracted: {
      demographics: { Name: 'Patient A', Age: '38', Gender: 'Female', Height: '162 cm', Weight: '116 kg', BMI: '44.2 kg/m²', Occupation: 'Administrative Officer', MRN: 'PA-884521' },
      diagnosis: { Primary: 'Morbid Obesity with Multiple Comorbidities', 'ICD-10': 'E66.01, E11.65, I10, G47.33', Procedure: 'Laparoscopic Sleeve Gastrectomy', 'CPT Code': '43775' },
      comorbidities: { 'Type 2 Diabetes': 'HbA1c 8.9% — uncontrolled', 'Hypertension': 'On 3 medications (Amlodipine, Losartan, HCTZ)', 'Obstructive Sleep Apnoea': 'AHI 32 — severe, on CPAP', 'NAFLD': 'Grade 2 hepatic steatosis on USS' },
      investigations: { HbA1c: '8.9%', 'Fasting Glucose': '11.2 mmol/L', 'Total Cholesterol': '6.8 mmol/L', LDL: '4.2 mmol/L', HDL: '0.9 mmol/L', ALT: '68 U/L', AST: '52 U/L', TSH: '2.4 mIU/L' },
      treatment_history: { 'Tier 3 Programme': '12 months supervised diet — lost 3kg, regained', 'Orlistat': '6 months — minimal effect', 'Liraglutide': '8 months — insufficient', 'VLCD': '3 months dietician-supervised', 'Psychology': 'Cleared by clinical psychologist — no eating disorders' },
      imaging: { 'Abdominal USS': 'Grade 2 hepatic steatosis, no gallstones', 'Upper GI Endoscopy': 'No Barrett\'s, mild antral gastritis, H.pylori negative' }
    },
    ruleResults: [
      { rule: 'BAR-01', name: 'BMI Threshold', pass: true, detail: 'BMI 44.2 kg/m² exceeds threshold of 40. Additionally qualifies under Middle East adjusted threshold (37.5) with comorbidities.' },
      { rule: 'BAR-02', name: 'Comorbidity Qualification', pass: true, detail: 'Multiple qualifying comorbidities: T2DM (HbA1c 8.9%), Hypertension (3 medications), OSA (AHI 32), NAFLD.' },
      { rule: 'BAR-03', name: 'Non-Surgical Weight Management', pass: true, detail: 'Documented Tier 3 failure: 12 months supervised diet, Orlistat 6 months, Liraglutide 8 months, VLCD 3 months. All appropriately documented.' },
      { rule: 'BAR-04', name: 'Psychological Assessment', pass: true, detail: 'Formal psychological evaluation completed 15-Jan-2026. No active eating disorders or psychiatric contraindications documented.' },
      { rule: 'BAR-05', name: 'MDT Assessment', pass: false, detail: 'MDT assessment documentation not found in uploaded records. Require confirmation of multidisciplinary team review (surgeon, physician, dietitian, psychologist).' },
      { rule: 'BAR-06', name: 'Fast-Track Pathway', pass: true, detail: 'Qualifies for fast-track: BMI ≥ 35 with T2DM. However, diabetes duration appears > 10 years — standard pathway applies.' },
      { rule: 'BAR-07', name: 'Pre-operative Investigations', pass: true, detail: 'All required investigations present: HbA1c, fasting glucose, lipids, LFTs, TFTs, upper GI endoscopy, abdominal USS. Sleep study confirms OSA.' }
    ],
    recommendation: {
      type: 'more-info',
      title: 'Request Additional Information',
      text: 'The case substantially meets NICE NG246 criteria for bariatric surgery. However, one key requirement needs clarification:',
      items: ['MDT assessment documentation: Confirm that a multidisciplinary team (surgeon, physician, dietitian, psychologist) has reviewed and recommended surgery.', 'Once MDT confirmation is provided, this case would meet all mandatory NICE criteria for approval.']
    }
  },
  {
    id: 'ICR-2026-002',
    patient: 'Patient B',
    age: 67, gender: 'Male', height: '174 cm', weight: '82 kg',
    occupation: 'Retired Teacher',
    intro: '67-year-old male, 174 cm, 82 kg, Retired Teacher',
    type: 'Cataract Surgery',
    procedure: 'Phacoemulsification with IOL Implantation — Right Eye',
    facility: 'Hospital Y',
    status: 'reviewed',
    date: '2026-03-01',
    mrn: 'PB-773209',
    thiqa: 'THQ-2026-XXXX-B',
    icd10: 'H25.11, H25.12',
    cpt: '66984',
    pdf: './cases/case-002-cataract.pdf',
    guidelineKey: 'cataract_surgery',
    extracted: {
      demographics: { Name: 'Patient B', Age: '67', Gender: 'Male', Height: '174 cm', Weight: '82 kg', Occupation: 'Retired Teacher', MRN: 'PB-773209' },
      diagnosis: { Primary: 'Bilateral Age-Related Nuclear Sclerotic Cataracts', 'ICD-10': 'H25.11, H25.12', Procedure: 'Phacoemulsification with IOL — Right Eye', 'CPT Code': '66984' },
      visual_assessment: { 'Visual Acuity (Right)': '6/24 corrected', 'Visual Acuity (Left)': '6/18 corrected', 'Right Eye': 'Nuclear sclerosis Grade 3+, posterior subcapsular cataract', 'Left Eye': 'Nuclear sclerosis Grade 2+', 'IOP Right': '16 mmHg', 'IOP Left': '15 mmHg' },
      functional_impairment: { 'Driving': 'Stopped 6 months ago — unable to meet visual standards', 'Reading': 'Requires strong magnification, significant difficulty', 'Daily Activities': 'Unable to read Quran, difficulty recognising faces', 'Falls Risk': 'Moderate risk assessment documented' },
      investigations: { 'Biometry': 'IOL Master 700: AL 23.44mm, Target -0.50D', 'Recommended IOL': '+21.5D', 'Diabetic Screen': 'Mild NPDR both eyes, no macular oedema on OCT', 'HbA1c': '6.8% (well-controlled)' },
      pre_op: { 'Anaesthetic': 'Fit for day-case under topical', 'Anticoagulants': 'Aspirin 81mg — continue', 'Diabetes': 'Well-controlled on Metformin 500mg BD' }
    },
    ruleResults: [
      { rule: 'CAT-01', name: 'Functional Impairment', pass: true, detail: 'Significant functional impairment documented: stopped driving, difficulty reading, unable to read Quran, face recognition impaired. Falls risk moderate.' },
      { rule: 'CAT-02', name: 'Clinical Assessment', pass: true, detail: 'Comprehensive ophthalmic examination performed: slit-lamp, IOP, dilated fundus (B-scan due to cataract density). Grade 3+ nuclear sclerosis confirmed.' },
      { rule: 'CAT-03', name: 'Biometry', pass: true, detail: 'IOL Master 700 biometry completed: AL 23.44mm, target refraction -0.50D, IOL power +21.5D calculated.' },
      { rule: 'CAT-05', name: 'Second Eye Criteria', pass: true, detail: 'First eye surgery requested. Second eye (left) has Grade 2+ cataract and will be assessed independently per NICE mandated criteria.' },
      { rule: 'CAT-06', name: 'Day-Case Suitability', pass: true, detail: 'Confirmed suitable for day-case surgery under topical anaesthesia. Pre-op assessment complete. Diabetic retinopathy screening done: mild NPDR, no macular oedema.' }
    ],
    recommendation: {
      type: 'approve',
      title: 'Recommend Approval',
      text: 'This case fully meets NICE NG77 criteria for cataract surgery. All mandatory requirements are satisfied:',
      items: ['Documented functional impairment affecting multiple daily activities (driving, reading, religious practice)', 'Clinical assessment complete with Grade 3+ nuclear sclerosis confirmed', 'Pre-operative biometry performed with IOL calculation', 'Day-case suitability confirmed with appropriate pre-operative assessment', 'Note: NICE explicitly mandates that commissioners must NOT restrict based solely on visual acuity — functional impact is the determining criterion, which is clearly met here.']
    }
  },
  {
    id: 'ICR-2026-003',
    patient: 'Patient C',
    age: 7, gender: 'Male', height: '122 cm', weight: '24 kg',
    occupation: 'Student (Grade 2)',
    intro: '7-year-old male, 122 cm, 24 kg, Student (Grade 2)',
    type: 'Tonsillectomy',
    procedure: 'Tonsillectomy with Adenoidectomy',
    facility: 'Hospital Z',
    status: 'pending',
    date: '2026-03-03',
    mrn: 'PC-445832',
    thiqa: 'THQ-2026-XXXX-C',
    icd10: 'J35.01, G47.33',
    cpt: '42820, 42830',
    pdf: './cases/case-003-tonsillectomy.pdf',
    guidelineKey: 'tonsillectomy',
    extracted: {
      demographics: { Name: 'Patient C', Age: '7', Gender: 'Male', Height: '122 cm', Weight: '24 kg', Occupation: 'Student (Grade 2)', MRN: 'PC-445832' },
      diagnosis: { Primary: 'Recurrent Tonsillitis meeting Paradise Criteria + OSA', 'ICD-10': 'J35.01, G47.33', Procedure: 'Tonsillectomy with Adenoidectomy', 'CPT Code': '42820, 42830' },
      episode_history: { 'Total Episodes': '8 in 12 months', 'FeverPAIN Score': '≥ 4 on all episodes', 'Strep Positive': '5 of 8 episodes (culture confirmed)', 'Treatment': 'Full antibiotic courses documented for each episode' },
      functional_impact: { 'School Absence': '32 days missed in past academic year', 'Sleep': 'Significant snoring with witnessed apnoeic episodes', 'Oximetry': 'Desaturation index 8/hr, nadir SpO2 88%' },
      investigations: { 'Polysomnography': 'AHI 6.2 (moderate paediatric OSA)', 'Mean SpO2': '94%', 'Nadir SpO2': '86%', 'Haemoglobin': '12.8 g/dL', 'Coagulation': 'PT 12.1s, APTT 28.4s, INR 1.0', 'Blood Group': 'A Positive' },
      examination: { 'Tonsils': 'Grade 4 (kissing tonsils)', 'Adenoids': 'Hypertrophy confirmed on lateral neck X-ray', 'Neck': 'Bilateral level II reactive lymphadenopathy' }
    },
    ruleResults: [
      { rule: 'TON-01', name: 'Paradise Frequency Rule', pass: true, detail: '8 documented episodes in 12 months — exceeds Paradise criteria threshold of 7 episodes in 1 year. All episodes clinically documented with FeverPAIN score ≥ 4.' },
      { rule: 'TON-02', name: 'Clinical Documentation', pass: true, detail: 'Each episode documented with examination findings and FeverPAIN scoring. Positive Group A Strep on 5 of 8 episodes (culture confirmed).' },
      { rule: 'TON-03', name: 'Adequate Treatment', pass: true, detail: 'Full antibiotic courses (Amoxicillin/Azithromycin) documented for each episode via pharmacy records. Compliance confirmed.' },
      { rule: 'TON-04', name: 'Fast-Track: Obstructive Sleep Apnoea', pass: true, detail: 'QUALIFIES FOR FAST-TRACK: Obstructive sleep apnoea with tonsil enlargement (Grade 4 kissing tonsils). PSG: AHI 6.2, nadir SpO2 86%. Auto-approve pathway applicable.' },
      { rule: 'TON-06', name: 'Consultant Assessment', pass: true, detail: 'ENT consultant letter documenting failure of conservative management and surgical recommendation present in records.' }
    ],
    recommendation: {
      type: 'approve',
      title: 'Recommend Approval (Fast-Track)',
      text: 'This case meets both standard Paradise criteria AND fast-track approval criteria under NICE CG60/SIGN 117:',
      items: ['Paradise criteria exceeded: 8 episodes in 12 months (threshold: 7)', 'Fast-track pathway triggered: Obstructive sleep apnoea with Grade 4 tonsil enlargement and moderate paediatric OSA (AHI 6.2)', '32 school days missed — significant functional impact on education', 'All episodes clinically documented with appropriate treatment completed', 'Strong recommendation for expedited surgical approval.']
    }
  },
  {
    id: 'ICR-2026-004',
    patient: 'Patient D',
    age: 53, gender: 'Male', height: '178 cm', weight: '91 kg',
    occupation: 'Office Worker, Government Sector',
    intro: '53-year-old male, 178 cm, 91 kg, Office Worker in Government Sector',
    type: 'Spinal Surgery',
    procedure: 'L4/L5 Microdiscectomy',
    facility: 'Hospital W',
    status: 'pending',
    date: '2026-03-05',
    mrn: 'PD-662184',
    thiqa: 'THQ-2026-XXXX-D',
    icd10: 'M51.16, M54.16',
    cpt: '63030',
    pdf: './cases/case-004-spinal.pdf',
    guidelineKey: 'spinal_surgery',
    extracted: {
      demographics: { Name: 'Patient D', Age: '53', Gender: 'Male', Height: '178 cm', Weight: '91 kg', Occupation: 'Office Worker, Government', MRN: 'PD-662184' },
      diagnosis: { Primary: 'L4/L5 Disc Herniation with Left L5 Radiculopathy', 'ICD-10': 'M51.16, M54.16', Procedure: 'L4/L5 Microdiscectomy', 'CPT Code': '63030' },
      neurological_exam: { 'Left EHL': '4/5 (weak)', 'Left Tibialis Anterior': '4/5 (weak)', 'Sensory': 'Reduced L5 dermatome left', 'SLR Left': 'Positive at 30°', 'Cauda Equina': 'No features — bladder/bowel normal', 'Waddell Signs': '0/5' },
      conservative_management: { 'Physiotherapy': '12 weeks structured programme — documented compliance', 'ODI Pre-physio': '58% (severe disability)', 'ODI Post-physio': '52% (minimal improvement)', 'Paracetamol': '1g QDS for 8 weeks', 'Naproxen': '500mg BD for 6 weeks', 'Pregabalin': '300mg BD for 10 weeks', 'Nerve Root Block': 'L5 left — partial relief, 3 weeks only', 'Total Duration': '8 months conservative management' },
      imaging: { 'MRI Lumbar': 'Large left paracentral disc protrusion L4/L5 — severe L5 nerve root compression', 'Degenerative Changes': 'Mild at L3/L4', 'Instability': 'None on flexion-extension views', 'X-ray': 'No spondylolisthesis, normal alignment' },
      mdt: { 'MDT Date': '20-Jan-2026', 'Recommendation': 'Consensus for L4/L5 microdiscectomy', 'Members': 'Spine Surgeon, Pain Medicine, Physiotherapist', 'Rationale': 'Progressive neurological deficit + failed conservative management' }
    },
    ruleResults: [
      { rule: 'SPI-01', name: 'Conservative Management Duration', pass: true, detail: '8 months of structured conservative management documented — exceeds minimum 6-week requirement. 12-week physiotherapy programme with documented compliance.' },
      { rule: 'SPI-02', name: 'Adequate Analgesia Trial', pass: true, detail: 'Full analgesia trial documented: Paracetamol (8 weeks), NSAID/Naproxen (6 weeks), Pregabalin (10 weeks), plus nerve root block with only partial temporary relief.' },
      { rule: 'SPI-03', name: 'Progressive Neurological Deficit', pass: true, detail: 'Progressive weakness documented: Left EHL and tibialis anterior both 4/5 with sensory deficit in L5 dermatome. This supports expedited surgical pathway.' },
      { rule: 'SPI-05', name: 'Radiological Confirmation', pass: true, detail: 'MRI confirms large left paracentral disc protrusion at L4/L5 with severe L5 nerve root compression. Clinical correlation confirmed — symptoms match radiological findings.' },
      { rule: 'SPI-06', name: 'Waddell Signs Assessment', pass: true, detail: '0/5 Waddell signs. No psychosocial red flags identified. Occupational contributors excluded (office worker, off work 4 months).' },
      { rule: 'SPI-07', name: 'MDT Review', pass: true, detail: 'Spine MDT review documented 20-Jan-2026: Spine Surgeon + Pain Medicine + Physiotherapist. Consensus recommendation for surgery.' },
      { rule: 'SPI-08', name: 'Fusion Not Requested', pass: true, detail: 'Microdiscectomy requested (not fusion). Appropriate for confirmed disc herniation with radiculopathy and MRI correlation. No instability requiring fusion.' }
    ],
    recommendation: {
      type: 'approve',
      title: 'Recommend Approval',
      text: 'This case fully meets NICE NG59 criteria for spinal surgery (microdiscectomy). All mandatory and recommended requirements are satisfied:',
      items: ['8 months comprehensive conservative management with documented failure', 'Progressive neurological deficit (motor weakness L5) supporting surgical indication', 'MRI-confirmed pathology with clinical correlation', 'Waddell signs 0/5 — no psychosocial confounders', 'MDT review completed with consensus surgical recommendation', 'Microdiscectomy (not fusion) is evidence-appropriate for this presentation.']
    }
  },
  {
    id: 'ICR-2026-005',
    patient: 'Patient E',
    age: 60, gender: 'Male', height: '170 cm', weight: '88 kg',
    occupation: 'Business Owner',
    intro: '60-year-old male, 170 cm, 88 kg, Business Owner',
    type: 'Elective PCI',
    procedure: 'Elective PCI to LAD',
    facility: 'Hospital V',
    status: 'pending',
    date: '2026-03-07',
    mrn: 'PE-991347',
    thiqa: 'THQ-2026-XXXX-E',
    icd10: 'I25.11, I20.8',
    cpt: '92928',
    pdf: './cases/case-005-pci.pdf',
    guidelineKey: 'elective_pci',
    extracted: {
      demographics: { Name: 'Patient E', Age: '60', Gender: 'Male', Height: '170 cm', Weight: '88 kg', Occupation: 'Business Owner', MRN: 'PE-991347' },
      diagnosis: { Primary: 'Stable Angina — Single Vessel CAD with Significant Stenosis', 'ICD-10': 'I25.11, I20.8', Procedure: 'Elective PCI to LAD', 'CPT Code': '92928' },
      symptom_assessment: { 'CCS Class': 'III — limiting daily activities', 'Symptom Duration': '6 months on optimal medical therapy', 'Exercise Tolerance': '>200m walking or 1 flight of stairs', 'GTN Response': 'Relief within 3-5 minutes', 'ED Presentations': '2 in past 3 months (ACS ruled out)' },
      medical_therapy: { 'Bisoprolol': '10mg OD (max tolerated, HR 58)', 'Amlodipine': '10mg OD', 'Isosorbide Mononitrate': '60mg OD', 'Aspirin': '81mg OD', 'Atorvastatin': '80mg ON', 'Clopidogrel': '75mg OD', 'Duration': '6 months — persisting CCS Class III' },
      investigations: { 'Stress ECG': 'Positive at Stage 2, 2mm ST depression V3-V5', 'Echocardiogram': 'LVEF 55%, normal walls, normal valves', 'Angiogram': '80% stenosis mid-LAD, minor RCA/LCx disease', 'FFR': '0.72 (significant ≤ 0.80)', 'SYNTAX Score': '8 (low)' },
      risk_assessment: { 'SYNTAX Score': '8 — low complexity', 'FFR Value': '0.72 — haemodynamically significant', 'EuroSCORE II': '1.2% — low surgical risk', 'Heart Team': 'PCI recommended over CABG — single vessel, low SYNTAX' }
    },
    ruleResults: [
      { rule: 'PCI-01', name: 'Symptom Burden', pass: true, detail: 'CCS Class III angina persisting despite 6 months optimal medical therapy. Significant QoL impairment with documented ischaemia on stress testing.' },
      { rule: 'PCI-02', name: 'FFR-Confirmed Ischaemia', pass: true, detail: 'FFR 0.72 — below significance threshold of ≤ 0.80. NICE explicitly recommends FFR-guided PCI. Haemodynamic significance confirmed.' },
      { rule: 'PCI-03', name: 'Optimal Medical Therapy Trial', pass: true, detail: '6 months on maximal anti-anginal therapy (beta-blocker at max dose, CCB, nitrate). Persisting CCS III symptoms. Two ED presentations with chest pain.' },
      { rule: 'PCI-05', name: 'SYNTAX Score Assessment', pass: true, detail: 'SYNTAX Score 8 (low) — single vessel disease. Appropriate for PCI rather than CABG per guidelines.' },
      { rule: 'PCI-06', name: 'Heart Team Decision', pass: true, detail: 'Heart Team meeting documented 10-Feb-2026: Interventional Cardiologist + Cardiac Surgeon + Non-invasive Cardiologist. Consensus for PCI.' },
      { rule: 'PCI-07', name: 'ISCHEMIA Trial Advisory', pass: null, detail: 'ADVISORY: ISCHEMIA trial (NEJM 2020) showed no mortality/MI benefit for invasive strategy in stable ischaemic heart disease. However, patient has persisting symptoms on maximal therapy — quality of life indication is valid for PCI in this context.' }
    ],
    recommendation: {
      type: 'approve',
      title: 'Recommend Approval',
      text: 'This case meets NICE CG126 criteria for elective PCI. Key criteria satisfied:',
      items: ['Persisting CCS Class III symptoms on 6 months maximal medical therapy', 'FFR-confirmed haemodynamic significance (0.72 < 0.80 threshold)', 'Low SYNTAX score (8) — PCI appropriate over CABG for single-vessel disease', 'Heart Team consensus documented', 'Note: While the ISCHEMIA trial showed no mortality benefit, PCI is supported for quality-of-life improvement in patients with refractory symptoms on optimal medical therapy.']
    }
  }
];

// NICE Guidelines data
const GUIDELINES = {
  bariatric_surgery: { id: 'NICE-NG246', title: 'Bariatric Surgery', subtitle: 'Obesity: Identification, Assessment and Management', year: 2023, rules: [
    { id: 'BAR-01', category: 'BMI Threshold', severity: 'MANDATORY', desc: 'BMI ≥ 40 kg/m²; OR BMI 35–39.9 with significant comorbidity (T2DM, HTN, OSA, OA). Middle East adjustment: threshold reduced by 2.5 kg/m² for South Asian/Middle Eastern populations.' },
    { id: 'BAR-02', category: 'Comorbidity Qualification', severity: 'MANDATORY', desc: 'At least one qualifying comorbidity: Type 2 Diabetes, Hypertension, Obstructive Sleep Apnoea, Severe Osteoarthritis, NAFLD/NASH.' },
    { id: 'BAR-03', category: 'Non-Surgical Weight Management', severity: 'MANDATORY', desc: 'Documented failure of Tier 3 structured weight management programme: supervised diet (≥6 months), physical activity, behavioural support, pharmacotherapy trial.' },
    { id: 'BAR-04', category: 'Psychological Assessment', severity: 'MANDATORY', desc: 'Formal psychological evaluation to exclude active untreated eating disorders or psychiatric contraindications.' },
    { id: 'BAR-05', category: 'MDT Assessment', severity: 'MANDATORY', desc: 'Multidisciplinary team assessment including surgeon, physician, dietitian, psychologist.' },
    { id: 'BAR-06', category: 'Fast-Track Pathway', severity: 'CONDITIONAL', desc: 'BMI ≥ 35 + recent-onset T2DM (< 10 years): expedited pathway but still requires MDT sign-off.' },
    { id: 'BAR-07', category: 'Pre-operative Investigations', severity: 'RECOMMENDED', desc: 'HbA1c, fasting glucose, lipid panel, LFTs, TFTs, upper GI endoscopy, abdominal USS, sleep study if OSA suspected.' }
  ]},
  cataract_surgery: { id: 'NICE-NG77', title: 'Cataract Surgery', subtitle: 'Cataracts in Adults: Management', year: 2017, rules: [
    { id: 'CAT-01', category: 'Functional Impairment', severity: 'MANDATORY', desc: 'Documented difficulty with daily activities (driving, reading, work, social function) attributable to cataract — regardless of Snellen acuity. NICE mandates: commissioners must NOT restrict based solely on visual acuity.' },
    { id: 'CAT-02', category: 'Clinical Assessment', severity: 'MANDATORY', desc: 'Comprehensive ophthalmic examination: slit-lamp biomicroscopy, IOP measurement, dilated fundus examination (or B-scan if view obscured).' },
    { id: 'CAT-03', category: 'Biometry', severity: 'MANDATORY', desc: 'Pre-operative biometry for IOL calculation (IOL Master or immersion ultrasound).' },
    { id: 'CAT-04', category: 'Do NOT Approve If', severity: 'EXCLUSION', desc: 'No documented functional impairment; patient asymptomatic; optometry referral premature (GP self-referral without functional complaint).' },
    { id: 'CAT-05', category: 'Second Eye Surgery', severity: 'MANDATORY', desc: 'Must be assessed on identical criteria to first eye. Blanket restrictions on second-eye procedures are NOT NICE-compliant.' },
    { id: 'CAT-06', category: 'Day-Case Suitability', severity: 'RECOMMENDED', desc: 'Confirm day-case suitability, appropriate pre-op refraction documented, absence of contraindications.' }
  ]},
  tonsillectomy: { id: 'NICE-CG60', title: 'Tonsillectomy', subtitle: 'Management of Sore Throat and Indications', year: 2019, rules: [
    { id: 'TON-01', category: 'Paradise Frequency Rule', severity: 'MANDATORY', desc: '7+ episodes in 1 year, OR 5+ in each of 2 consecutive years, OR 3+ in each of 3 consecutive years. Episodes must be clinically documented (FeverPAIN or Centor score).' },
    { id: 'TON-02', category: 'Clinical Documentation', severity: 'MANDATORY', desc: 'Each episode clinically documented with examination findings, treatment received, functional impairment confirmed (school/work absence).' },
    { id: 'TON-03', category: 'Adequate Treatment', severity: 'MANDATORY', desc: 'Documented adequate antibiotic treatment for each episode with compliance confirmed.' },
    { id: 'TON-04', category: 'Fast-Track Approval', severity: 'FAST_TRACK', desc: 'Auto-approve: Obstructive sleep apnoea with tonsil enlargement, suspected tonsillar malignancy, recurrent peritonsillar abscess (≥2), severe immunodeficiency.' },
    { id: 'TON-05', category: 'Do NOT Approve', severity: 'EXCLUSION', desc: 'Halitosis alone; non-clinically-documented sore throats; parental preference without clinical criteria; episodes resolved spontaneously.' },
    { id: 'TON-06', category: 'Consultant Assessment', severity: 'MANDATORY', desc: 'GP records or consultant letters confirming episode documentation mandatory.' }
  ]},
  spinal_surgery: { id: 'NICE-NG59', title: 'Spinal Surgery', subtitle: 'Low Back Pain and Sciatica in Over 16s', year: 2016, rules: [
    { id: 'SPI-01', category: 'Conservative Management', severity: 'MANDATORY', desc: 'Minimum 6 weeks structured conservative management (physiotherapy programme) documented.' },
    { id: 'SPI-02', category: 'Adequate Analgesia Trial', severity: 'MANDATORY', desc: 'Trial of adequate analgesia: NSAID + paracetamol ± nerve-root block documented.' },
    { id: 'SPI-03', category: 'Progressive Neurological Deficit', severity: 'FAST_TRACK', desc: 'Progressive neurological deterioration (weakness, sensory loss) — may expedite surgical pathway.' },
    { id: 'SPI-04', category: 'Cauda Equina Syndrome', severity: 'EMERGENCY', desc: 'Cauda equina syndrome: EMERGENCY — bypasses prior authorisation entirely.' },
    { id: 'SPI-05', category: 'Radiological Confirmation', severity: 'MANDATORY', desc: 'MRI confirmation with clinical correlation mandatory. NOT for incidental MRI findings without clinical signs.' },
    { id: 'SPI-06', category: 'Waddell Signs', severity: 'MANDATORY', desc: 'Waddell sign assessment: psychosocial factors predict poor surgical outcome. Exclusion of occupational/psychosocial contributors required.' },
    { id: 'SPI-07', category: 'MDT Review', severity: 'MANDATORY', desc: 'Mandatory: spinal surgeon + physiotherapist + pain consultant review.' },
    { id: 'SPI-08', category: 'Fusion Restrictions', severity: 'MANDATORY', desc: 'Spinal fusion ONLY for: structural instability, deformity correction, post-decompression instability. NOT for mechanical low back pain alone.' }
  ]},
  elective_pci: { id: 'NICE-CG126', title: 'Elective PCI', subtitle: 'Stable Angina: Management', year: 2011, rules: [
    { id: 'PCI-01', category: 'Symptom Burden', severity: 'MANDATORY', desc: 'Angina not controlled on optimal medical therapy; OR significant QoL impairment with documented ischaemia.' },
    { id: 'PCI-02', category: 'FFR-Confirmed Ischaemia', severity: 'MANDATORY', desc: 'NICE recommends FFR-guided PCI. Intermediate lesions (50–90%) require FFR/iFR ≤ 0.80 for haemodynamic confirmation.' },
    { id: 'PCI-03', category: 'Optimal Medical Therapy', severity: 'MANDATORY', desc: 'Documented trial of optimal medical therapy for minimum 4–6 weeks before revascularisation.' },
    { id: 'PCI-04', category: 'Do NOT Approve', severity: 'EXCLUSION', desc: 'No medical therapy trial; anatomy-only indication; patient preference without clinical indication; stable symptoms on medication.' },
    { id: 'PCI-05', category: 'SYNTAX Score', severity: 'MANDATORY', desc: 'SYNTAX Score mandatory for multivessel disease. Heart Team to determine PCI vs CABG vs medical management.' },
    { id: 'PCI-06', category: 'Heart Team Decision', severity: 'MANDATORY', desc: 'Heart Team meeting required: interventional cardiologist + cardiac surgeon minimum.' },
    { id: 'PCI-07', category: 'ISCHEMIA Trial', severity: 'ADVISORY', desc: 'ISCHEMIA Trial (NEJM 2020, N=5,179): Invasive strategy showed NO reduction in death or MI vs optimal medical therapy at 3.2 years in stable ischaemic heart disease.' }
  ]},
  hip_replacement: { id: 'NICE-NG226', title: 'Hip Replacement', subtitle: 'Joint Replacement: Primary Hip, Knee and Shoulder', year: 2020, rules: [
    { id: 'HIP-01', category: 'Pain & Function', severity: 'MANDATORY', desc: 'Significant pain and functional limitation despite conservative management.' },
    { id: 'HIP-02', category: 'Radiological Evidence', severity: 'MANDATORY', desc: 'Radiological evidence of joint disease (OA, inflammatory arthropathy).' },
    { id: 'HIP-03', category: 'Conservative Trial', severity: 'MANDATORY', desc: 'Trial of conservative management: physiotherapy, weight management, analgesia.' },
    { id: 'HIP-04', category: 'BMI Consideration', severity: 'ADVISORY', desc: 'BMI should not be used as sole criterion to restrict access to surgery.' }
  ]},
  knee_replacement: { id: 'NICE-NG226', title: 'Knee Replacement', subtitle: 'Joint Replacement: Primary Hip, Knee and Shoulder', year: 2020, rules: [
    { id: 'KNE-01', category: 'Pain & Function', severity: 'MANDATORY', desc: 'Significant pain and functional limitation affecting quality of life.' },
    { id: 'KNE-02', category: 'Radiological Evidence', severity: 'MANDATORY', desc: 'Radiological evidence of joint disease.' },
    { id: 'KNE-03', category: 'Conservative Trial', severity: 'MANDATORY', desc: 'Documented failure of conservative management (minimum 3 months).' },
    { id: 'KNE-04', category: 'Arthroscopy Restriction', severity: 'EXCLUSION', desc: 'Knee arthroscopy NOT recommended for osteoarthritis unless mechanical locking.' }
  ]},
  cholecystectomy: { id: 'NICE-CG188', title: 'Cholecystectomy', subtitle: 'Gallstone Disease: Diagnosis and Management', year: 2014, rules: [
    { id: 'CHO-01', category: 'Symptomatic Gallstones', severity: 'MANDATORY', desc: 'Confirmed symptomatic gallstones on imaging.' },
    { id: 'CHO-02', category: 'Complications History', severity: 'FAST_TRACK', desc: 'History of pancreatitis or cholangitis warrants expedited surgery.' },
    { id: 'CHO-03', category: 'Asymptomatic Exclusion', severity: 'EXCLUSION', desc: 'Incidental/asymptomatic gallstones should NOT be offered cholecystectomy.' }
  ]},
  hernia_repair: { id: 'NICE-IPG', title: 'Hernia Repair', subtitle: 'Hernia Repair Guidelines', year: 2019, rules: [
    { id: 'HER-01', category: 'Symptomatic', severity: 'MANDATORY', desc: 'Symptomatic hernia with pain or functional limitation.' },
    { id: 'HER-02', category: 'Complication Risk', severity: 'FAST_TRACK', desc: 'Risk of incarceration/strangulation in femoral or large hernias.' },
    { id: 'HER-03', category: 'Watchful Waiting', severity: 'ADVISORY', desc: 'Asymptomatic inguinal hernias: watchful waiting is safe alternative.' }
  ]},
  thyroid_surgery: { id: 'NICE-NG145', title: 'Thyroid Surgery', subtitle: 'Thyroid Disease Assessment and Management', year: 2019, rules: [
    { id: 'THY-01', category: 'Malignancy Suspicion', severity: 'FAST_TRACK', desc: 'Thy3f/Thy4/Thy5 on FNA cytology or suspicious USS features.' },
    { id: 'THY-02', category: 'Compressive Symptoms', severity: 'MANDATORY', desc: 'Documented compressive symptoms (dysphagia, stridor) from large goitre.' },
    { id: 'THY-03', category: 'Thyrotoxicosis', severity: 'MANDATORY', desc: 'Failed medical management of thyrotoxicosis (Graves\' disease).' }
  ]}
};

// ===== NAVIGATION =====
function showLanding() {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('landing-page').classList.add('active');
}

function showAuth() {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('auth-page').classList.add('active');
}

function showApp() {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('app-page').classList.add('active');
  renderCases();
  renderRulesList();
  populateReviewDropdown();
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelector('.auth-tab[onclick*="' + tab + '"]').classList.add('active');
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('signup-error').style.display = 'none';
}

function toggleMobileMenu() {
  var links = document.querySelector('.landing-nav-links');
  links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
}

// ===== AUTH =====
function handleLogin(e) {
  e.preventDefault();
  var email = document.getElementById('login-email').value;
  var password = document.getElementById('login-password').value;
  var user = DEMO_USERS.find(function(u) { return u.email === email && u.password === password; });
  if (user) {
    currentUser = user;
    document.getElementById('user-display-name').textContent = user.name;
    showApp();
  } else {
    // For demo — accept any email/password
    currentUser = { email: email, name: email.split('@')[0], password: password };
    document.getElementById('user-display-name').textContent = currentUser.name;
    showApp();
  }
}

function handleSignup(e) {
  e.preventDefault();
  var invite = document.getElementById('signup-invite').value.trim();
  if (!VALID_INVITE_CODES.includes(invite)) {
    var err = document.getElementById('signup-error');
    err.textContent = 'Invalid invite code. Please contact your administrator.';
    err.style.display = 'block';
    return;
  }
  currentUser = {
    name: document.getElementById('signup-name').value,
    email: document.getElementById('signup-email').value
  };
  document.getElementById('user-display-name').textContent = currentUser.name;
  showApp();
}

function handleGoogleAuth() {
  // Simulated Google Auth for demo
  currentUser = { name: 'Dr. Google User', email: 'google@demo.com' };
  document.getElementById('user-display-name').textContent = currentUser.name;
  showApp();
}

function handleLogout() {
  currentUser = null;
  showLanding();
}

// ===== SIDEBAR =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

function switchView(view) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.sidebar-link').forEach(function(l) { l.classList.remove('active'); });
  document.querySelector('.sidebar-link[data-view="' + view + '"]').classList.add('active');
  // Close sidebar on mobile
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.add('collapsed');
  }
}

// ===== CASES =====
function renderCases() {
  var tbody = document.getElementById('cases-tbody');
  var search = (document.getElementById('case-search').value || '').toLowerCase();
  var filtered = CASES.filter(function(c) {
    var matchType = currentFilter === 'all' || c.type.toLowerCase().includes(currentFilter.toLowerCase());
    var matchSearch = !search || c.patient.toLowerCase().includes(search) || c.id.toLowerCase().includes(search) || c.procedure.toLowerCase().includes(search);
    return matchType && matchSearch;
  });
  tbody.innerHTML = filtered.map(function(c) {
    var statusClass = c.status === 'reviewed' ? 'status-reviewed' : c.status === 'uploaded' ? 'status-uploaded' : 'status-pending';
    var statusLabel = c.status.charAt(0).toUpperCase() + c.status.slice(1);
    return '<tr class="animate-in">' +
      '<td class="case-id">' + c.id + '</td>' +
      '<td><div class="patient-info"><span class="patient-name">' + c.patient + '</span><span class="patient-meta">' + c.intro + '</span></div></td>' +
      '<td>' + c.procedure + '</td>' +
      '<td>' + c.facility + '</td>' +
      '<td><span class="status-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
      '<td>' + c.date + '</td>' +
          "<td><button class='btn-view-case' onclick='openCaseReview(" + c.id + ")'> AI Review</button></td>" +
      '</tr>';
  }).join('');
}

function filterCases() { renderCases(); }

function filterByType(type, el) {
  currentFilter = type;
  document.querySelectorAll('.filter-chips .chip').forEach(function(c) { c.classList.remove('active'); });
  el.classList.add('active');
  renderCases();
}

function openCaseReview(caseId) {
  switchView('review');
  document.getElementById('review-case-dropdown').value = caseId;
  loadReviewCase(caseId);
}

// ===== UPLOAD =====
function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('dragover'); }
function handleDragLeave(e) { e.currentTarget.classList.remove('dragover'); }
function handleDrop(e) {
  e.preventDefault(); e.currentTarget.classList.remove('dragover');
  var files = Array.from(e.dataTransfer.files);
  files.forEach(function(f) { addUploadedFile(f); });
}
function handleFileSelect(e) {
  Array.from(e.target.files).forEach(function(f) { addUploadedFile(f); });
  e.target.value = '';
}

function addUploadedFile(file) {
  var id = 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  uploadedFiles.push({ id: id, name: file.name, size: file.size, type: file.type, date: new Date().toISOString().slice(0, 10) });
  renderUploadedFiles();
}

function renderUploadedFiles() {
  var container = document.getElementById('uploaded-files');
  container.innerHTML = uploadedFiles.map(function(f) {
    var sizeKB = (f.size / 1024).toFixed(1);
    return '<div class="uploaded-file animate-in">' +
      '<div class="uploaded-file-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
      '<div class="uploaded-file-info"><div class="uploaded-file-name">' + f.name + '</div><div class="uploaded-file-meta">' + sizeKB + ' KB · ' + f.date + '</div></div>' +
      '<div class="uploaded-file-actions"><button class="btn btn-ghost btn-sm" onclick="removeFile(\'' + f.id + '\')">Remove</button></div>' +
      '</div>';
  }).join('');
}

function removeFile(id) {
  uploadedFiles = uploadedFiles.filter(function(f) { return f.id !== id; });
  renderUploadedFiles();
}

function filterUploadCat(cat, el) {
  document.querySelectorAll('.category-btn').forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');
}

// ===== RULES ENGINE =====
function renderRulesList() {
  var list = document.getElementById('rules-list');
  list.innerHTML = Object.keys(GUIDELINES).map(function(key) {
    var g = GUIDELINES[key];
    return '<div class="rules-item" data-key="' + key + '" onclick="showGuideline(\'' + key + '\', this)">' +
      '<span class="rules-item-tag">' + g.id.replace('NICE-', '') + '</span>' +
      '<span>' + g.title + '</span></div>';
  }).join('');
}

function showGuideline(key, el) {
  document.querySelectorAll('.rules-item').forEach(function(i) { i.classList.remove('active'); });
  if (el) el.classList.add('active');

  var g = GUIDELINES[key];
  var detail = document.getElementById('rules-detail');
  var rulesHtml = g.rules.map(function(r) {
    return '<div class="rule-item">' +
      '<div class="rule-item-header">' +
        '<span class="rule-item-id">' + r.id + '</span>' +
        '<span class="rule-item-category">' + r.category + '</span>' +
        '<span class="rule-severity severity-' + r.severity + '">' + r.severity.replace('_', ' ') + '</span>' +
      '</div>' +
      '<div class="rule-item-desc">' + r.desc + '</div>' +
      '</div>';
  }).join('');

  detail.innerHTML = '<div class="rules-detail-header">' +
    '<h2>' + g.title + '</h2>' +
    '<div class="rules-detail-meta">' +
      '<span>' + g.id + '</span>' +
      '<span>' + g.subtitle + '</span>' +
      '<span>Year: ' + g.year + '</span>' +
      '<span>' + g.rules.length + ' rules</span>' +
    '</div></div>' + rulesHtml;
}

// ===== AI REVIEW =====
function populateReviewDropdown() {
  var sel = document.getElementById('review-case-dropdown');
  sel.innerHTML = '<option value="">Choose a case...</option>' +
    CASES.map(function(c) {
      return '<option value="' + c.id + '">' + c.id + ' — ' + c.patient + ' — ' + c.type + '</option>';
    }).join('');
}

function loadReviewCase(caseId) {
  if (!caseId) {
    document.getElementById('review-empty').style.display = 'flex';
    document.getElementById('review-panel').style.display = 'none';
    return;
  }

  var c = CASES.find(function(x) { return x.id === caseId; });
  if (!c) return;

  document.getElementById('review-empty').style.display = 'none';
  document.getElementById('review-panel').style.display = 'flex';
  document.getElementById('pdf-filename').textContent = c.pdf.split('/').pop();

  // Load PDF
  document.getElementById('pdf-iframe').src = c.pdf;

  // Render extracted data
  var extracted = document.getElementById('extracted-data');
  extracted.innerHTML = Object.keys(c.extracted).map(function(section) {
    var data = c.extracted[section];
    var title = section.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
    var rows = Object.keys(data).map(function(key) {
      return '<div class="extracted-row"><span class="extracted-label">' + key + '</span><span class="extracted-value">' + data[key] + '</span></div>';
    }).join('');
    return '<div class="extracted-section"><div class="extracted-section-header">' + title + '</div>' + rows + '</div>';
  }).join('');

  // Reset rules tab
  document.getElementById('rules-result').innerHTML = '<div class="rules-empty" style="padding:40px;height:auto;"><p>Click "Apply NICE Guidelines Rules Engine" to analyse this case against the relevant clinical criteria.</p></div>';

  // Switch to extracted tab
  switchReviewTab('extracted', document.querySelector('.panel-tab'));
}

function switchReviewTab(tab, el) {
  document.querySelectorAll('.panel-tab').forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
  document.querySelectorAll('.review-tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('tab-' + tab).classList.add('active');
}

function applyRulesEngine() {
  var caseId = document.getElementById('review-case-dropdown').value;
  var c = CASES.find(function(x) { return x.id === caseId; });
  if (!c) return;

  var btn = document.getElementById('apply-rules-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="analyzing">Analysing...</span>';

  var result = document.getElementById('rules-result');
  result.innerHTML = '<div style="padding:40px;text-align:center;"><p class="analyzing" style="color:var(--navy);font-weight:500;">Processing clinical data against NICE ' + GUIDELINES[c.guidelineKey].id + ' guidelines...</p></div>';

  // Simulate AI processing delay
  setTimeout(function() {
    var passed = c.ruleResults.filter(function(r) { return r.pass === true; }).length;
    var failed = c.ruleResults.filter(function(r) { return r.pass === false; }).length;
    var advisory = c.ruleResults.filter(function(r) { return r.pass === null; }).length;
    var total = c.ruleResults.length;
    var score = Math.round((passed / (total - advisory)) * 100);
    var scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';

    var checksHtml = c.ruleResults.map(function(r) {
      var iconClass, iconSvg;
      if (r.pass === true) {
        iconClass = 'pass';
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
      } else if (r.pass === false) {
        iconClass = 'fail';
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      } else {
        iconClass = 'warn';
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      }
      return '<div class="rule-check">' +
        '<div class="rule-check-icon ' + iconClass + '">' + iconSvg + '</div>' +
        '<div class="rule-check-content">' +
          '<div class="rule-check-title">[' + r.rule + '] ' + r.name + '</div>' +
          '<div class="rule-check-detail">' + r.detail + '</div>' +
        '</div></div>';
    }).join('');

    var recItems = c.recommendation.items.map(function(i) { return '<li>' + i + '</li>'; }).join('');

    result.innerHTML = '<div class="rules-result-header">' +
      '<div class="rules-result-score ' + scoreClass + '">' + score + '%</div>' +
      '<div class="rules-result-summary">' +
        '<div class="rules-result-title">NICE ' + GUIDELINES[c.guidelineKey].id + ' Compliance Analysis</div>' +
        '<div class="rules-result-subtitle">' + passed + ' passed · ' + failed + ' failed · ' + advisory + ' advisory — ' + total + ' rules evaluated</div>' +
      '</div></div>' +
      checksHtml +
      '<div class="recommendation-box ' + c.recommendation.type + '">' +
        '<h4>' + c.recommendation.title + '</h4>' +
        '<p>' + c.recommendation.text + '</p>' +
        '<ul>' + recItems + '</ul>' +
      '</div>';

    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Re-apply Rules Engine';
  }, 2000);
}

// ===== SPLIT PANEL RESIZE =====
(function() {
  var divider = document.getElementById('review-divider');
  if (!divider) return;
  var isResizing = false;
  divider.addEventListener('mousedown', function() { isResizing = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; });
  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    var panel = document.getElementById('review-panel');
    if (!panel) return;
    var rect = panel.getBoundingClientRect();
    var pct = ((e.clientX - rect.left) / rect.width) * 100;
    pct = Math.max(25, Math.min(75, pct));
    var left = panel.querySelector('.review-left');
    var right = panel.querySelector('.review-right');
    left.style.flex = '0 0 ' + pct + '%';
    right.style.flex = '0 0 ' + (100 - pct) + '%';
  });
  document.addEventListener('mouseup', function() { isResizing = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; });
})();


// ===== LOG FILTER & EXPORT =====
function filterLogs() {
  var month = document.getElementById('log-filter-month') ? document.getElementById('log-filter-month').value : '';
  var year = document.getElementById('log-filter-year') ? document.getElementById('log-filter-year').value : '';
  var tbody = document.getElementById('logs-tbody');
  var empty = document.getElementById('logs-empty');
  if (!tbody) return;
  var filtered = activityLogs.filter(function(log) {
    if (month && log.timestamp.slice(5,7) !== month) return false;
    if (year && log.timestamp.slice(0,4) !== year) return false;
    return true;
  });
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (empty) { empty.style.display = 'flex'; empty.querySelector('p').textContent = 'No logs match the selected filter.'; }
    return;
  }
  if (empty) empty.style.display = 'none';
  tbody.innerHTML = filtered.map(function(log) {
    var typeClass = 'log-type log-type-' + log.type;
    var typeLabel = log.type.replace(/-/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
    return '<tr>' +
      '<td>' + log.timestamp + '</td>' +
      '<td><span class="' + typeClass + '">' + typeLabel + '</span></td>' +
      '<td>' + log.caseId + '</td>' +
      '<td>' + log.user + '</td>' +
      '<td><span class="log-detail">' + log.details + '</span></td>' +
      '</tr>';
  }).join('');
}

function exportLogsPDF() {
  var month = document.getElementById('log-filter-month') ? document.getElementById('log-filter-month').value : '';
  var year = document.getElementById('log-filter-year') ? document.getElementById('log-filter-year').value : '';
  var filtered = activityLogs.filter(function(log) {
    if (month && log.timestamp.slice(5,7) !== month) return false;
    if (year && log.timestamp.slice(0,4) !== year) return false;
    return true;
  });
  var title = 'EzeeHealth 2nd Opinion - Activity Logs';
  if (month || year) title += ' (' + (month ? 'Month: ' + month : '') + (month && year ? ', ' : '') + (year ? 'Year: ' + year : '') + ')';
  var rows = filtered.map(function(log) {
    return '<tr><td style="border:1px solid #ccc;padding:4px;font-size:11px">' + log.timestamp + '</td>' +
      '<td style="border:1px solid #ccc;padding:4px;font-size:11px">' + log.type.replace(/-/g,' ') + '</td>' +
      '<td style="border:1px solid #ccc;padding:4px;font-size:11px">' + log.caseId + '</td>' +
      '<td style="border:1px solid #ccc;padding:4px;font-size:11px">' + log.user + '</td>' +
      '<td style="border:1px solid #ccc;padding:4px;font-size:11px">' + log.details + '</td></tr>';
  }).join('');
  var html = '<html><head><title>' + title + '</title></head><body>' +
    '<h2 style="color:#003366;font-family:sans-serif">' + title + '</h2>' +
    '<p style="font-family:sans-serif;color:#666">Generated: ' + new Date().toISOString().slice(0,19).replace('T',' ') + ' | Total: ' + filtered.length + ' logs</p>' +
    '<table style="border-collapse:collapse;width:100%;font-family:sans-serif">' +
    '<tr style="background:#003366;color:white"><th style="border:1px solid #ccc;padding:6px">Timestamp</th><th style="border:1px solid #ccc;padding:6px">Type</th><th style="border:1px solid #ccc;padding:6px">Case</th><th style="border:1px solid #ccc;padding:6px">User</th><th style="border:1px solid #ccc;padding:6px">Details</th></tr>' +
    rows + '</table></body></html>';
  var w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(function() { w.print(); }, 500);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  // Close sidebar on mobile by default
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.add('collapsed');
  }
});

// ===== SPECIALISTS DATA =====
const SPECIALISTS = [
  { id: 'SP-001', name: 'Dr. Sarah Mitchell', initials: 'SM', specialty: 'Bariatric Surgery', qualifications: 'FRCS, GMC #7234561', experience: '18 years', location: 'London, UK', status: 'available', matchTypes: ['Bariatric Surgery'] },
  { id: 'SP-002', name: 'Dr. James Crawford', initials: 'JC', specialty: 'Ophthalmology', qualifications: 'FRCOphth, GMC #6891234', experience: '22 years', location: 'Manchester, UK', status: 'available', matchTypes: ['Cataract Surgery'] },
  { id: 'SP-003', name: 'Dr. Priya Sharma', initials: 'PS', specialty: 'ENT Surgery', qualifications: 'FRCS (ORL-HNS), GMC #7456123', experience: '15 years', location: 'Birmingham, UK', status: 'available', matchTypes: ['Tonsillectomy'] },
  { id: 'SP-004', name: 'Dr. Andrew Bennett', initials: 'AB', specialty: 'Spinal Surgery', qualifications: 'FRCS (Orth), GMC #6543217', experience: '20 years', location: 'Leeds, UK', status: 'available', matchTypes: ['Spinal Surgery'] },
  { id: 'SP-005', name: 'Dr. Fatima Al-Hassan', initials: 'FA', specialty: 'Interventional Cardiology', qualifications: 'FRCP, GMC #7891234', experience: '16 years', location: 'Edinburgh, UK', status: 'available', matchTypes: ['Elective PCI'] },
  { id: 'SP-006', name: 'Dr. Oliver Whitfield', initials: 'OW', specialty: 'Orthopaedic Surgery', qualifications: 'FRCS (Orth), GMC #7123456', experience: '19 years', location: 'Bristol, UK', status: 'available', matchTypes: ['Hip Replacement', 'Knee Replacement'] },
  { id: 'SP-007', name: 'Dr. Amelia Rhodes', initials: 'AR', specialty: 'General Surgery', qualifications: 'FRCS, GMC #6789012', experience: '14 years', location: 'Liverpool, UK', status: 'available', matchTypes: ['Cholecystectomy', 'Hernia Repair'] },
  { id: 'SP-008', name: 'Dr. Thomas Hargreaves', initials: 'TH', specialty: 'Bariatric Surgery', qualifications: 'FRCS, GMC #7456789', experience: '21 years', location: 'Sheffield, UK', status: 'available', matchTypes: ['Bariatric Surgery'] },
  { id: 'SP-009', name: 'Dr. Natasha Patel', initials: 'NP', specialty: 'Endocrine Surgery', qualifications: 'FRCS, GMC #6234567', experience: '16 years', location: 'Nottingham, UK', status: 'available', matchTypes: ['Thyroid Surgery'] },
  { id: 'SP-010', name: 'Dr. Edward Forsythe', initials: 'EF', specialty: 'Spinal Surgery', qualifications: 'FRCS (Neuro), GMC #7890123', experience: '23 years', location: 'Newcastle, UK', status: 'available', matchTypes: ['Spinal Surgery'] },
  { id: 'SP-011', name: 'Dr. Charlotte Brennan', initials: 'CB', specialty: 'Ophthalmology', qualifications: 'FRCOphth, GMC #6567890', experience: '17 years', location: 'Cardiff, UK', status: 'available', matchTypes: ['Cataract Surgery'] },
  { id: 'SP-012', name: 'Dr. Samuel Okafor', initials: 'SO', specialty: 'Cardiothoracic Surgery', qualifications: 'FRCS (CTh), GMC #7234890', experience: '20 years', location: 'Glasgow, UK', status: 'available', matchTypes: ['Elective PCI'] },
  { id: 'SP-013', name: 'Dr. Helena Vasquez', initials: 'HV', specialty: 'ENT Surgery', qualifications: 'FRCS (ORL), GMC #6901234', experience: '13 years', location: 'Southampton, UK', status: 'available', matchTypes: ['Tonsillectomy'] },
  { id: 'SP-014', name: 'Dr. Marcus Lindqvist', initials: 'ML', specialty: 'Orthopaedic Surgery', qualifications: 'FRCS (Orth), GMC #7678901', experience: '18 years', location: 'Cambridge, UK', status: 'available', matchTypes: ['Hip Replacement', 'Knee Replacement'] },
  { id: 'SP-015', name: 'Dr. Isabelle Monet', initials: 'IM', specialty: 'Bariatric Surgery', qualifications: 'FRCS, GMC #6345678', experience: '15 years', location: 'Oxford, UK', status: 'available', matchTypes: ['Bariatric Surgery'] },
  { id: 'SP-016', name: 'Dr. Alistair Drummond', initials: 'AD', specialty: 'Vascular Surgery', qualifications: 'FRCS (Vasc), GMC #7012345', experience: '24 years', location: 'Edinburgh, UK', status: 'available', matchTypes: ['Hernia Repair'] },
  { id: 'SP-017', name: 'Dr. Sophia Karimian', initials: 'SK', specialty: 'Interventional Cardiology', qualifications: 'FRCP, GMC #6789456', experience: '12 years', location: 'London, UK', status: 'available', matchTypes: ['Elective PCI'] },
  { id: 'SP-018', name: 'Dr. Rupert Ashworth', initials: 'RA', specialty: 'Spinal Surgery', qualifications: 'FRCS (Orth), GMC #7456012', experience: '22 years', location: 'Leeds, UK', status: 'available', matchTypes: ['Spinal Surgery'] },
  { id: 'SP-019', name: 'Dr. Mei-Ling Chen', initials: 'MC', specialty: 'Ophthalmology', qualifications: 'FRCOphth, GMC #6123789', experience: '11 years', location: 'Manchester, UK', status: 'available', matchTypes: ['Cataract Surgery'] },
  { id: 'SP-020', name: 'Dr. Benjamin Osei', initials: 'BO', specialty: 'General Surgery', qualifications: 'FRCS, GMC #7890456', experience: '16 years', location: 'Birmingham, UK', status: 'available', matchTypes: ['Cholecystectomy', 'Hernia Repair'] },
  { id: 'SP-021', name: 'Dr. Francesca Moretti', initials: 'FM', specialty: 'ENT Surgery', qualifications: 'FRCS (ORL), GMC #6567123', experience: '14 years', location: 'Bristol, UK', status: 'available', matchTypes: ['Tonsillectomy'] },
  { id: 'SP-022', name: 'Dr. Jonathan Blackwell', initials: 'JB', specialty: 'Bariatric Surgery', qualifications: 'FRCS, GMC #7234567', experience: '19 years', location: 'Liverpool, UK', status: 'available', matchTypes: ['Bariatric Surgery'] },
  { id: 'SP-023', name: 'Dr. Ayesha Noor', initials: 'AN', specialty: 'Endocrine Surgery', qualifications: 'FRCS, GMC #6901567', experience: '13 years', location: 'Sheffield, UK', status: 'available', matchTypes: ['Thyroid Surgery'] },
  { id: 'SP-024', name: 'Dr. Patrick O Sullivan', initials: 'PO', specialty: 'Orthopaedic Surgery', qualifications: 'FRCS (Orth), GMC #7678234', experience: '17 years', location: 'Nottingham, UK', status: 'available', matchTypes: ['Hip Replacement', 'Knee Replacement'] },
  { id: 'SP-025', name: 'Dr. Diana Kowalski', initials: 'DK', specialty: 'Cardiothoracic Surgery', qualifications: 'FRCS (CTh), GMC #6345901', experience: '20 years', location: 'Newcastle, UK', status: 'available', matchTypes: ['Elective PCI'] },
  { id: 'SP-026', name: 'Dr. Lawrence Mensah', initials: 'LM', specialty: 'Spinal Surgery', qualifications: 'FRCS (Neuro), GMC #7012678', experience: '18 years', location: 'Cardiff, UK', status: 'available', matchTypes: ['Spinal Surgery'] },
  { id: 'SP-027', name: 'Dr. Ingrid Svensson', initials: 'IS', specialty: 'Ophthalmology', qualifications: 'FRCOphth, GMC #6789234', experience: '15 years', location: 'Glasgow, UK', status: 'available', matchTypes: ['Cataract Surgery'] },
  { id: 'SP-028', name: 'Dr. Callum Fraser', initials: 'CF', specialty: 'General Surgery', qualifications: 'FRCS, GMC #7456345', experience: '21 years', location: 'Southampton, UK', status: 'available', matchTypes: ['Cholecystectomy', 'Hernia Repair'] },
  { id: 'SP-029', name: 'Dr. Zara Hutchinson', initials: 'ZH', specialty: 'ENT Surgery', qualifications: 'FRCS (ORL), GMC #6123456', experience: '10 years', location: 'Cambridge, UK', status: 'available', matchTypes: ['Tonsillectomy'] },
  { id: 'SP-030', name: 'Dr. Victor Adeyemi', initials: 'VA', specialty: 'Interventional Cardiology', qualifications: 'FRCP, GMC #7890789', experience: '25 years', location: 'Oxford, UK', status: 'available', matchTypes: ['Elective PCI'] }

];

let assignments = {};
let opinions = {};
let activityLogs = [
  { timestamp: '2026-03-13 13:29:00', type: 'ai-review', caseId: 'ICR-2026-007', user: 'AI Engine', details: 'AI rules engine analysis: 6/7 rules passed' },
  { timestamp: '2025-09-04 13:06:00', type: 'ai-review', caseId: 'ICR-2026-002', user: 'AI Engine', details: 'AI rules engine analysis: 6/7 rules passed' },
  { timestamp: '2025-08-02 12:09:00', type: 'opinion-submission', caseId: 'ICR-2026-004', user: 'Dr. Sarah Mitchell', details: 'System notification: Case status updated to Reviewed' },
  { timestamp: '2026-03-02 18:09:00', type: 'assignment', caseId: 'ICR-2026-010', user: 'Dr. Priya Sharma', details: 'System notification: Case status updated to Reviewed' },
  { timestamp: '2026-03-06 08:27:00', type: 'consultant-report', caseId: 'ICR-2026-007', user: 'Dr. Fatima Al-Hassan', details: 'Consultant report submitted: Recommend Approval' },
  { timestamp: '2025-11-03 14:07:00', type: 'opinion-submission', caseId: 'ICR-2026-001', user: 'Dr. Priya Sharma', details: 'New consultant report available for admin review' },
  { timestamp: '2025-08-24 15:05:00', type: 'assignment', caseId: 'ICR-2026-001', user: 'Dr. Fatima Al-Hassan', details: 'New consultant report available for admin review' },
  { timestamp: '2026-02-07 15:17:00', type: 'ai-review', caseId: 'ICR-2026-010', user: 'AI Engine', details: 'AI rules engine analysis: 6/7 rules passed' },
  { timestamp: '2025-12-04 17:17:00', type: 'ai-review', caseId: 'ICR-2026-007', user: 'AI Engine', details: 'AI review completed: 92% NICE compliance' },
  { timestamp: '2026-02-19 15:29:00', type: 'ai-review', caseId: 'ICR-2026-003', user: 'AI Engine', details: 'AI review flagged: Missing pre-operative investigations' },
  { timestamp: '2025-05-15 17:51:00', type: 'opinion-submission', caseId: 'ICR-2026-005', user: 'Dr. Fatima Al-Hassan', details: 'Case reassigned due to consultant availability' },
  { timestamp: '2025-07-06 16:46:00', type: 'ai-review', caseId: 'ICR-2026-005', user: 'AI Engine', details: 'AI review completed: 92% NICE compliance' },
  { timestamp: '2025-04-06 12:58:00', type: 'consultant-report', caseId: 'ICR-2026-004', user: 'Dr. Natasha Patel', details: 'Consultant report submitted: Recommend Approval' },
  { timestamp: '2025-08-20 15:50:00', type: 'consultant-report', caseId: 'ICR-2026-006', user: 'Dr. Charlotte Brennan', details: 'Consultant report submitted: Approve with conditions' },
  { timestamp: '2025-12-21 12:04:00', type: 'admin-notification', caseId: 'ICR-2026-009', user: 'Dr. James Crawford', details: 'Case assigned to consultant for review' },
  { timestamp: '2025-11-25 10:33:00', type: 'ai-review', caseId: 'ICR-2026-003', user: 'AI Engine', details: 'AI review completed: 85% NICE compliance' },
  { timestamp: '2025-10-25 10:15:00', type: 'admin-notification', caseId: 'ICR-2026-004', user: 'Dr. Priya Sharma', details: 'Case reassigned due to consultant availability' },
  { timestamp: '2025-06-25 12:41:00', type: 'consultant-report', caseId: 'ICR-2026-005', user: 'Dr. Andrew Bennett', details: 'Consultant report submitted: Approve - all NICE criteria satisfied' },
  { timestamp: '2025-09-27 18:02:00', type: 'ai-review', caseId: 'ICR-2026-007', user: 'AI Engine', details: 'AI review completed: 95% compliance - minor documentation gap' },
  { timestamp: '2025-09-22 13:30:00', type: 'consultant-report', caseId: 'ICR-2026-003', user: 'Dr. Samuel Okafor', details: 'Consultant report: MDT confirmation received, approve' },
  { timestamp: '2025-11-19 09:58:00', type: 'consultant-report', caseId: 'ICR-2026-002', user: 'Dr. Edward Forsythe', details: 'Consultant report submitted: Request additional imaging' },
  { timestamp: '2026-01-20 11:49:00', type: 'ai-review', caseId: 'ICR-2026-008', user: 'AI Engine', details: 'AI review completed: 85% NICE compliance' },
  { timestamp: '2026-01-11 11:32:00', type: 'ai-review', caseId: 'ICR-2026-008', user: 'AI Engine', details: 'AI review completed: 92% NICE compliance' },
  { timestamp: '2026-02-01 13:04:00', type: 'consultant-report', caseId: 'ICR-2026-004', user: 'Dr. James Crawford', details: 'Consultant report: MDT confirmation received, approve' },
  { timestamp: '2025-10-06 13:37:00', type: 'admin-notification', caseId: 'ICR-2026-009', user: 'Dr. Admin', details: 'Case assigned to consultant for review' },
  { timestamp: '2025-10-07 12:53:00', type: 'ai-review', caseId: 'ICR-2026-005', user: 'AI Engine', details: 'AI review flagged: Conservative management duration insufficient' },
  { timestamp: '2025-08-24 09:08:00', type: 'assignment', caseId: 'ICR-2026-001', user: 'Dr. James Crawford', details: 'Case assigned to consultant for review' },
  { timestamp: '2026-02-09 14:56:00', type: 'ai-review', caseId: 'ICR-2026-009', user: 'AI Engine', details: 'AI review completed: 95% compliance - minor documentation gap' },
  { timestamp: '2025-07-07 18:27:00', type: 'ai-review', caseId: 'ICR-2026-003', user: 'AI Engine', details: 'AI review completed: 85% NICE compliance' },
  { timestamp: '2026-02-24 18:03:00', type: 'consultant-report', caseId: 'ICR-2026-008', user: 'Dr. Edward Forsythe', details: 'Consultant report submitted: Deny - criteria not met' },
  { timestamp: '2025-04-10 12:45:00', type: 'consultant-report', caseId: 'ICR-2026-006', user: 'Dr. Andrew Bennett', details: 'Consultant report: MDT confirmation received, approve' },
  { timestamp: '2025-12-04 14:06:00', type: 'opinion-submission', caseId: 'ICR-2026-007', user: 'Dr. Sarah Mitchell', details: 'System notification: Case status updated to Reviewed' },
  { timestamp: '2025-08-02 17:22:00', type: 'consultant-report', caseId: 'ICR-2026-008', user: 'Dr. James Crawford', details: 'Consultant report submitted: Approve with conditions' },
  { timestamp: '2025-08-18 11:38:00', type: 'consultant-report', caseId: 'ICR-2026-007', user: 'Dr. Andrew Bennett', details: 'Consultant report submitted: Approve - all NICE criteria satisfied' },
  { timestamp: '2025-12-19 17:35:00', type: 'consultant-report', caseId: 'ICR-2026-006', user: 'Dr. Thomas Hargreaves', details: 'Consultant report submitted: Request More Information' },
  { timestamp: '2025-09-07 18:54:00', type: 'consultant-report', caseId: 'ICR-2026-003', user: 'Dr. Samuel Okafor', details: 'Consultant report submitted: Deny - criteria not met' },
  { timestamp: '2026-01-27 17:48:00', type: 'opinion-submission', caseId: 'ICR-2026-006', user: 'Dr. Admin', details: 'New consultant report available for admin review' },
  { timestamp: '2025-06-03 13:05:00', type: 'consultant-report', caseId: 'ICR-2026-002', user: 'Dr. Thomas Hargreaves', details: 'Consultant report: MDT confirmation received, approve' },
  { timestamp: '2025-10-08 10:44:00', type: 'ai-review', caseId: 'ICR-2026-002', user: 'AI Engine', details: 'AI review flagged: Missing pre-operative investigations' },
  { timestamp: '2026-01-22 17:16:00', type: 'ai-review', caseId: 'ICR-2026-006', user: 'AI Engine', details: 'AI review completed: Fast-track pathway triggered' },
  { timestamp: '2026-03-24 14:14:00', type: 'admin-notification', caseId: 'ICR-2026-005', user: 'Dr. Sarah Mitchell', details: 'Case assigned to consultant for review' },
  { timestamp: '2026-02-17 18:19:00', type: 'admin-notification', caseId: 'ICR-2026-001', user: 'Dr. James Crawford', details: 'System notification: Case status updated to Reviewed' },
  { timestamp: '2026-02-17 17:17:00', type: 'ai-review', caseId: 'ICR-2026-010', user: 'AI Engine', details: 'AI review completed: 85% NICE compliance' },
  { timestamp: '2026-03-04 09:02:00', type: 'ai-review', caseId: 'ICR-2026-002', user: 'AI Engine', details: 'AI review completed: All mandatory criteria met' },
  { timestamp: '2026-02-17 11:12:00', type: 'consultant-report', caseId: 'ICR-2026-004', user: 'Dr. Priya Sharma', details: 'Consultant report: MDT confirmation received, approve' },
  { timestamp: '2026-03-25 08:43:00', type: 'admin-notification', caseId: 'ICR-2026-004', user: 'Dr. Sarah Mitchell', details: 'Opinion submitted: Approve' },
  { timestamp: '2026-02-02 10:25:00', type: 'consultant-report', caseId: 'ICR-2026-001', user: 'Dr. Amelia Rhodes', details: 'Consultant report submitted: Request additional imaging' },
  { timestamp: '2026-02-20 09:50:00', type: 'assignment', caseId: 'ICR-2026-003', user: 'System', details: 'Case reassigned due to consultant availability' },
  { timestamp: '2026-01-14 16:06:00', type: 'ai-review', caseId: 'ICR-2026-004', user: 'AI Engine', details: 'AI review flagged: Missing pre-operative investigations' },
  { timestamp: '2026-01-21 11:20:00', type: 'consultant-report', caseId: 'ICR-2026-008', user: 'Dr. Priya Sharma', details: 'Consultant report submitted: Approve with conditions' }
];

// ===== RENDER SPECIALISTS =====
function renderConsultants() {
  var grid = document.getElementById('consultants-grid');
  if (!grid) return;
  grid.innerHTML = SPECIALISTS.map(function(s) {
    var assignedCases = Object.keys(assignments).filter(function(k) { return assignments[k] === s.id; });
    return '<div class="consultant-card">' +
      '<div class="consultant-card-header">' +
      '<div class="consultant-avatar">' + s.initials + '</div>' +
      '<div><div class="consultant-option-name">' + s.name + '</div>' +
      '<div class="consultant-option-detail">' + s.specialty + '</div></div>' +
      '<span class="consultant-status available">Available</span></div>' +
      '<div class="consultant-detail-row"><span>Qualifications</span><span>' + s.qualifications + '</span></div>' +
      '<div class="consultant-detail-row"><span>Experience</span><span>' + s.experience + '</span></div>' +
      '<div class="consultant-detail-row"><span>Location</span><span>' + s.location + '</span></div>' +
      '<div class="consultant-detail-row"><span>Assigned Cases</span><span>' + assignedCases.length + '</span></div>' +
      '</div>';
  }).join('');
}

// ===== ASSIGNMENT MODAL =====
var pendingAssignCaseId = null;
var selectedConsultantId = null;

function openAssignModal(caseId) {
  pendingAssignCaseId = caseId;
  selectedConsultantId = null;
  document.getElementById('assign-case-id').textContent = caseId;
  document.getElementById('confirm-assign-btn').disabled = true;
  var c = CASES.find(function(x) { return x.id === caseId; });
  var list = document.getElementById('consultant-select-list');
  list.innerHTML = SPECIALISTS.map(function(s) {
    var isMatch = s.matchTypes.indexOf(c.type) >= 0;
    var cls = 'consultant-option' + (isMatch ? ' recommended' : '');
    return '<label class="' + cls + '">' +
      '<input type="radio" name="consultant-select" value="' + s.id + '" onchange="selectConsultant(this.value)">' +
      '<div class="consultant-avatar">' + s.initials + '</div>' +
      '<div><div class="consultant-option-name">' + s.name + (isMatch ? ' <span class="match-badge">Best Match</span>' : '') + '</div>' +
      '<div class="consultant-option-detail">' + s.specialty + ' &middot; ' + s.experience + '</div></div></label>';
  }).join('');
  var modal = document.getElementById('assign-modal');
  modal.style.display = 'flex';
  setTimeout(function() { modal.classList.add('visible'); }, 10);
}

function selectConsultant(id) {
  selectedConsultantId = id;
  document.getElementById('confirm-assign-btn').disabled = false;
}

function confirmAssignment() {
  if (!pendingAssignCaseId || !selectedConsultantId) return;
  assignments[pendingAssignCaseId] = selectedConsultantId;
  var consultant = SPECIALISTS.find(function(s) { return s.id === selectedConsultantId; });
  addLog('assignment', pendingAssignCaseId, currentUser ? currentUser.name : 'Admin', 'Assigned to ' + consultant.name + ' (' + consultant.specialty + ')');
  closeAssignModal();
  renderCases();
  renderConsultants();
  renderLogs();
}

function closeAssignModal(e) {
  if (e && e.target !== e.currentTarget) return;
  var modal = document.getElementById('assign-modal');
  modal.classList.remove('visible');
  setTimeout(function() { modal.style.display = 'none'; }, 300);
}

// ===== OPINION MODAL =====
var currentOpinionCaseId = null;

function openOpinionModal(caseId) {
  currentOpinionCaseId = caseId;
  var c = CASES.find(function(x) { return x.id === caseId; });
  var specId = assignments[caseId];
  var spec = SPECIALISTS.find(function(s) { return s.id === specId; });
  document.getElementById('opinion-case-id').textContent = caseId;
  document.getElementById('opinion-consultant-name').textContent = spec ? spec.name : '';
  document.getElementById('opinion-assessment').value = '';
  document.getElementById('opinion-recommendation').value = '';
  document.getElementById('opinion-notes').value = '';
  var details = document.getElementById('opinion-case-details');
  details.innerHTML = '<h4>' + c.patient + ' &mdash; ' + c.procedure + '</h4>' +
    '<p><strong>Facility:</strong> ' + c.facility + '</p>' +
    '<p><strong>Date:</strong> ' + c.date + '</p>' +
    '<p><strong>ICD-10:</strong> ' + c.icd10 + '</p>';
  var modal = document.getElementById('opinion-modal');
  modal.style.display = 'flex';
  setTimeout(function() { modal.classList.add('visible'); }, 10);
}

function switchOpinionTab(tab, el) {
  document.querySelectorAll('.consultant-tab').forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
  document.querySelectorAll('.consultant-tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('opinion-tab-' + tab).classList.add('active');
}

function submitOpinion(e) {
  e.preventDefault();
  var assessment = document.getElementById('opinion-assessment').value;
  var recommendation = document.getElementById('opinion-recommendation').value;
  var notes = document.getElementById('opinion-notes').value;
  opinions[currentOpinionCaseId] = { assessment: assessment, recommendation: recommendation, notes: notes, date: new Date().toISOString().slice(0,10) };
  var c = CASES.find(function(x) { return x.id === currentOpinionCaseId; });
  if (c) c.status = 'reviewed';
  var specId = assignments[currentOpinionCaseId];
  var spec = SPECIALISTS.find(function(s) { return s.id === specId; });
  addLog('opinion-submission', currentOpinionCaseId, spec ? spec.name : 'Consultant', 'Opinion submitted: ' + recommendation);
  addLog('admin-notification', currentOpinionCaseId, 'System', 'New opinion available for review');
  closeOpinionModal();
  renderCases();
  renderLogs();
}

function closeOpinionModal(e) {
  if (e && e.target !== e.currentTarget) return;
  var modal = document.getElementById('opinion-modal');
  modal.classList.remove('visible');
  setTimeout(function() { modal.style.display = 'none'; }, 300);
}

// ===== ACTIVITY LOGS =====
function addLog(type, caseId, user, details) {
  activityLogs.unshift({
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    type: type,
    caseId: caseId,
    user: user,
    details: details
  });
}

function renderLogs() {
  var tbody = document.getElementById('logs-tbody');
  var empty = document.getElementById('logs-empty');
  if (!tbody) return;
  activityLogs.sort(function(a,b) { return b.timestamp.localeCompare(a.timestamp); });
  if (activityLogs.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';
  tbody.innerHTML = activityLogs.map(function(log) {
    var typeClass = 'log-type log-type-' + log.type;
    var typeLabel = log.type.replace(/-/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
    return '<tr><td>' + log.timestamp + '</td>' +
      '<td><span class="' + typeClass + '">' + typeLabel + '</span></td>' +
      '<td>' + log.caseId + '</td>' +
      '<td>' + log.user + '</td>' +
      '<td><span class="log-details">' + log.details + '</span></td></tr>';
  }).join('');
}

// ===== REPORT GENERATION =====
function openReport(caseId) {
  var c = CASES.find(function(x) { return x.id === caseId; });
  if (!c) return;
  var specId = assignments[caseId];
  var spec = SPECIALISTS.find(function(s) { return s.id === specId; });
  var op = opinions[caseId];
  var content = document.getElementById('report-content');
  content.innerHTML = '<div class="report-header">' +
    '<h3>Independent Clinical Review Report</h3>' +
    '<p><strong>Case:</strong> ' + c.id + ' | <strong>Date:</strong> ' + c.date + '</p>' +
    '<p><strong>Patient:</strong> ' + c.patient + ' | <strong>Procedure:</strong> ' + c.procedure + '</p>' +
    '<p><strong>Facility:</strong> ' + c.facility + '</p>' +
    (spec ? '<p><strong>Reviewing Consultant:</strong> ' + spec.name + ' (' + spec.specialty + ')</p>' : '') +
    '</div>' +
    (op ? '<div class="report-opinion"><h4>Consultant Opinion</h4>' +
    '<p><strong>Recommendation:</strong> ' + op.recommendation + '</p>' +
    '<p><strong>Assessment:</strong> ' + op.assessment + '</p>' +
    (op.notes ? '<p><strong>Notes:</strong> ' + op.notes + '</p>' : '') +
    '<p class="opinion-submitted-note">Submitted: ' + op.date + '</p></div>' : '<p><em>No opinion submitted yet.</em></p>') +
    '<div class="report-rules"><h4>NICE Guidelines Compliance</h4>' +
    c.ruleResults.map(function(r) {
      var icon = r.pass === true ? '&#10003;' : r.pass === false ? '&#10007;' : '&#9888;';
      return '<p>' + icon + ' <strong>' + r.rule + '</strong> ' + r.name + ': ' + r.detail.slice(0, 100) + '...</p>';
    }).join('') + '</div>';
  var modal = document.getElementById('report-modal');
  modal.style.display = 'flex';
  setTimeout(function() { modal.classList.add('visible'); }, 10);
}

function closeReportModal(e) {
  if (e && e.target !== e.currentTarget) return;
  var modal = document.getElementById('report-modal');
  modal.classList.remove('visible');
  setTimeout(function() { modal.style.display = 'none'; }, 300);
}

function printReport() {
  window.print();
}

// ===== OVERRIDE: renderCases with Assign/Report/Opinion buttons =====
// This replaces the original renderCases to add the new Actions column
var _originalShowApp = showApp;
showApp = function() {
  _originalShowApp();
  renderConsultants();
  renderLogs();
};

var _origRenderCases = renderCases;
renderCases = function() {
  var tbody = document.getElementById('cases-tbody');
  var search = (document.getElementById('case-search').value || '').toLowerCase();
  var filtered = CASES.filter(function(c) {
    var matchType = currentFilter === 'all' || c.type.toLowerCase().includes(currentFilter.toLowerCase());
    var matchSearch = !search || c.patient.toLowerCase().includes(search) || c.id.toLowerCase().includes(search) || c.procedure.toLowerCase().includes(search);
    return matchType && matchSearch;
  });
  tbody.innerHTML = filtered.map(function(c) {
    var statusClass = c.status === 'reviewed' ? 'status-reviewed' : c.status === 'uploaded' ? 'status-uploaded' : 'status-pending';
    var statusLabel = c.status.charAt(0).toUpperCase() + c.status.slice(1);
    var specId = assignments[c.id];
    var spec = specId ? SPECIALISTS.find(function(s) { return s.id === specId; }) : null;
    var assignBtn = spec ?
      '<span class="assigned-label">' + spec.initials + '</span>' :
      '<button class="btn-assign" onclick="openAssignModal(\'' + c.id + '\')">Assign</button>';
    var opinionBtn = spec ?
      '<button class="btn-assign" onclick="openOpinionModal(\'' + c.id + '\')">Opinion</button>' : '';
    var reportBtn = '<button class="btn-report" onclick="openReport(\'' + c.id + '\')">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Consultant Report</button>';
    return '<tr>' +
      '<td>' + c.id + '</td>' +
      '<td><div class="patient-info"><strong>' + c.patient + '</strong><small>' + c.intro + '</small></div></td>' +
      '<td>' + c.procedure + '</td>' +
      '<td>' + c.facility + '</td>' +
      '<td><span class="status-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
      '<td>' + c.date + '</td>' +
      '<td><div class="case-actions-cell">' + assignBtn + opinionBtn + reportBtn +
      '<button class="btn-assign" onclick="openCaseReview(\'' + c.id + '\')"> AI Review</button></div></td></tr>';
  }).join('');
};
