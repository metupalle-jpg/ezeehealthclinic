const express = require('express');
const cors = require('cors');
const multer = require('multer');
const {Storage} = require('@google-cloud/storage');
const {DocumentProcessorServiceClient} = require('@google-cloud/documentai');

const app = express();
app.use(cors({origin: '*'}));
app.use(express.json());

const storage = new Storage();
const BUCKET = process.env.GCS_BUCKET || 'ezeehealthcare-2ndopinion-uploads';
const PROJECT_ID = process.env.GCP_PROJECT || 'ezeehealthclinic';
const LOCATION = process.env.DOCAI_LOCATION || 'us';
const PROCESSOR_ID = process.env.DOCAI_PROCESSOR || '';

const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: 50 * 1024 * 1024}});

// Health check
app.get('/', (req, res) => res.json({status: 'ok', service: '2ndopinion-api'}));

// Upload file to GCS
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({error: 'No file provided'});
    const caseId = req.body.caseId || 'unknown';
    const category = req.body.category || 'uncategorized';
    const filename = caseId + '/' + category + '/' + Date.now() + '-' + req.file.originalname;
    const bucket = storage.bucket(BUCKET);
    const blob = bucket.file(filename);
    await blob.save(req.file.buffer, {contentType: req.file.mimetype, metadata: {caseId: caseId, category: category, originalName: req.file.originalname}});
    res.json({success: true, filename: filename, url: 'gs://' + BUCKET + '/' + filename, size: req.file.size});
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({error: 'Upload failed', details: err.message});
  }
});

// OCR via Document AI
app.post('/ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({error: 'No file provided'});
    if (!PROCESSOR_ID) return res.status(500).json({error: 'Document AI processor not configured'});
    const client = new DocumentProcessorServiceClient();
    const name = 'projects/' + PROJECT_ID + '/locations/' + LOCATION + '/processors/' + PROCESSOR_ID;
    const request = {name: name, rawDocument: {content: req.file.buffer.toString('base64'), mimeType: req.file.mimetype}};
    const [result] = await client.processDocument(request);
    const doc = result.document;
    const text = doc.text || '';
    const pages = (doc.pages || []).map(function(p) { return {pageNumber: p.pageNumber, width: p.dimension ? p.dimension.width : 0, height: p.dimension ? p.dimension.height : 0, blocks: (p.blocks || []).length}; });
    const entities = (doc.entities || []).map(function(e) { return {type: e.type, mentionText: e.mentionText, confidence: e.confidence}; });
    res.json({success: true, text: text, pages: pages, entities: entities});
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({error: 'OCR failed', details: err.message});
  }
});

// Upload + OCR combined
app.post('/upload-and-ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({error: 'No file provided'});
    const caseId = req.body.caseId || 'unknown';
    const category = req.body.category || 'uncategorized';
    const filename = caseId + '/' + category + '/' + Date.now() + '-' + req.file.originalname;
    // Upload to GCS
    const bucket = storage.bucket(BUCKET);
    const blob = bucket.file(filename);
    await blob.save(req.file.buffer, {contentType: req.file.mimetype});
    // OCR if processor configured
    var ocrResult = null;
    if (PROCESSOR_ID) {
      const client = new DocumentProcessorServiceClient();
      const name = 'projects/' + PROJECT_ID + '/locations/' + LOCATION + '/processors/' + PROCESSOR_ID;
      const [result] = await client.processDocument({name: name, rawDocument: {content: req.file.buffer.toString('base64'), mimeType: req.file.mimetype}});
      ocrResult = {text: result.document.text || '', entities: (result.document.entities || []).map(function(e) { return {type: e.type, mentionText: e.mentionText, confidence: e.confidence}; })};
    }
    res.json({success: true, filename: filename, url: 'gs://' + BUCKET + '/' + filename, size: req.file.size, ocr: ocrResult});
  } catch (err) {
    console.error('Upload+OCR error:', err);
    res.status(500).json({error: 'Upload+OCR failed', details: err.message});
  }
});

