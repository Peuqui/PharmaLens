import { Router } from 'express';

const router = Router();

// Generate BMP 2.7 XML from medication data
router.post('/parse', (req, res) => {
  const logger = req.app.locals.logger;
  
  try {
    const medicationData = req.body;
    
    if (!medicationData || !medicationData.medications) {
      return res.status(400).json({
        error: {
          message: 'Keine Medikationsdaten erhalten'
        }
      });
    }

    // Generate BMP 2.7 XML
    const xml = generateBMP27XML(medicationData);
    
    res.set('Content-Type', 'application/xml');
    res.send(xml);
    
  } catch (error) {
    logger.error('Medication parse error:', error);
    res.status(500).json({
      error: {
        message: 'Fehler beim Generieren des BMP XML',
        details: error.message
      }
    });
  }
});

// Convert medication data to BMP30 format for QR code
router.post('/bmp30', (req, res) => {
  const logger = req.app.locals.logger;
  
  try {
    const medicationData = req.body;
    
    if (!medicationData) {
      return res.status(400).json({
        error: {
          message: 'Keine Medikationsdaten erhalten'
        }
      });
    }

    // Generate BMP30 string
    const bmp30String = generateBMP30String(medicationData);
    
    res.json({
      success: true,
      data: bmp30String,
      length: bmp30String.length
    });
    
  } catch (error) {
    logger.error('BMP30 generation error:', error);
    res.status(500).json({
      error: {
        message: 'Fehler beim Generieren des BMP30 Formats',
        details: error.message
      }
    });
  }
});

// Generate BMP 2.7 XML
function generateBMP27XML(data) {
  const { patient, medications, issueDate, doctor } = data;
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<MP xmlns="http://ws.gematik.de/fa/amts/AMTS_Document/v1.6" v="027">\n';
  
  // Patient data
  if (patient) {
    xml += '  <P>\n';
    if (patient.name) xml += `    <g>${escapeXml(patient.name)}</g>\n`;
    if (patient.birthDate) xml += `    <b>${patient.birthDate}</b>\n`;
    if (patient.gender) xml += `    <s>${patient.gender}</s>\n`;
    xml += '  </P>\n';
  }
  
  // Medications
  if (medications && medications.length > 0) {
    xml += '  <S>\n';
    medications.forEach((med, index) => {
      xml += `    <M i="${index + 1}">\n`;
      if (med.pzn) xml += `      <p>${med.pzn}</p>\n`;
      if (med.name) xml += `      <a>${escapeXml(med.name)}</a>\n`;
      if (med.activeIngredient) xml += `      <w>${escapeXml(med.activeIngredient)}</w>\n`;
      if (med.form) xml += `      <f>${escapeXml(med.form)}</f>\n`;
      if (med.strength) xml += `      <z>${escapeXml(med.strength)}</z>\n`;
      
      // Dosing
      if (med.dosing) {
        const dosing = `${med.dosing.morning}-${med.dosing.noon}-${med.dosing.evening}-${med.dosing.night}`;
        xml += `      <d>${dosing}</d>\n`;
      }
      
      if (med.unit) xml += `      <e>${escapeXml(med.unit)}</e>\n`;
      if (med.indication) xml += `      <r>${escapeXml(med.indication)}</r>\n`;
      if (med.notes) xml += `      <h>${escapeXml(med.notes)}</h>\n`;
      xml += '    </M>\n';
    });
    xml += '  </S>\n';
  }
  
  // Issue date
  if (issueDate) {
    xml += `  <A t="${issueDate}"/>\n`;
  }
  
  xml += '</MP>';
  
  return xml;
}

// Generate BMP30 string for QR code
function generateBMP30String(data) {
  const { patient, medications } = data;
  
  let bmp30 = 'mp$v030$';
  
  // Patient section
  if (patient) {
    bmp30 += [
      patient.name || '',
      patient.birthDate || '',
      patient.gender || '',
      '', // Street
      '', // ZIP
      '', // City
      '', // Country code
      patient.address || ''
    ].join(',');
  } else {
    bmp30 += ',,,,,,,,';
  }
  
  bmp30 += '$';
  
  // Medications section
  if (medications && medications.length > 0) {
    const medStrings = medications.map(med => {
      const dosing = med.dosing || {};
      return [
        med.pzn || '',
        med.name || '',
        med.activeIngredient || '',
        med.form || '',
        med.strength || '',
        `${dosing.morning || 0}`,
        `${dosing.noon || 0}`,
        `${dosing.evening || 0}`,
        `${dosing.night || 0}`,
        med.unit || '',
        med.indication || '',
        med.notes || ''
      ].join(',');
    });
    
    bmp30 += medStrings.join('$');
  }
  
  return bmp30;
}

// Escape XML special characters
function escapeXml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default router;