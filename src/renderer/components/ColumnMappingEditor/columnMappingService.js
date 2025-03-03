/**
 * Service för hantering av kolumnmappningar
 * 
 * En robust hantering av kolumnmappningar som används för att översätta
 * externa kolumnnamn från CSV-filer till interna fältnamn i applikationen.
 */
import { readColumnMappings as getStoredMappings, saveColumnMappings as storeColumnMappings } from '../../../utils/webStorageService';

// Standard kolumnmappningar - används när inga sparade mappningar finns
export const DEFAULT_MAPPINGS = {
  // Metadata (visas i PostView)
  "Publicerings-id": "post_id",
  "Konto-id": "account_id",
  "Kontonamn": "account_name",
  "Kontots användarnamn": "account_username",
  "Beskrivning": "description",
  "Publiceringstid": "publish_time",
  "Inläggstyp": "post_type",
  "Permalänk": "permalink",
  
  // Mätvärden
  "Visningar": "views",
  "Räckvidd": "post_reach",
  "Gilla-markeringar": "likes",
  "Kommentarer": "comments",
  "Delningar": "shares",
  "Följer": "follows",
  "Sparade objekt": "saves"
};

// Beskrivande namn för användargränssnittet
export const DISPLAY_NAMES = {
  'post_id': 'Post ID',
  'account_id': 'Konto-ID',
  'account_name': 'Kontonamn',
  'account_username': 'Användarnamn',
  'description': 'Beskrivning',
  'publish_time': 'Publiceringstid',
  'post_type': 'Typ',
  'permalink': 'Länk',
  'views': 'Visningar',
  'post_reach': 'Räckvidd',
  'average_reach': 'Genomsnittlig räckvidd',
  'engagement_total': 'Interaktioner',
  'engagement_total_extended': 'Totalt engagemang (alla typer)',
  'likes': 'Gilla-markeringar',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'saves': 'Sparade',
  'follows': 'Följare'
};

// Alternativa namn för vanliga fält för bättre sökning
export const ALTERNATIVE_NAMES = {
  "views": ["Views", "Visningar", "Impressions", "Exponeringar", "impressions"],
  "post_reach": ["Reach", "Räckvidd", "reach"],
  "likes": ["Likes", "Gilla-markeringar", "Gilla markeringar", "likes"],
  "comments": ["Comments", "Kommentarer", "comments"],
  "shares": ["Shares", "Delningar", "shares"],
  "follows": ["Follows", "Följer", "Följare", "follows"],
  "saves": ["Saves", "Sparade objekt", "Sparade", "saves"],
  "post_id": ["Post ID", "Publicerings-id", "Inläggs-ID", "PostID", "post_id", "post-id"],
  "account_id": ["Account ID", "Konto-id", "Konto-ID", "KontoID", "account_id", "page_id"],
  "account_name": ["Account name", "Kontonamn", "Page name", "account_name"],
  "account_username": ["Account username", "Kontots användarnamn", "Användarnamn", "Username", "account_username"],
  "description": ["Description", "Beskrivning", "description", "Caption", "caption"],
  "publish_time": ["Publish time", "Publiceringstid", "publish_time", "Date", "date", "Datum"],
  "post_type": ["Post type", "Inläggstyp", "Typ", "post_type", "Type", "type"],
  "permalink": ["Permalink", "Permalänk", "Länk", "permalink", "Link", "link", "URL", "url"]
};

// Gruppera kolumner för bättre översikt i ColumnMappingEditor
export const COLUMN_GROUPS = {
  'Metadata': ['post_id', 'account_id', 'account_name', 'account_username', 'description', 'publish_time', 'post_type', 'permalink'],
  'Räckvidd och visningar': ['views', 'post_reach', 'average_reach'],
  'Engagemang': ['engagement_total', 'engagement_total_extended', 'likes', 'comments', 'shares', 'saves', 'follows']
};

// Cache för att förbättra prestanda
let cachedMappings = null;
let cachedInverseMap = null;

/**
 * Normalisera text för konsistent jämförelse
 * Tar bort extra mellanslag, konverterar till lowercase, etc.
 */
export function normalizeText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Hantera multipla mellanslag
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Ta bort osynliga tecken
}

/**
 * Hämtar aktuella mappningar, antingen från cache eller localStorage
 */
