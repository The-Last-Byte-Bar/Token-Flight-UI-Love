
import WalletConnect from './WalletConnect';
import PixelatedContainer from './PixelatedContainer';

const Header = () => {
  return (
    <PixelatedContainer className="mb-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-deepsea-bright flex items-center justify-center pixel-border">
          <span className="text-xl text-deepsea-dark">🌊</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-deepsea-bright tracking-wider">
          Deep Sea Airdrop
        </h1>
      </div>
      
      <WalletConnect />
    </PixelatedContainer>
  );
};

export default Header;