// Get signed URL for direct upload
app.post('/signed-url', async (req, res) => {
  try {
    var caseId = req.body.caseId || 'unknown';
    var fname = req.body.filename || 'document.pdf';
    var contentType = req.body.contentType || 'application/pdf';
    var dest = caseId + '/' + Date.now() + '-' + fname;
    var [url] = await storage.bucket(BUCKET).file(dest).getSignedUrl({version: 'v4', action: 'write', expires: Date.now() + 15 * 60 * 1000, contentType: contentType});
    res.json({success: true, signedUrl: url, filename: dest});
  } catch (err) {
    res.status(500).json({error: 'Failed to generate signed URL', details: err.message});
  }
});

function getRequiredFields(procedureType) {
  var common = [
    {path: 'patientInfo.name', label: 'Patient Name', importance: 'critical'},
    {path: 'patientInfo.age', label: 'Patient Age', importance: 'critical'},
    {path: 'patientInfo.gender', label: 'Patient Gender', importance: 'high'},
    {path: 'diagnosis', label: 'Diagnosis', importance: 'critical'},
    {path: 'procedure', label: 'Procedure Description', importance: 'critical'},
    {path: 'clinicalNotes', label: 'Clinical Notes/History', importance: 'high'}
  ];
  var specific = {
    bariatric: [
      {path: 'patientInfo.bmi', label: 'BMI', importance: 'critical'},
      {path: 'patientInfo.weight', label: 'Weight', importance: 'critical'},
      {path: 'medications', label: 'Medications', importance: 'high'}
    ],
    cataract: [
      {path: 'labResults', label: 'Visual Acuity Results', importance: 'critical'}
    ],
    tonsillectomy: [
      {path: 'clinicalNotes', label: 'Episode History', importance: 'critical'}
    ],
    spinal: [
      {path: 'labResults', label: 'Imaging Results', importance: 'critical'},
      {path: 'medications', label: 'Conservative Treatment History', importance: 'high'}
    ]
  };
  var type = procedureType.toLowerCase();
  return common.concat(specific[type] || []);
}

const PORT = process.env.PORT || 8080;

