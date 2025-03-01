import React, { useState } from 'react';
import { FileUploader } from "./components/FileUploader";
import MainView from "./components/MainView";
import { Alert, AlertDescription } from "./components/ui/alert";
import { InfoIcon } from "lucide-react";

function App() {
  const [processedData, setProcessedData] = useState(null);
  const [showFileUploader, setShowFileUploader] = useState(true);
  
  const handleDataProcessed = (data) => {
    setProcessedData(data);
    setShowFileUploader(false);
    console.log('Data processerad:', data);
  };

  const handleCancel = () => {
    if (processedData) {
      setShowFileUploader(false);
    }
  };

  // Kontrollera om det finns dublettinformation
  const hasDuplicateInfo = processedData?.meta?.stats?.duplicates > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container py-4">
          <h1 className="text-2xl font-bold text-foreground">
            Instagram Statistik
          </h1>
        </div>
      </header>

      <main className="container py-6">
        <div className="grid gap-6">
          {showFileUploader ? (
            <FileUploader 
              onDataProcessed={handleDataProcessed} 
              onCancel={handleCancel}
            />
          ) : (
            <>
              {hasDuplicateInfo && (
                <Alert variant="info" className="bg-blue-50 border-blue-200">
                  <InfoIcon className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    {processedData.meta.stats.duplicates} dubletter hittades och har filtrerats bort. Dessa räknas inte in i resultaten.
                  </AlertDescription>
                </Alert>
              )}
              <MainView 
                data={processedData.rows} 
                onDataProcessed={handleDataProcessed}
              />
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="container py-4 text-center text-sm text-muted-foreground">
          Instagram Statistik © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

export default App;