import { NFTDistribution, NFTDistributionType } from '@/types';
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedButton from './PixelatedButton';

interface NFTDistributionFormProps {
  distribution: NFTDistribution;
}

export default function NFTDistributionForm({ distribution }: NFTDistributionFormProps) {
  const { setNFTDistributionType } = useAirdrop();
  
  const name = distribution.collection 
    ? distribution.collection.name 
    : distribution.nft?.name || 'Unknown NFT';
  
  const count = distribution.collection 
    ? distribution.collection.nfts.filter(n => n.selected).length 
    : 1;
  
  const updateDistributionType = (type: NFTDistributionType) => {
    if (distribution.collection) {
      setNFTDistributionType(distribution.collection.id, type);
    } else if (distribution.nft) {
      setNFTDistributionType(distribution.nft.id, type);
    }
  };
  
  return (
    <div className="border border-deepsea-medium bg-deepsea-dark/50 p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold">{name}</h3>
          <p className="text-sm text-deepsea-bright">
            {count} {count === 1 ? 'NFT' : 'NFTs'}
          </p>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-bold mb-2">Distribution Method</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <PixelatedButton
            onClick={() => updateDistributionType('1-to-1')}
            className={distribution.type === '1-to-1' ? 'bg-deepsea-bright' : 'bg-gray-700'}
          >
            1-to-1 Mapping
          </PixelatedButton>
          <PixelatedButton
            onClick={() => updateDistributionType('set')}
            className={distribution.type === 'set' ? 'bg-deepsea-bright' : 'bg-gray-700'}
          >
            Set Distribution
          </PixelatedButton>
          <PixelatedButton
            onClick={() => updateDistributionType('random')}
            className={distribution.type === 'random' ? 'bg-deepsea-bright' : 'bg-gray-700'}
          >
            Random
          </PixelatedButton>
        </div>
      </div>
    </div>
  );
} 