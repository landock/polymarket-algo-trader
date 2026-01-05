import { formatUnits } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from '../providers/WalletProvider';
import { USDC_E_CONTRACT_ADDRESS, USDC_E_ERC20ABI } from '../constants/tokens';

export default function usePolygonBalances(walletAddress: string | null) {
  const { publicClient } = useWallet();

  const {
    data: usdcBalance,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["usdcBalance", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;

      return await publicClient.readContract({
        address: USDC_E_CONTRACT_ADDRESS,
        abi: USDC_E_ERC20ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });
    },
    enabled: !!walletAddress,
    staleTime: 2_000,
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const formattedUsdcBalance = usdcBalance
    ? parseFloat(formatUnits(usdcBalance, 6))
    : 0;

  return {
    usdcBalance: formattedUsdcBalance,
    formattedUsdcBalance: formattedUsdcBalance.toFixed(2),
    rawUsdcBalance: usdcBalance,
    isLoading,
    isError: !!error,
  };
}
