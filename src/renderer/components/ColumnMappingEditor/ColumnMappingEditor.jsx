import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Save, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { 
  readColumnMappings, 
  saveColumnMappings, 
  DISPLAY_NAMES, 
  COLUMN_GROUPS,
  getAllKnownNamesForField,
  clearMappingsCache
} from './columnMappingService';

export function ColumnMappingEditor() {
  const [mappings, setMappings] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showExamples, setShowExamples] = useState({});

  // Ladda mappningar när komponenten monteras
  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    console.log('ColumnMappingEditor: Börjar ladda mappningar');
    setIsLoading(true);
    
    try {
      const data = await readColumnMappings();
      console.log('ColumnMappingEditor: Laddade mappningar:', data);
      setMappings(data);
      setError(null);
    } catch (err) {
      console.error('ColumnMappingEditor: Fel vid laddning:', err);
      setError('Kunde inte ladda kolumnmappningar: ' + err.message);
    } finally {
      setIsLoading(false);
      console.log('ColumnMappingEditor: Laddning slutförd');
    }
  };

  const handleSave = async () => {
    console.log('ColumnMappingEditor: Börjar spara ändringar');
    console.log('ColumnMappingEditor: Mappningar att spara:', mappings);
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Spara mappningarna
      await saveColumnMappings(mappings);
      console.log('ColumnMappingEditor: Sparning lyckades');
      
      // Rensa cachen för att säkerställa att alla komponenter får de nya mappningarna
      clearMappingsCache();
      
      // Visa framgångsmeddelande
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 10000);
    } catch (err) {
      console.error('ColumnMappingEditor: Fel vid sparning:', err);
      setError('Kunde inte spara ändringarna: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleValueChange = (originalName, newValue) => {
    if (!newValue.trim()) {
      setError('Kolumnnamn kan inte vara tomt');
      return;
    }
    
    console.log('ColumnMappingEditor: Ändrar mappning');
    console.log('Från:', originalName);
    console.log('Till:', newValue);
    
    setMappings(prev => {
      // Skapa en kopia av tidigare mappningar
      const newMappings = { ...prev };
      
      // Spara det interna namnet som denna kolumn ska mappa till
      const internalName = newMappings[originalName];
      
      // Ta bort den gamla mappningen
      delete newMappings[originalName];
      
      // Lägg till den nya mappningen
      newMappings[newValue] = internalName;
      
      console.log('ColumnMappingEditor: Nya mappningar:', newMappings);
      return newMappings;
    });
  };

  // Hjälpfunktion för att visa alla möjliga kolumnnamn för ett fält
  const toggleExamples = (internalName) => {
    setShowExamples(prev => ({
      ...prev,
      [internalName]: !prev[internalName]
    }));
  };
  
  // Hantera klick på ett exempel för att kopiera det till input
  const handleExampleClick = (exampleName, originalName) => {
    handleValueChange(originalName, exampleName);
  };

  // Hämtar ordnade mappningar för en grupp
  const getOrderedMappingsForGroup = (internalNames) => {
    // Skapa en omvänd mappning (internt namn -> originalnamn)
    const internalToOriginal = Object.entries(mappings).reduce((acc, [original, internal]) => {
      acc[internal] = original;
      return acc;
    }, {});

    // Returnera mappningar i ordningen som specificerats av internalNames
    return internalNames
      .map(internalName => ({
        originalName: internalToOriginal[internalName],
        internalName: internalName
      }))
      .filter(mapping => mapping.originalName !== undefined);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p>Laddar kolumnmappningar...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hantera kolumnmappningar</CardTitle>
        <div className="text-sm text-muted-foreground">
          <div className="mb-4">
            När Meta ändrar kolumnnamn i exportfilerna behöver du uppdatera mappningarna här.
            Följ dessa steg:
          </div>
          <div className="ml-4 space-y-2">
            <div className="flex gap-2">
              <span>1.</span>
              <span>Ladda upp en ny CSV-fil från Meta</span>
            </div>
            <div className="flex gap-2">
              <span>2.</span>
              <span>Om filen inte kan läsas in, notera vilka kolumner som saknas</span>
            </div>
            <div className="flex gap-2">
              <span>3.</span>
              <span>Hitta kolumnen med det gamla namnet i <strong>Original kolumnnamn från Meta</strong> och ändra det till det nya namnet som Meta nu använder</span>
            </div>
            <div className="flex gap-2">
              <span>4.</span>
              <span>Klicka på Spara ändringar</span>
            </div>
            <div className="flex gap-2">
              <span>5.</span>
              <span className="font-semibold">VIKTIGT: Gå tillbaka och läs in CSV-filen igen. Dina ändringar börjar inte gälla förrän du läser in CSV-filen på nytt.</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive" className="animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fel</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200 animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Ändringar sparade</AlertTitle>
              <AlertDescription className="text-green-700">
                <div className="space-y-2">
                  <p>Ändringarna har sparats.</p>
                  <p className="font-semibold">Du måste nu gå tillbaka och läs in CSV-filen igen för att ändringarna ska börja gälla.</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {Object.entries(COLUMN_GROUPS).map(([groupName, internalNames]) => (
            <div key={groupName}>
              <h3 className="text-lg font-semibold mb-2">{groupName}</h3>
              <div className="rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visningsnamn</TableHead>
                      <TableHead>Original kolumnnamn från Meta</TableHead>
                      <TableHead>Internt namn (ändra ej)</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getOrderedMappingsForGroup(internalNames).map(({ originalName, internalName }) => (
                      <React.Fragment key={internalName}>
                        <TableRow>
                          <TableCell className="font-medium">
                            {DISPLAY_NAMES[internalName]}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={originalName}
                              onChange={(e) => handleValueChange(originalName, e.target.value)}
                              className="max-w-sm"
                              disabled={isSaving}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {internalName}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toggleExamples(internalName)}
                              title="Visa exempel på vanliga kolumnnamn"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        
                        {/* Visa exempel på möjliga kolumnnamn om användaren klickar på info-knappen */}
                        {showExamples[internalName] && (
                          <TableRow>
                            <TableCell colSpan={4} className="bg-slate-50">
                              <div className="p-2 text-sm">
                                <p className="font-medium mb-1">Vanliga kolumnnamn för detta fält:</p>
                                <ul className="list-disc list-inside pl-2 text-gray-600">
                                  {getAllKnownNamesForField(internalName).map((name, i) => (
                                    <li key={i} 
                                        className="hover:text-blue-500 cursor-pointer"
                                        onClick={() => handleExampleClick(name, originalName)}>
                                      {name}
                                    </li>
                                  ))}
                                </ul>
                                <p className="mt-2 text-xs text-gray-500">
                                  Klicka på något av namnen ovan för att kopiera direkt till fältet.
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="min-w-[100px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sparar...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Spara ändringar
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}