// Fragment OCR text into structured clinical sections
function fragmentText(text, procedureType) {
  if (!text) return {};
  var sections = {
    demographics: '',
    diagnosis: '',
    clinicalNotes: '',
    investigations: '',
    labResults: '',
    imaging: '',
    medications: '',
    treatmentHistory: '',
    patientInfo: { age: '', gender: '', height: '', weight: '', bmi: '', occupation: '' },
    surgicalIndication: '',
    comorbidities: '',
    allergies: '',
    referralInfo: ''
  };

  var lower = text.toLowerCase();
  var paragraphs = text.split(/\n\n+/);

  paragraphs.forEach(function(para) {
    var p = para.toLowerCase();
    if (/\b(age|year.?old|gender|male|female|height|weight|bmi|occupation)\b/.test(p)) {
      sections.demographics += para + '\n';
      // Extract specific patient info
      var ageMatch = para.match(/(\d+)\s*(?:year|yr|y\.?o)/i);
      if (ageMatch) sections.patientInfo.age = ageMatch[1];
      if (/\bmale\b/i.test(para)) sections.patientInfo.gender = 'Male';
      if (/\bfemale\b/i.test(para)) sections.patientInfo.gender = 'Female';
      var htMatch = para.match(/(\d+\.?\d*)\s*(?:cm|m)\b/i);
      if (htMatch) sections.patientInfo.height = htMatch[0];
      var wtMatch = para.match(/(\d+\.?\d*)\s*kg/i);
      if (wtMatch) sections.patientInfo.weight = wtMatch[0];
      var bmiMatch = para.match(/bmi\s*:?\s*(\d+\.?\d*)/i);
      if (bmiMatch) sections.patientInfo.bmi = bmiMatch[1];
    }
    if (/\b(diagnos|impression|assessment|finding)/.test(p)) {
      sections.diagnosis += para + '\n';
    }
    if (/\b(clinical|history|present|complaint|symptom|pain|discomfort)/.test(p)) {
      sections.clinicalNotes += para + '\n';
    }
    if (/\b(investig|test|exam|scope|endoscop|biopsy|patholog)/.test(p)) {
      sections.investigations += para + '\n';
    }
    if (/\b(lab|blood|haemoglobin|hb|wbc|platelet|creatinine|eGFR|hba1c|cholesterol)/.test(p)) {
      sections.labResults += para + '\n';
    }
    if (/\b(mri|ct\s|x.?ray|ultrasound|scan|imaging|radiolog|echocardiog)/.test(p)) {
      sections.imaging += para + '\n';
    }
    if (/\b(medic|drug|prescri|dose|tablet|mg|injection|infusion)/.test(p)) {
      sections.medications += para + '\n';
    }
    if (/\b(treat|therap|conserv|physio|rehab|surgery|operat|procedure)/.test(p)) {
      sections.treatmentHistory += para + '\n';
    }
    if (/\b(indicat|reason.*surgery|surgical.*plan|recommend.*surgery)/.test(p)) {
      sections.surgicalIndication += para + '\n';
    }
    if (/\b(comorbid|diabet|hypertens|asthma|copd|cardiac|renal|hepat)/.test(p)) {
      sections.comorbidities += para + '\n';
    }
    if (/\b(allerg|adverse|reaction|intoleran)/.test(p)) {
      sections.allergies += para + '\n';
    }
    if (/\b(refer|gp|general practition|consultant.*letter)/.test(p)) {
      sections.referralInfo += para + '\n';
    }
  });

  // Trim all values
  Object.keys(sections).forEach(function(key) {
    if (typeof sections[key] === 'string') sections[key] = sections[key].trim();
  });
  return sections;
}

// Check sufficiency against NICE guidelines
function checkSufficiency(sections, procedureType) {
  var required = getRequiredFields(procedureType);
  var common = [
    {path: 'demographics', label: 'Patient Demographics', importance: 'critical'},
    {path: 'diagnosis', label: 'Primary Diagnosis', importance: 'critical'},
    {path: 'clinicalNotes', label: 'Clinical History', importance: 'critical'},
    {path: 'investigations', label: 'Investigations', importance: 'high'},
    {path: 'imaging', label: 'Imaging Reports', importance: 'high'},
    {path: 'medications', label: 'Current Medications', importance: 'high'},
    {path: 'treatmentHistory', label: 'Treatment History', importance: 'high'},
    {path: 'surgicalIndication', label: 'Surgical Indication', importance: 'critical'},
    {path: 'comorbidities', label: 'Comorbidities', importance: 'high'},
    {path: 'referralInfo', label: 'Referral Information', importance: 'medium'}
  ];

  var allRequired = common.concat(required);
  var missing = [];
  var present = [];
  var score = 0;
  var total = allRequired.length;

  allRequired.forEach(function(req) {
    var value = sections[req.path];
    if (req.path.indexOf('.') > -1) {
      var parts = req.path.split('.');
      value = sections[parts[0]] ? sections[parts[0]][parts[1]] : '';
    }
    if (value && value.trim && value.trim().length > 10) {
      present.push({label: req.label, importance: req.importance, status: 'present'});
      score += (req.importance === 'critical' ? 3 : req.importance === 'high' ? 2 : 1);
    } else {
      missing.push({label: req.label, importance: req.importance, status: 'missing'});
    }
  });

  var maxScore = allRequired.reduce(function(sum, r) { return sum + (r.importance === 'critical' ? 3 : r.importance === 'high' ? 2 : 1); }, 0);
  var percentage = total > 0 ? Math.round((score / maxScore) * 100) : 0;
  var sufficient = percentage >= 70 && missing.filter(function(m) { return m.importance === 'critical'; }).length === 0;

  return {
    sufficient: sufficient,
    score: percentage,
    totalSections: total,
    presentCount: present.length,
    missingCount: missing.length,
    present: present,
    missing: missing,
    recommendation: sufficient ? 'Data is sufficient for clinical review.' : 'Additional information needed: ' + missing.filter(function(m) { return m.importance === 'critical'; }).map(function(m) { return m.label; }).join(', ')
  };
}