export function getCurrentMappings() {
  if (cachedMappings) {
    return cachedMappings;
  }

  try {
    // Vi använder synkron localStorage åtkomst direkt för att undvika async
    const storedData = localStorage.getItem('instagram_stats_column_mappings');
    if (storedData) {
      cachedMappings = JSON.parse(storedData);
    } else {
      cachedMappings = { ...DEFAULT_MAPPINGS };
    }
    
    return cachedMappings;
  } catch (error) {
    console.log('Kunde inte läsa mappningar, använder default:', error);
    cachedMappings = { ...DEFAULT_MAPPINGS };
    return cachedMappings;
  }
}

/**
 * Skapar en omvänd mappning (internt namn -> original CSV kolumnnamn)
 * Används för att hitta originalkolumnnamn från interna namn
 */
export function getInverseMappings() {
  if (cachedInverseMap) {
    return cachedInverseMap;
  }
  
  const mappings = getCurrentMappings();
  
  // Skapa en omvänd mappning (internt namn -> original CSV kolumnnamn)
  cachedInverseMap = Object.entries(mappings).reduce((acc, [original, internal]) => {
    acc[internal] = original;
    return acc;
  }, {});
  
  return cachedInverseMap;
}

/**
 * Läser kolumnmappningar från localStorage eller returnerar default
 * Denna funktion är fortfarande async för att stödja befintlig kod som använder den
 */
export async function readColumnMappings() {
  return getCurrentMappings();
}

/**
 * Sparar uppdaterade kolumnmappningar till localStorage
 */
export async function saveColumnMappings(mappings) {
  try {
    console.log('Sparar nya kolumnmappningar:', mappings);
    
    // Spara mappningar i localStorage via webStorageService
    await storeColumnMappings(mappings);
    console.log('Kolumnmappningar sparade framgångsrikt till localStorage');
    
    // Uppdatera cache med nya mappningar
    cachedMappings = mappings;
    cachedInverseMap = null; // Återställ inverse map eftersom mappningarna har ändrats
    console.log('Cache uppdaterad med nya mappningar');
    return true;
  } catch (error) {
    console.error('Fel vid sparande av kolumnmappningar:', error);
    throw new Error('Kunde inte spara kolumnmappningar');
  }
}

/**
 * Validerar att alla nödvändiga kolumner finns i CSV-data
 */
export function validateRequiredColumns(csvHeaders) {
  if (!csvHeaders || !Array.isArray(csvHeaders)) {
    console.error('Invalid csvHeaders:', csvHeaders);
    return { isValid: false, missingColumns: [] };
  }

  // Skapa set av normaliserade headers
  const normalizedHeaders = new Set(
    csvHeaders.map(header => normalizeText(header))
  );

  // Hitta saknade kolumner
  const missingColumns = Object.entries(DEFAULT_MAPPINGS)
    .filter(([originalName]) => !normalizedHeaders.has(normalizeText(originalName)))
    .map(([originalName, internalName]) => ({
      original: originalName,
      internal: internalName,
      displayName: DISPLAY_NAMES[internalName]
    }));

  return {
    isValid: missingColumns.length === 0,
    missingColumns
  };
}

/**
 * Förbättrad central funktion för att hämta värden från data (SYNKRON VERSION)
 * Används av både AccountView och PostView för konsistent beteende
 */
export function getValue(dataObject, targetField) {
  // Om objektet eller fältet saknas, returnera null
  if (!dataObject || !targetField) return null;
  
  // Om värdet finns direkt på objektet, returnera det
  if (dataObject[targetField] !== undefined) {
    return dataObject[targetField];
  }
  
  // Särskilda fall för vissa viktiga fält
  if (targetField === 'account_name') {
    // Försök hitta kontonamn från flera olika möjliga källor
    for (const key of ['account_name', 'Account name', 'Page name', 'Kontonamn']) {
      if (dataObject[key] !== undefined) {
        return dataObject[key];
      }
    }
    return 'Unknown'; // Standardvärde om inget hittas
  }
  
  if (targetField === 'account_id') {
    // Försök hitta konto-id från flera olika möjliga källor
    for (const key of ['account_id', 'Account ID', 'Konto-ID', 'Page ID']) {
      if (dataObject[key] !== undefined) {
        return dataObject[key];
      }
    }
    return null;
  }

  // Hantera specialfall för engagement_total
  if (targetField === 'engagement_total') {
    // Beräkna summan av likes, comments och shares
    let likes = 0, comments = 0, shares = 0;
    
    // Hämta likes
    likes = getFieldValue(dataObject, 'likes') || 0;
    
    // Hämta comments
    comments = getFieldValue(dataObject, 'comments') || 0;
    
    // Hämta shares
    shares = getFieldValue(dataObject, 'shares') || 0;
    
    return likes + comments + shares;
  }
  
  // Hantera specialfall för det utökade engagemanget
  if (targetField === 'engagement_total_extended') {
    // Beräkna summan av alla engagemangsvärden
    let likes = 0, comments = 0, shares = 0, saves = 0, follows = 0;
    
    // Hämta alla engagemangsvärden
    likes = getFieldValue(dataObject, 'likes') || 0;
    comments = getFieldValue(dataObject, 'comments') || 0;
    shares = getFieldValue(dataObject, 'shares') || 0;
    saves = getFieldValue(dataObject, 'saves') || 0;
    follows = getFieldValue(dataObject, 'follows') || 0;
    
    return likes + comments + shares + saves + follows;
  }
  
  // Använd den mer generella getFieldValue för alla andra fält
  return getFieldValue(dataObject, targetField);
}

