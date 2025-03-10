/**
 * Web Data Processor
 * 
 * Webbversion av Instagram databearbetning som använder
 * webbläsarens API:er för att hantera och bearbeta data.
 */
import Papa from 'papaparse';
import { saveProcessedData } from './webStorageService';
import { DEFAULT_MAPPINGS } from '../renderer/components/ColumnMappingEditor/columnMappingService';
import { getValue, normalizeText } from '../renderer/components/ColumnMappingEditor/columnMappingService';

// Summeringsbara värden för "Per konto"-vy
const SUMMARIZABLE_COLUMNS = Object.values(DEFAULT_MAPPINGS).filter(col => [
  "views", "likes", "comments", "shares", "saves", "follows"
].includes(col));

// Metadata och icke-summeringsbara värden
const NON_SUMMARIZABLE_COLUMNS = Object.values(DEFAULT_MAPPINGS).filter(col => [
  "post_id", "account_id", "account_name", "account_username", "description",
  "publish_time", "date", "post_type", "permalink"
].includes(col));

/**
 * Formaterar datum till svenskt format (YYYY-MM-DD)
 */
function formatSwedishDate(date) {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Fel vid datumformatering:', error);
    return '';
  }
}

/**
 * Identifierar och hanterar dubletter baserat på Post ID
 * Använder getValue för att stödja olika språk
 */
function handleDuplicates(data, columnMappings) {
  // Skapa en map för att hålla reda på unika post_ids
  const uniquePosts = new Map();
  const duplicateIds = new Set();
  let duplicateCount = 0;
  const totalRows = data.length;
  
  // Först identifiera och räkna dubletter
  data.forEach(row => {
    // Använd getValue för att hitta post_id oavsett vilket språk CSV-filen är på
    const postId = getValue(row, 'post_id');
    
    if (postId) {
      const postIdStr = String(postId);
      
      if (uniquePosts.has(postIdStr)) {
        duplicateCount++;
        duplicateIds.add(postIdStr);
      } else {
        uniquePosts.set(postIdStr, row);
      }
    } else {
      // Om ingen post_id finns, använd hela raden som unik nyckel
      const rowStr = JSON.stringify(row);
      if (uniquePosts.has(rowStr)) {
        duplicateCount++;
      } else {
        uniquePosts.set(rowStr, row);
      }
    }
  });
  
  // Konvertera Map till array av unika rader
  const uniqueData = Array.from(uniquePosts.values());
  
  return {
    filteredData: uniqueData,
    stats: {
      totalRows,
      duplicates: duplicateCount,
      duplicateIds: Array.from(duplicateIds)
    }
  };
}

/**
 * Mappar CSV-kolumnnamn till interna namn med hjälp av kolumnmappningar
 * Använder bara exakta matchningar från användarkonfigurerade mappningar
 */
function mapColumnNames(row, columnMappings) {
  const mappedRow = {};
  
  Object.entries(row).forEach(([originalCol, value]) => {
    // Hitta matchande mappning via normaliserad textjämförelse
    const normalizedCol = normalizeText(originalCol);
    
    let internalName = null;
    for (const [mapKey, mapValue] of Object.entries(columnMappings)) {
      if (normalizeText(mapKey) === normalizedCol) {
        internalName = mapValue;
        break;
      }
    }
    
    // Om ingen mappning hittades, behåll originalkolumnen som är
    if (!internalName) {
      internalName = originalCol;
    }
    
    mappedRow[internalName] = value;
  });
  
  return mappedRow;
}

/**
 * Bearbetar CSV-innehåll och returnerar aggregerad data
 */