// Fragment endpoint
app.post('/fragment', function(req, res) {
  try {
    var text = req.body.text;
    var procedureType = req.body.procedureType;
    if (!text) return res.status(400).json({error: 'No text provided'});
    var sections = fragmentText(text, procedureType || 'general');
    res.json({success: true, sections: sections});
  } catch (err) {
    console.error('Fragment error:', err);
    res.status(500).json({error: 'Fragmentation failed', details: err.message});
  }
});

// Check sufficiency endpoint
app.post('/check-sufficiency', function(req, res) {
  try {
    var sections = req.body.sections;
    var procedureType = req.body.procedureType;
    if (!sections) return res.status(400).json({error: 'No sections provided'});
    var result = checkSufficiency(sections, procedureType || 'general');
    res.json({success: true, result: result});
  } catch (err) {
    console.error('Sufficiency check error:', err);
    res.status(500).json({error: 'Sufficiency check failed', details: err.message});
  }
});

// Full pipeline: Upload + OCR + Fragment + Sufficiency
app.post('/process', upload.single('file'), async function(req, res) {
  try {
    if (!req.file) return res.status(400).json({error: 'No file provided'});
    var caseId = req.body.caseId || 'unknown';
    var category = req.body.category || 'uncategorized';
    var procedureType = req.body.procedureType || 'general';

    // 1. Upload to GCS
    var filename = caseId + '/' + category + '/' + Date.now() + '-' + req.file.originalname;
    var bucket = storage.bucket(BUCKET);
    var blob = bucket.file(filename);
    await blob.save(req.file.buffer, {contentType: req.file.mimetype, metadata: {caseId: caseId, category: category, originalName: req.file.originalname}});

    // 2. OCR via Document AI
    var ocrText = '';
    var pages = [];
    var entities = [];
    if (PROCESSOR_ID) {
      var client = new DocumentProcessorServiceClient();
      var name = 'projects/' + PROJECT_ID + '/locations/' + LOCATION + '/processors/' + PROCESSOR_ID;
      var request = {name: name, rawDocument: {content: req.file.buffer.toString('base64'), mimeType: req.file.mimetype}};
      var result = await client.processDocument(request);
      var doc = result[0].document;
      ocrText = doc.text || '';
      pages = (doc.pages || []).map(function(p) { return {pageNumber: p.pageNumber, width: p.dimension ? p.dimension.width : 0, height: p.dimension ? p.dimension.height : 0, blocks: (p.blocks || []).length}; });
      entities = (doc.entities || []).map(function(e) { return {type: e.type, mentionText: e.mentionText, confidence: e.confidence}; });
    }

    // 3. Fragment
    var sections = fragmentText(ocrText, procedureType);

    // 4. Sufficiency check
    var sufficiency = checkSufficiency(sections, procedureType);

    res.json({
      success: true,
      upload: {filename: filename, url: 'gs://' + BUCKET + '/' + filename, size: req.file.size},
      ocr: {text: ocrText, pages: pages, entities: entities},
      sections: sections,
      sufficiency: sufficiency
    });
  } catch (err) {
    console.error('Process error:', err);
    res.status(500).json({error: 'Processing failed', details: err.message});
  }
});

app.listen(PORT, function() { console.log('2ndOpinion API running on port ' + PORT); });
