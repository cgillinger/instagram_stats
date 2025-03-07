import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, FileDown, FileSpreadsheet, Calculator } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { 
  readColumnMappings, 
  getValue,
  formatValue,
  DISPLAY_NAMES 
} from '../ColumnMappingEditor/columnMappingService';

// Importera BARA för att kunna generera korrekta exportfilnamn, men använd inte för visningsnamn
import { ACCOUNT_VIEW_FIELDS } from '@/utils/dataProcessing';

// Definiera specifika fält för per-konto-vyn - håll detta synkat med MainView.jsx
const ACCOUNT_VIEW_AVAILABLE_FIELDS = {
  'views': 'Visningar',
  'average_reach': 'Genomsnittlig räckvidd',
  'engagement_total': 'Interaktioner',
  'engagement_total_extended': 'Totalt engagemang (alla typer)',
  'likes': 'Gilla-markeringar',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'saves': 'Sparade',
  'follows': 'Följare',
  'post_count': 'Antal publiceringar',
  'posts_per_day': 'Antal publiceringar per dag'
};

// Lista över fält som inte ska ha totalsumma
const FIELDS_WITHOUT_TOTALS = [
  'average_reach',
  'posts_per_day'
];

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 per sida' },
  { value: '20', label: '20 per sida' },
  { value: '50', label: '50 per sida' }
];

// Funktion för att summera värden per konto (synkron version)
const summarizeByAccount = (data, selectedFields, columnMappings) => {
  if (!Array.isArray(data) || data.length === 0 || !selectedFields) {
    return [];
  }
  
  // Gruppera per konto-ID
  const groupedByAccount = {};
  
  // Gruppera inlägg per konto
  for (const post of data) {
    const accountId = getValue(post, 'account_id');
    if (!accountId) continue;
    
    const accountName = getValue(post, 'account_name') || 'Okänt konto';
    const accountUsername = getValue(post, 'account_username') || '-';
    
    if (!groupedByAccount[accountId]) {
      groupedByAccount[accountId] = {
        account_id: accountId,
        account_name: accountName,
        account_username: accountUsername,
        posts: []
      };
    }
    
    groupedByAccount[accountId].posts.push(post);
  }
  
  // Räkna ut summerade värden för varje konto
  const summaryData = [];
  
  for (const accountId in groupedByAccount) {
    const account = groupedByAccount[accountId];
    const summary = {
      account_id: account.account_id,
      account_name: account.account_name,
      account_username: account.account_username
    };
    
    // Extrahera grundvärdena först - samla in dessa oberoende av om de är valda
    // för att kunna beräkna sammansatta värden korrekt
    let totalLikes = 0, totalComments = 0, totalShares = 0, totalSaves = 0, totalFollows = 0;
    for (const post of account.posts) {
      totalLikes += (getValue(post, 'likes') || 0);
      totalComments += (getValue(post, 'comments') || 0);
      totalShares += (getValue(post, 'shares') || 0);
      totalSaves += (getValue(post, 'saves') || 0);
      totalFollows += (getValue(post, 'follows') || 0);
    }
    
    // Spara de grundläggande värdena om de är valda
    if (selectedFields.includes('likes')) summary.likes = totalLikes;
    if (selectedFields.includes('comments')) summary.comments = totalComments;
    if (selectedFields.includes('shares')) summary.shares = totalShares;
    if (selectedFields.includes('saves')) summary.saves = totalSaves;
    if (selectedFields.includes('follows')) summary.follows = totalFollows;
    
    // Beräkna sammansatta värden om de är valda
    if (selectedFields.includes('engagement_total')) {
      summary.engagement_total = totalLikes + totalComments + totalShares;
    }
    
    if (selectedFields.includes('engagement_total_extended')) {
      summary.engagement_total_extended = totalLikes + totalComments + totalShares + totalSaves + totalFollows;
    }
    
    // Beräkna antal publiceringar om det är valt
    if (selectedFields.includes('post_count')) {
      summary.post_count = account.posts.length;
    }
    
    // Beräkna antal publiceringar per dag om det är valt
    if (selectedFields.includes('posts_per_day')) {
      if (account.posts.length === 0) {
        summary.posts_per_day = 0;
      } else {
        // Samla alla publiceringsdatum för att hitta den totala perioden
        const dates = [];
        for (const post of account.posts) {
          const publishTime = getValue(post, 'publish_time');
          if (publishTime) {
            const date = new Date(publishTime);
            if (!isNaN(date.getTime())) {
              dates.push(date);
            }
          }
        }
        
        if (dates.length > 0) {
          // Hitta första och sista publiceringsdatum
          const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
          
          // Beräkna antal dagar mellan första och sista publiceringen (inklusive första och sista dagen)
          const daysDiff = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);
          
          // Beräkna inlägg per dag med en decimal
          summary.posts_per_day = Math.round((account.posts.length / daysDiff) * 10) / 10;
        } else {
          // Om inga giltiga datum kunde hittas, anta att allt publicerades på samma dag
          summary.posts_per_day = account.posts.length;
        }
      }
    }
    
    // Beräkna övriga valda fält
    for (const field of selectedFields) {
      // Hoppa över fält som redan är beräknade
      if (['likes', 'comments', 'shares', 'saves', 'follows', 
           'engagement_total', 'engagement_total_extended',
           'post_count', 'posts_per_day'].includes(field)) {
        continue;
      }
      
      if (field === 'average_reach') {
        // Beräkna genomsnittlig räckvidd
        let totalReach = 0;
        for (const post of account.posts) {
          const reachValue = getValue(post, 'post_reach');
          totalReach += (reachValue || 0);
        }
        
        summary.average_reach = account.posts.length > 0 
          ? Math.round(totalReach / account.posts.length) 
          : 0;
      } else {
        // Summera övriga värden
        let sum = 0;
        for (const post of account.posts) {
          const value = getValue(post, field);
          sum += (value || 0);
        }
        
        summary[field] = sum;
      }
    }
    
    summaryData.push(summary);
  }
  
  return summaryData;
};