/**
 * Hjälpfunktion för att hitta värdet för ett specifikt fält i data (SYNKRON VERSION)
 * Provar flera alternativ baserat på mappningar och kända alternativ
 */
export function getFieldValue(dataObject, fieldName) {
  if (!dataObject) return null;
  
  // 1. Försök direkt åtkomst till fältet
  if (dataObject[fieldName] !== undefined) {
    return safeParseValue(dataObject[fieldName]);
  }
  
  // 2. Använd mappningar för att hitta originalkolumnnamnet
  const inverseMappings = getInverseMappings();
  const originalColumnName = inverseMappings[fieldName];
  
  if (originalColumnName && dataObject[originalColumnName] !== undefined) {
    return safeParseValue(dataObject[originalColumnName]);
  }
  
  // 3. Prova alternativa namn från ALTERNATIVE_NAMES
  if (ALTERNATIVE_NAMES[fieldName]) {
    for (const altName of ALTERNATIVE_NAMES[fieldName]) {
      if (dataObject[altName] !== undefined) {
        return safeParseValue(dataObject[altName]);
      }
    }
  }
  
  // 4. Försök hitta genom normaliserade kolumnnamn
  const normalizedFieldName = normalizeText(fieldName);
  for (const [key, value] of Object.entries(dataObject)) {
    if (normalizeText(key) === normalizedFieldName) {
      return safeParseValue(value);
    }
  }
  
  // Inget värde hittat
  return null;
}

/**
 * Hjälpfunktion för att säkert tolka värden (numeriska, datum, etc.)
 */
export function safeParseValue(value) {
  if (value === null || value === undefined) return null;
  
  // Om det är ett nummer eller kan tolkas som ett
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
    const numValue = parseFloat(value);
    return isNaN(numValue) ? value : numValue;
  }
  
  return value;
}

/**
 * Formaterar värden för visning i UI
 */
export function formatValue(value) {
  if (value === null || value === undefined) return 'Saknas';
  if (value === 0) return '0';
  if (typeof value === 'number') return value.toLocaleString();
  return value || '-';
}

/**
 * Formaterar datum för visning
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
}

/**
 * En mer robust funktion för att hitta matchning mellan kolumnnamn
 */
export function findMatchingColumnKey(columnName, mappings) {
  if (!columnName || !mappings) return null;
  
  const normalizedColumnName = normalizeText(columnName);
  
  // Direktmatchning
  for (const [original, internal] of Object.entries(mappings)) {
    if (normalizeText(original) === normalizedColumnName) {
      return internal;
    }
  }
  
  // Försök hitta match i alternativa namn
  for (const [internal, alternatives] of Object.entries(ALTERNATIVE_NAMES)) {
    if (alternatives.some(alt => normalizeText(alt) === normalizedColumnName)) {
      return internal;
    }
  }
  
  return null;
}

/**
 * Returnerar alla kända namn för ett internt fältnamn
 */
export function getAllKnownNamesForField(internalName) {
  const names = new Set();
  
  // Lägg till från mappningar (omvänt)
  const inverseMappings = getInverseMappings();
  if (inverseMappings[internalName]) {
    names.add(inverseMappings[internalName]);
  }
  
  // Lägg till från alternativa namn
  if (ALTERNATIVE_NAMES[internalName]) {
    ALTERNATIVE_NAMES[internalName].forEach(name => names.add(name));
  }
  
  // Ta bort dupliceringar och returnera unika namn
  return [...names];
}

/**
 * Rensa cachen - användbart om vi behöver tvinga en omladdning av mappningar
 */
export function clearMappingsCache() {
  cachedMappings = null;
  cachedInverseMap = null;
}