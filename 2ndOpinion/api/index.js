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

// Data fragmentation - extract structured data from OCR text
app.post('/fragment', (req, res) => {
  try {
    var text = req.body.text || '';
    var fragments = {
      patientInfo: extractPatientInfo(text),
      diagnosis: extractDiagnosis(text),
      procedure: extractProcedure(text),
      medications: extractMedications(text),
      labResults: extractLabResults(text),
      clinicalNotes: extractClinicalNotes(text)
    };
    res.json({success: true, fragments: fragments});
  } catch (err) {
    res.status(500).json({error: 'Fragmentation failed', details: err.message});
  }
});

// Sufficiency check against NICE guidelines
app.post('/sufficiency-check', (req, res) => {
  try {
    var fragments = req.body.fragments || {};
    var procedureType = req.body.procedureType || '';
    var result = checkSufficiency(fragments, procedureType);
    res.json({success: true, result: result});
  } catch (err) {
    res.status(500).json({error: 'Sufficiency check failed', details: err.message});
  }
});

// Helper: Extract patient info from OCR text
function extractPatientInfo(text) {
  var info = {name: '', age: '', gender: '', weight: '', height: '', bmi: ''};
  var nameMatch = text.match(/(?:patient|name)[:\s]+([A-Za-z\s]+)/i);
  if (nameMatch) info.name = nameMatch[1].trim();
  var ageMatch = text.match(/(\d{1,3})[\s-]*(?:year|yr|y\/o)/i);
  if (ageMatch) info.age = ageMatch[1];
  var genderMatch = text.match(/(?:gender|sex)[:\s]*(male|female|m|f)/i);
  if (genderMatch) info.gender = genderMatch[1];
  var weightMatch = text.match(/(\d{2,3})[\s]*(?:kg|kilogram)/i);
  if (weightMatch) info.weight = weightMatch[1] + ' kg';
  var heightMatch = text.match(/(\d{2,3})[\s]*(?:cm|centimeter)/i);
  if (heightMatch) info.height = heightMatch[1] + ' cm';
  var bmiMatch = text.match(/(?:bmi)[:\s]*(\d+\.?\d*)/i);
  if (bmiMatch) info.bmi = bmiMatch[1];
  return info;
}

function extractDiagnosis(text) {
  var diagSection = text.match(/(?:diagnosis|diagnostic|impression)[:\s]*([\s\S]*?)(?=\n\n|procedure|medication|$)/i);
  return diagSection ? diagSection[1].trim().substring(0, 500) : '';
}

function extractProcedure(text) {
  var procMatch = text.match(/(?:procedure|surgery|operation)[:\s]*([\s\S]*?)(?=\n\n|diagnosis|medication|$)/i);
  return procMatch ? procMatch[1].trim().substring(0, 500) : '';
}

function extractMedications(text) {
  var medSection = text.match(/(?:medication|prescription|drug)[s]?[:\s]*([\s\S]*?)(?=\n\n|diagnosis|procedure|$)/i);
  return medSection ? medSection[1].trim().split('\n').filter(function(l) { return l.trim(); }) : [];
}

function extractLabResults(text) {
  var labSection = text.match(/(?:lab|laboratory|result|investigation)[s]?[:\s]*([\s\S]*?)(?=\n\n|diagnosis|procedure|$)/i);
  return labSection ? labSection[1].trim().substring(0, 1000) : '';
}

function extractClinicalNotes(text) {
  var noteSection = text.match(/(?:clinical note|history|assessment|hpi|presenting complaint)[s]?[:\s]*([\s\S]*?)(?=\n\n|diagnosis|procedure|$)/i);
  return noteSection ? noteSection[1].trim().substring(0, 1000) : '';
}

// NICE guidelines sufficiency requirements by procedure type
function checkSufficiency(fragments, procedureType) {
  var required = getRequiredFields(procedureType);
  var missing = [];
  var present = [];
  required.forEach(function(field) {
    var value = getNestedValue(fragments, field.path);
    if (value && value.length > 0) {
      present.push({field: field.label, status: 'present'});
    } else {
      missing.push({field: field.label, status: 'missing', importance: field.importance});
    }
  });
  var score = present.length / (present.length + missing.length) * 100;
  return {
    score: Math.round(score),
    sufficient: score >= 70,
    present: present,
    missing: missing,
    procedureType: procedureType
  };
}

function getNestedValue(obj, path) {
  return path.split('.').reduce(function(o, k) { return o && o[k]; }, obj);
}

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
app.listen(PORT, function() { console.log('2ndOpinion API running on port ' + PORT); });