const AccountView = ({ data, selectedFields }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [columnMappings, setColumnMappings] = useState({});
  const [summaryData, setSummaryData] = useState([]);
  const [totalSummary, setTotalSummary] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Ladda kolumnmappningar när komponenten monteras
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const mappings = await readColumnMappings();
        setColumnMappings(mappings);
      } catch (error) {
        console.error('Failed to load column mappings:', error);
      }
    };
    loadMappings();
  }, []);

  // Beräkna summerade data när data, valda fält eller mappningar ändras
  useEffect(() => {
    if (!data || !selectedFields || selectedFields.length === 0) {
      setSummaryData([]);
      setTotalSummary({});
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Använd den synkrona versionen av summarizeByAccount
      const summary = summarizeByAccount(data, selectedFields, columnMappings);
      setSummaryData(summary);
      
      // Beräkna totalsummor för alla fält
      if (Array.isArray(summary) && summary.length > 0) {
        const totals = { account_name: 'Totalt' };
        
        // Samla alltid in primärvärden oavsett om de är valda
        let totalLikes = 0, totalComments = 0, totalShares = 0, totalSaves = 0, totalFollows = 0;
        
        // Gå igenom alla rader i originaldata för att beräkna exakta siffror
        if (Array.isArray(data)) {
          data.forEach(post => {
            totalLikes += (getValue(post, 'likes') || 0);
            totalComments += (getValue(post, 'comments') || 0);
            totalShares += (getValue(post, 'shares') || 0);
            totalSaves += (getValue(post, 'saves') || 0);
            totalFollows += (getValue(post, 'follows') || 0);
          });
        }
        
        // Spara primärvärden till totaler om de är valda
        if (selectedFields.includes('likes')) totals.likes = totalLikes;
        if (selectedFields.includes('comments')) totals.comments = totalComments;
        if (selectedFields.includes('shares')) totals.shares = totalShares;
        if (selectedFields.includes('saves')) totals.saves = totalSaves;
        if (selectedFields.includes('follows')) totals.follows = totalFollows;
        
        // Beräkna sammansatta värden för total oavsett om primärvärdena är valda
        if (selectedFields.includes('engagement_total')) {
          totals.engagement_total = totalLikes + totalComments + totalShares;
        }
        
        if (selectedFields.includes('engagement_total_extended')) {
          totals.engagement_total_extended = totalLikes + totalComments + totalShares + totalSaves + totalFollows;
        }
        
        // Beräkna totalt antal publiceringar
        if (selectedFields.includes('post_count')) {
          totals.post_count = data.length;
        }
        
        // Summera övriga värden
        selectedFields.forEach(field => {
          // Hoppa över fält som redan är beräknade eller inte ska ha total
          if (['likes', 'comments', 'shares', 'saves', 'follows', 'engagement_total', 'engagement_total_extended', 'post_count'].includes(field) || 
              FIELDS_WITHOUT_TOTALS.includes(field)) {
            return;
          }
          
          // Summera övriga värden (t.ex. 'views') direkt från originaldata för exakthet
          if (field === 'views') {
            let totalViews = 0;
            data.forEach(post => {
              totalViews += (getValue(post, field) || 0);
            });
            totals[field] = totalViews;
          } else {
            // Fallback till summering från summary för övriga fält
            totals[field] = summary.reduce((sum, account) => {
              return sum + (getValue(account, field) || 0);
            }, 0);
          }
        });
        
        setTotalSummary(totals);
      }
    } catch (error) {
      console.error('Failed to load summary data:', error);
      setSummaryData([]);
      setTotalSummary({});
    } finally {
      setIsLoading(false);
    }
  }, [data, selectedFields, columnMappings]);

  // Återställ till första sidan när data eller pageSize ändras
  useEffect(() => {
    setCurrentPage(1);
  }, [data, pageSize]);

  // Hantera sortering av kolumner
  const handleSort = (key) => {
    setSortConfig((currentSort) => ({
      key,
      direction: currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Hämta ikon för sortering
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1" /> : 
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Hämta visningsnamn för ett fält från ACCOUNT_VIEW_AVAILABLE_FIELDS
  const getDisplayName = (field) => {
    return ACCOUNT_VIEW_AVAILABLE_FIELDS[field] || DISPLAY_NAMES[field] || field;
  };

  // Sortera data baserat på aktuell sorteringskonfiguration
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key || !Array.isArray(summaryData)) return summaryData;

    return [...summaryData].sort((a, b) => {
      const aValue = getValue(a, sortConfig.key);
      const bValue = getValue(b, sortConfig.key);

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return sortConfig.direction === 'asc' ? 
        aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [summaryData, sortConfig]);

  // Paginera data
  const paginatedData = React.useMemo(() => {
    if (!sortedData) return [];
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil((sortedData?.length || 0) / pageSize);

  // Exportera data till Excel
  const handleExportToExcel = async () => {
    try {
      const exportData = formatDataForExport(sortedData);
      const result = await window.electronAPI.exportToExcel(
        exportData,
        'instagram-statistik-konton.xlsx'
      );
      if (result.success) {
        console.log('Export till Excel lyckades:', result.filePath);
      }
    } catch (error) {
      console.error('Export till Excel misslyckades:', error);
    }
  };

  // Exportera data till CSV
  const handleExportToCSV = async () => {
    try {
      const exportData = formatDataForExport(sortedData);
      const result = await window.electronAPI.exportToCSV(
        exportData,
        'instagram-statistik-konton.csv'
      );
      if (result.success) {
        console.log('Export till CSV lyckades:', result.filePath);
      }
    } catch (error) {
      console.error('Export till CSV misslyckades:', error);
    }
  };

  // Formatera data för export
  const formatDataForExport = (data) => {
    return data.map(account => {
      const formattedAccount = {
        'Kontonamn': getValue(account, 'account_name') || 'Unknown'
      };
      
      for (const field of selectedFields) {
        // För export använder vi fortfarande ACCOUNT_VIEW_FIELDS från dataProcessing
        // eftersom det kan innehålla mer specifika exportnamn
        const displayName = ACCOUNT_VIEW_FIELDS[field] || getDisplayName(field);
        const value = getValue(account, field);
        formattedAccount[displayName] = formatValue(value);
      }
      
      return formattedAccount;
    });
  };

  // Om inga fält är valda, visa meddelande
  if (selectedFields.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          Välj värden att visa i tabellen ovan
        </p>
      </Card>
    );
  }

  // Om data laddar, visa laddningsmeddelande
  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          Laddar data...
        </p>
      </Card>
    );
  }

  // Om ingen data finns, visa meddelande
  if (!Array.isArray(sortedData) || sortedData.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          Ingen data tillgänglig för vald period
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex justify-end space-x-2 mb-4">
        <Button
          variant="outline"
          onClick={handleExportToCSV}
          aria-label="Exportera till CSV"
        >
          <FileDown className="w-4 h-4 mr-2" />
          CSV
        </Button>
        <Button
          variant="outline"
          onClick={handleExportToExcel}
          aria-label="Exportera till Excel"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Excel
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('account_name')}
              >
                <div className="flex items-center">
                  Kontonamn {getSortIcon('account_name')}
                </div>
              </TableHead>
              {selectedFields.map(field => (
                <TableHead 
                  key={field}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort(field)}
                >
                  <div className="flex items-center justify-end">
                    {getDisplayName(field)} {getSortIcon(field)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Totalsumma-rad */}
            <TableRow className="bg-primary/5 border-b-2 border-primary/20">
              <TableCell className="font-semibold flex items-center">
                <Calculator className="w-4 h-4 mr-2 text-primary" />
                <span className="text-primary">Totalt</span>
              </TableCell>
              {selectedFields.map((field) => (
                <TableCell key={field} className="text-right font-semibold text-primary">
                  {!FIELDS_WITHOUT_TOTALS.includes(field) 
                    ? formatValue(totalSummary[field]) 
                    : ''}
                </TableCell>
              ))}
            </TableRow>

            {/* Datarader */}
            {paginatedData.map((account) => (
              <TableRow key={`${getValue(account, 'account_id')}-${getValue(account, 'account_name')}`}>
                <TableCell className="font-medium">
                  {getValue(account, 'account_name') || 'Unknown'}
                </TableCell>
                {selectedFields.map((field) => (
                  <TableCell key={field} className="text-right">
                    {formatValue(getValue(account, field))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between p-4 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Visa</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(newSize) => {
                setPageSize(Number(newSize));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-6">
            <span className="text-sm text-muted-foreground">
              Visar {((currentPage - 1) * pageSize) + 1} till {Math.min(currentPage * pageSize, sortedData?.length || 0)} av {sortedData?.length || 0}
            </span>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Föregående sida</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Nästa sida</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AccountView;