/**
 * Web Data Processor
 * 
 * Webbversion av Instagram databearbetning som använder
 * webbläsarens API:er för att hantera och bearbeta data.
 */
import Papa from 'papaparse';
import { saveProcessedData } from './webStorageService';
import { DEFAULT_MAPPINGS } from '../renderer/components/ColumnMappingEditor/columnMappingService';
import { getValue } from '../renderer/components/ColumnMappingEditor/columnMappingService';

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
 * Normaliserar text för konsekvent jämförelse
 */
function normalizeText(text) {
  if (text === null || text === undefined) return '';
  return text.toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Hantera multipla mellanslag
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Ta bort osynliga tecken
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
    
    // Om ingen mappning hittades, använd originalkolumnen
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
          
          // Bearbeta varje unik rad
          filteredData.forEach(row => {
            // Mappa kolumnnamn till interna namn
            const mappedRow = mapColumnNames(row, columnMappings);
            
            const accountID = mappedRow["account_id"] || 
                            mappedRow["Account ID"] || 
                            row["Account ID"] || 
                            'unknown';
            
            if (!accountID) return;
            
            // Säkerställ att account_name finns
            if (!mappedRow["account_name"]) {
              mappedRow["account_name"] = 
                mappedRow["Account name"] || 
                row["Account name"] || 
                'Okänt konto';
            }
            
            // Skapa konto-objekt om det inte finns
            if (!perKonto[accountID]) {
              perKonto[accountID] = { 
                "account_id": accountID,
                "account_name": mappedRow["account_name"],
                "account_username": mappedRow["account_username"] || mappedRow["Username"] || '-'
              };
              SUMMARIZABLE_COLUMNS.forEach(col => perKonto[accountID][col] = 0);
            }
            
            // Beräkna engagement_total (likes + comments + shares)
            const likes = parseFloat(mappedRow["likes"]) || 0;
            const comments = parseFloat(mappedRow["comments"]) || 0;
            const shares = parseFloat(mappedRow["shares"]) || 0;
            mappedRow["engagement_total"] = likes + comments + shares;
            
            // Summera värden
            SUMMARIZABLE_COLUMNS.forEach(col => {
              if (mappedRow[col] && !isNaN(parseFloat(mappedRow[col]))) {
                perKonto[accountID][col] += parseFloat(mappedRow[col]);
              }
            });
            
            // Spara per inlägg-data
            perPost.push(mappedRow);
          });
          
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
                  stats: stats
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
    const accountName = post.account_name || 
                       post['Account name'] || 
                       post['Page name'];
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