export async function processInstagramData(csvContent, columnMappings) {
  return new Promise((resolve, reject) => {
    try {
      Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            reject(new Error('Ingen data hittades i CSV-filen.'));
            return;
          }
          
          console.log('CSV-data analyserad:', {
            rows: results.data.length,
            columns: Object.keys(results.data[0]).length
          });
          
          // Identifiera och filtrera dubletter med tillgång till kolumnmappningar
          const { filteredData, stats } = handleDuplicates(results.data, columnMappings);
          
          console.log('Dubbletthantering klar:', {
            originalRows: stats.totalRows,
            filteredRows: filteredData.length,
            duplicatesRemoved: stats.duplicates
          });
          
          let perKonto = {};
          let perPost = [];
          
          // Hitta datumintervall
          let allDates = [];
          
          // Bearbeta varje unik rad
          filteredData.forEach(row => {
            // Mappa kolumnnamn till interna namn
            const mappedRow = mapColumnNames(row, columnMappings);
            
            // Använd getValue för att få accountID för att säkerställa att vi använder rätt fält
            const accountID = getValue(mappedRow, 'account_id') || 'unknown';
            
            if (!accountID) return;
            
            // Använd getValue för att säkerställa att account_name finns
            const accountName = getValue(mappedRow, 'account_name') || 'Okänt konto';
            const accountUsername = getValue(mappedRow, 'account_username') || '-';
            
            // Samla in publiceringsdatum för datumintervall
            const publishDate = getValue(mappedRow, 'publish_time') || 
                               getValue(mappedRow, 'date') || 
                               mappedRow['Publiceringstid'] || 
                               mappedRow['Datum'];
            
            if (publishDate) {
              const date = new Date(publishDate);
              if (!isNaN(date.getTime())) {
                allDates.push(date);
              }
            }
            
            // Skapa konto-objekt om det inte finns
            if (!perKonto[accountID]) {
              perKonto[accountID] = { 
                "account_id": accountID,
                "account_name": accountName,
                "account_username": accountUsername
              };
              SUMMARIZABLE_COLUMNS.forEach(col => perKonto[accountID][col] = 0);
            }
            
            // Beräkna engagement_total (likes + comments + shares)
            const likes = parseFloat(getValue(mappedRow, 'likes')) || 0;
            const comments = parseFloat(getValue(mappedRow, 'comments')) || 0;
            const shares = parseFloat(getValue(mappedRow, 'shares')) || 0;
            mappedRow["engagement_total"] = likes + comments + shares;
            
            // Summera värden
            SUMMARIZABLE_COLUMNS.forEach(col => {
              const value = getValue(mappedRow, col);
              if (value !== null && !isNaN(parseFloat(value))) {
                perKonto[accountID][col] += parseFloat(value);
              }
            });
            
            // Spara per inlägg-data
            perPost.push(mappedRow);
          });
          
          // Beräkna datumintervall
          let dateRange = { startDate: null, endDate: null };
          
          if (allDates.length > 0) {
            const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
            
            dateRange = {
              startDate: formatSwedishDate(minDate),
              endDate: formatSwedishDate(maxDate)
            };
          }
          
          // Beräkna totalt engagemang för varje konto
          Object.values(perKonto).forEach(account => {
            account.engagement_total = 
              (account.likes || 0) + 
              (account.comments || 0) + 
              (account.shares || 0);
          });
          
          // Konvertera till arrays
          const perKontoArray = Object.values(perKonto);
          
          // Spara data via webStorageService
          saveProcessedData(perKontoArray, perPost)
            .then(() => {
              console.log('Bearbetning klar! Data sparad i webbläsaren.');
              resolve({
                accountViewData: perKontoArray,
                postViewData: perPost,
                rows: perPost,
                rowCount: perPost.length,
                meta: {
                  processedAt: new Date(),
                  stats: stats,
                  dateRange: dateRange
                }
              });
            })
            .catch((error) => {
              console.error('Kunde inte spara bearbetad data:', error);
              reject(error);
            });
        },
        error: (error) => {
          console.error('Fel vid CSV-parsning:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Oväntat fel vid bearbetning:', error);
      reject(error);
    }
  });
}

/**
 * Returnerar en lista med unika kontonamn från data
 */
export function getUniquePageNames(data) {
  if (!Array.isArray(data)) return [];
  
  // Extrahera och deduplicera kontonamn
  const accountNames = new Set();
  
  data.forEach(post => {
    const accountName = getValue(post, 'account_name');
    if (accountName) {
      accountNames.add(accountName);
    }
  });
  
  return Array.from(accountNames).sort();
}

/**
 * Exportfunktioner för användning i komponenter
 */
export { SUMMARIZABLE_COLUMNS, NON_SUMMARIZABLE_COLUMNS };