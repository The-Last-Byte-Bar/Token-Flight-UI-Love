
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedButton from '../PixelatedButton';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

const ImportOptions = () => {
  const { importRecipients } = useAirdrop();
  
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n');
        const newRecipients = lines
          .filter(line => line.trim())
          .map(line => {
            const parts = line.split(',');
            return {
              id: Date.now() + Math.random().toString(),
              address: parts[0].trim(),
              name: parts[1]?.trim() || undefined
            };
          });
        
        importRecipients(newRecipients);
        toast.success(`${newRecipients.length} recipients imported`);
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import recipients. Check file format.');
      }
    };
    reader.readAsText(file);
  };
  
  return (
    <div className="mb-6">
      <div className="relative">
        <input
          type="file"
          id="file-upload"
          className="absolute inset-0 opacity-0 cursor-pointer"
          accept=".csv,.txt,.json"
          onChange={handleImport}
        />
        <PixelatedButton variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import CSV/JSON
        </PixelatedButton>
      </div>
    </div>
  );
};

export default ImportOptions;
