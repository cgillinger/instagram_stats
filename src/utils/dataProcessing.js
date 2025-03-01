/**
 * Databearbetning för Instagram-statistik
 */
import Papa from 'papaparse';
import { getAccountViewData, getPostViewData } from './webStorageService';

// Displaynamn för tillgängliga fält i per-konto vyn
export const ACCOUNT_VIEW_FIELDS = {
  'views': 'Visningar',
  'post_reach': 'Räckvidd',
  'average_reach': 'Genomsnittlig räckvidd',
  'engagement_total': 'Gilla-markeringar, kommentarer och delningar',
  'likes': 'Gilla-markeringar',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'saves': 'Sparade',
  'follows': 'Följare'
};

// Displaynamn för tillgängliga fält i per-inlägg vyn
export const POST_VIEW_FIELDS = {
  'description': 'Beskrivning',
  'publish_time': 'Publiceringstid',
  'views': 'Visningar',
  'post_reach': 'Räckvidd',
  'engagement_total': 'Gilla-markeringar, kommentarer och delningar',
  'likes': 'Gilla-markeringar',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'saves': 'Sparade',
  'follows': 'Följare',
  'post_type': 'Typ'
};

/**
 * Normalisera text för konsistent jämförelse
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
 * Parse and process CSV data
 */
export const processCSVData = async (csvContent) => {
  return await getProcessedData();
};

/**
 * Hämtar data från localStorage/IndexedDB
 */
export const getProcessedData = async () => {
  const accountViewData = await getAccountViewData();
  const postViewData = await getPostViewData();
  
  return {
    rows: postViewData,
    accountViewData: accountViewData,
    postViewData: postViewData
  };
};

/**
 * Hämtar en lista med unika kontonamn från postdata
 */
export const getUniquePageNames = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  // Extrahera unika kontonamn
  const accountNames = new Set();
  
  data.forEach(post => {
    // Försök hämta kontonamn från account_name eller originalkolumnnamnet Account name
    const accountName = post.account_name || post['Account name'];
    if (accountName) {
      accountNames.add(accountName);
    }
  });
  
  return Array.from(accountNames).sort();
};

/**
 * Summerar data per konto
 */
export const summarizeByAccount = (data, selectedFields) => {
  if (!Array.isArray(data) || data.length === 0 || !selectedFields) {
    return [];
  }
  
  // Gruppera per konto-ID
  const groupedByAccount = data.reduce((acc, post) => {
    const accountId = post.account_id;
    if (!accountId) return acc;
    
    if (!acc[accountId]) {
      acc[accountId] = {
        account_id: accountId,
        account_name: post.account_name || 'Okänt konto',
        account_username: post.account_username || '-',
        posts: []
      };
    }
    
    acc[accountId].posts.push(post);
    return acc;
  }, {});
  
  // Räkna ut summerade värden för varje konto
  const summaryData = Object.values(groupedByAccount).map(account => {
    const summary = {
      account_id: account.account_id,
      account_name: account.account_name,
      account_username: account.account_username
    };
    
    // Beräkna summa/genomsnitt för varje valt fält
    selectedFields.forEach(field => {
      if (field === 'average_reach') {
        // Specialhantering för genomsnittlig räckvidd
        const totalReach = account.posts.reduce((sum, post) => {
          return sum + (post.post_reach || 0);
        }, 0);
        summary.average_reach = account.posts.length > 0 
          ? Math.round(totalReach / account.posts.length) 
          : 0;
      } else {
        // Summera övriga värden
        summary[field] = account.posts.reduce((sum, post) => {
          return sum + (post[field] || 0);
        }, 0);
      }
    });
    
    return summary;
  });
  
  return summaryData;
};