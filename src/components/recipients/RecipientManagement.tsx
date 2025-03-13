
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedContainer from '../PixelatedContainer';
import AddRecipientForm from './AddRecipientForm';
import ImportOptions from './ImportOptions';
import ApiImportForm from './ApiImportForm';
import RecipientList from './RecipientList';

const RecipientManagement = () => {
  const { recipients } = useAirdrop();
  
  return (
    <PixelatedContainer className="mb-6">
      <h2 className="text-xl font-bold mb-4 text-deepsea-bright">Manage Recipients</h2>
      
      <AddRecipientForm />
      <ImportOptions />
      <ApiImportForm />
      <RecipientList recipients={recipients} />
    </PixelatedContainer>
  );
};

export default RecipientManagement;
