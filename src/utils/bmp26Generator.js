// BMP 2.6 (Bundesmedikationsplan 2.6) XML Generator
// Offizieller Standard für deutsche Medikationspläne

export function generateBMP26XML(patientInfo, medications) {
  // Generate UUID without dashes
  const uuid = generateUUID()
  
  // Start XML without declaration (compact format)
  let xml = `<MP v="026" U="${uuid}" l="de-DE">`
  
  // Patient section
  if (patientInfo.name) {
    // Split name into last and first name
    let nachname = '', vorname = ''
    
    if (patientInfo.name.includes(',')) {
      // Format: "Nachname, Vorname"
      [nachname, vorname] = patientInfo.name.split(',').map(s => s.trim())
    } else {
      // Format: "Vorname Nachname"
      const parts = patientInfo.name.trim().split(' ')
      nachname = parts[parts.length - 1]
      vorname = parts.slice(0, -1).join(' ')
    }
    
    xml += '<P'
    if (vorname) xml += ` g="${escapeXML(vorname)}"`
    xml += ` f="${escapeXML(nachname)}"`
    
    // Birth date in YYYY-MM-DD format
    if (patientInfo.birthDate) {
      const formattedDate = formatBirthDate(patientInfo.birthDate)
      if (formattedDate) xml += ` b="${formattedDate}"`
    }
    
    xml += '/>'
  } else {
    // Empty patient
    xml += '<P f=""/>'
  }
  
  // Issuer section (A = Ausdruckender)
  const now = new Date()
  const timestamp = now.toISOString().substring(0, 16).replace('T', ' ')
  xml += `<A n="Drug2QR" t="${timestamp}"/>`
  
  // Medication section (S = Sektion)
  xml += '<S>'
  
  medications.forEach((med, index) => {
    xml += '<M'
    
    // PZN (Pharmazentralnummer) if available
    if (med.pzn) {
      xml += ` p="${med.pzn}"`
    }
    
    // Medication name (a = Handelsname)
    xml += ` a="${escapeXML(med.name || med.activeIngredient || '')}"`
    
    // Active ingredient (w = Wirkstoff)
    if (med.activeIngredient && med.activeIngredient !== med.name) {
      xml += ` w="${escapeXML(med.activeIngredient)}"`
    }
    
    // Strength (s = Stärke)
    if (med.strength) {
      xml += ` s="${escapeXML(med.strength)}"`
    }
    
    // Form (fd = Darreichungsform)
    if (med.form) {
      xml += ` fd="${escapeXML(med.form)}"`
    }
    
    // Parse dosage
    const dosage = parseDosage(med.dosage)
    
    // Dosing times (m=morgens, d=mittags, v=abends, h=nachts)
    if (dosage.morning) xml += ` m="${dosage.morning}"`
    if (dosage.noon) xml += ` d="${dosage.noon}"`
    if (dosage.evening) xml += ` v="${dosage.evening}"`
    if (dosage.night) xml += ` h="${dosage.night}"`
    
    // Dosing unit (du = Dosierungseinheit)
    if (med.unit) {
      xml += ` du="${escapeXML(med.unit)}"`
    }
    
    // Instructions (i = Hinweise)
    if (med.instructions) {
      xml += ` i="${escapeXML(med.instructions)}"`
    }
    
    // Reason/Indication (r = Grund)
    if (med.indication) {
      xml += ` r="${escapeXML(med.indication)}"`
    }
    
    xml += '/>'
  })
  
  xml += '</S></MP>'
  
  return xml
}

// Generate UUID without dashes
function generateUUID() {
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function(c) {
    const r = Math.random() * 16 | 0
    return r.toString(16)
  })
}

// Escape XML special characters
function escapeXML(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Format birth date to YYYY-MM-DD
function formatBirthDate(dateStr) {
  if (!dateStr) return null
  
  // Try different date formats
  let date = null
  
  // Format: DD.MM.YYYY
  if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
    const [day, month, year] = dateStr.split('.')
    date = new Date(year, month - 1, day)
  }
  // Format: YYYY-MM-DD
  else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    date = new Date(dateStr)
  }
  // Format: DD/MM/YYYY
  else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const [day, month, year] = dateStr.split('/')
    date = new Date(year, month - 1, day)
  }
  
  if (date && !isNaN(date.getTime())) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  return null
}

// Parse dosage string into structured format
function parseDosage(dosageStr) {
  const dosage = {
    morning: '',
    noon: '',
    evening: '',
    night: ''
  }
  
  if (!dosageStr) return dosage
  
  // Parse formats like "1-0-1-0" or "2-1-2-0"
  const dashPattern = /^(\d+(?:[,\.]\d+)?)\s*[-–]\s*(\d+(?:[,\.]\d+)?)\s*[-–]\s*(\d+(?:[,\.]\d+)?)\s*(?:[-–]\s*(\d+(?:[,\.]\d+)?))?$/
  const match = dosageStr.match(dashPattern)
  
  if (match) {
    dosage.morning = match[1] !== '0' ? match[1] : ''
    dosage.noon = match[2] !== '0' ? match[2] : ''
    dosage.evening = match[3] !== '0' ? match[3] : ''
    dosage.night = match[4] && match[4] !== '0' ? match[4] : ''
  } else {
    // Try to parse text-based dosages
    const lowerStr = dosageStr.toLowerCase()
    
    // Look for time-based patterns
    if (lowerStr.includes('morgen')) dosage.morning = '1'
    if (lowerStr.includes('mittag')) dosage.noon = '1'
    if (lowerStr.includes('abend')) dosage.evening = '1'
    if (lowerStr.includes('nacht')) dosage.night = '1'
    
    // Look for numeric patterns
    const singleNumber = dosageStr.match(/^(\d+)$/);
    if (singleNumber) {
      // Single number means once daily (usually morning)
      dosage.morning = singleNumber[1]
    }
  }
  
  return dosage
}

// Export also the old function name for compatibility
export { generateBMP26XML as generateBMP30 }