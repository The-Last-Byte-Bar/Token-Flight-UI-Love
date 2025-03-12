
import { useWallet } from '@/context/WalletContext';
import { AirdropProvider, useAirdrop } from '@/context/AirdropContext';
import Header from '@/components/Header';
import PixelatedContainer from '@/components/PixelatedContainer';
import PixelatedButton from '@/components/PixelatedButton';
import AssetSelection from '@/components/AssetSelection';
import DistributionConfig from '@/components/DistributionConfig';
import RecipientManagement from '@/components/RecipientManagement';
import ReviewAndConfirm from '@/components/ReviewAndConfirm';
import ProgressSteps from '@/components/ProgressSteps';
import LoadingOverlay from '@/components/LoadingOverlay';
import BubbleBackground from '@/components/BubbleBackground';
import { Wallet } from 'lucide-react';

const steps = [
  { id: 1, label: 'Select Assets' },
  { id: 2, label: 'Configure' },
  { id: 3, label: 'Recipients' },
  { id: 4, label: 'Review' }
];

const AirdropContent = () => {
  const { wallet, connectWallet } = useWallet();
  const { currentStep, prevStep, nextStep, loading } = useAirdrop();
  
  if (!wallet.connected) {
    return (
      <PixelatedContainer className="text-center py-12 px-6">
        <h2 className="text-2xl font-bold mb-6 text-deepsea-bright">Welcome to Deep Sea Airdrop</h2>
        <p className="mb-8 max-w-2xl mx-auto">
          Connect your Nautilus wallet to start distributing tokens and NFTs to multiple recipients.
        </p>
        <PixelatedButton 
          onClick={connectWallet}
          className="px-6 py-3 animate-pixel-pulse"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect Nautilus Wallet
        </PixelatedButton>
      </PixelatedContainer>
    );
  }
  
  return (
    <>
      <LoadingOverlay isLoading={loading} />
      
      <ProgressSteps currentStep={currentStep} steps={steps} />
      
      {currentStep === 1 && <AssetSelection />}
      {currentStep === 2 && <DistributionConfig />}
      {currentStep === 3 && <RecipientManagement />}
      {currentStep === 4 && <ReviewAndConfirm />}
      
      <div className="flex justify-between mt-6">
        {currentStep > 1 ? (
          <PixelatedButton onClick={prevStep}>Previous</PixelatedButton>
        ) : (
          <div></div>
        )}
        
        {currentStep < 4 && (
          <PixelatedButton onClick={nextStep}>Next</PixelatedButton>
        )}
      </div>
    </>
  );
};

const Index = () => {
  return (
    <WalletProvider>
      <AirdropProvider>
        <div className="min-h-screen py-6 px-4 sm:px-6">
          <BubbleBackground />
          <div className="max-w-5xl mx-auto relative z-10">
            <Header />
            <AirdropContent />
            
            <footer className="mt-12 text-center text-sm text-deepsea-bright/60">
              <p>Deep Sea Airdrop - Distributing tokens from the depths of the Ergo blockchain</p>
            </footer>
          </div>
        </div>
      </AirdropProvider>
    </WalletProvider>
  );
};

// Add missing imports
import { WalletProvider } from '@/context/WalletContext';

export default Index;
