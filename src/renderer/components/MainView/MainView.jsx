import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Settings } from 'lucide-react';
import AccountView from '../AccountView';
import PostView from '../PostView';
import { FileUploader } from '../FileUploader';
import { ColumnMappingEditor } from '../ColumnMappingEditor';
import { ACCOUNT_VIEW_FIELDS, POST_VIEW_FIELDS } from '@/utils/dataProcessing';

// Definiera specifika fält för per-inlägg-vyn
const POST_VIEW_AVAILABLE_FIELDS = {
  'post_reach': 'Räckvidd',
  'views': 'Visningar',
  'engagement_total': 'Interaktioner',
  'engagement_total_extended': 'Totalt engagemang (alla typer)',
  'likes': 'Gilla-markeringar',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'saves': 'Sparade',
  'follows': 'Följare'
};

// Definiera specifika fält för per-konto-vyn
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

const ValueSelector = ({ availableFields, selectedFields, onSelectionChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
    {Object.entries(availableFields).map(([key, label]) => (
      <div key={key} className="flex items-center space-x-2">
        <Checkbox
          id={key}
          checked={selectedFields.includes(key)}
          onCheckedChange={(checked) => {
            if (checked) {
              onSelectionChange([...selectedFields, key]);
            } else {
              onSelectionChange(selectedFields.filter(f => f !== key));
            }
          }}
        />
        <Label htmlFor={key}>{label}</Label>
      </div>
    ))}
  </div>
);

const MainView = ({ data, onDataProcessed }) => {
  const [selectedFields, setSelectedFields] = useState([]);
  const [activeView, setActiveView] = useState('account');
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);

  // Hämta rätt fält baserat på aktiv vy
  const getAvailableFields = () => {
    return activeView === 'account' ? ACCOUNT_VIEW_AVAILABLE_FIELDS : POST_VIEW_AVAILABLE_FIELDS;
  };

  useEffect(() => {
    if (data) {
      setSelectedFields([]);
    }
  }, [data]);

  // Ny useEffect för att hantera vybyten
  useEffect(() => {
    const availableFields = Object.keys(getAvailableFields());
    setSelectedFields(prev => prev.filter(field => availableFields.includes(field)));
  }, [activeView]);

  const handleDataUploaded = (newData) => {
    onDataProcessed(newData);
    setShowFileUploader(false);
  };

  if (showFileUploader) {
    return (
      <FileUploader 
        onDataProcessed={handleDataUploaded}
        onCancel={() => setShowFileUploader(false)}
      />
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="text-center">
          <Button 
            onClick={() => setShowFileUploader(true)}
            className="mx-auto"
          >
            Läs in ny CSV
          </Button>
        </div>
      </div>
    );
  }

  if (showColumnMapping) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setShowColumnMapping(false)}
        >
          Tillbaka till statistik
        </Button>
        <ColumnMappingEditor />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Instagram Statistik</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setShowFileUploader(true)}
            variant="outline"
          >
            Läs in ny CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowColumnMapping(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Hantera kolumnmappningar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Välj värden att visa</h2>
            <ValueSelector
              availableFields={getAvailableFields()}
              selectedFields={selectedFields}
              onSelectionChange={setSelectedFields}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          <TabsTrigger value="account">Per konto</TabsTrigger>
          <TabsTrigger value="post">Per inlägg</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountView data={data} selectedFields={selectedFields} />
        </TabsContent>

        <TabsContent value="post">
          <PostView data={data} selectedFields={selectedFields} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MainView;