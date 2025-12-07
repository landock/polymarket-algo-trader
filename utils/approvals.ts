import { createPublicClient, http, encodeFunctionData, erc20Abi } from "viem";
import { polygon } from "viem/chains";
import {
  USDC_E_CONTRACT_ADDRESS,
  CTF_CONTRACT_ADDRESS,
  CTF_EXCHANGE_ADDRESS,
  NEG_RISK_CTF_EXCHANGE_ADDRESS,
  NEG_RISK_ADAPTER_ADDRESS,
} from "@/constants/tokens";
import { POLYGON_RPC_URL } from "@/constants/polymarket";

const MAX_UINT256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

const erc1155Abi = [
  {
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC_URL),
});

const USDC_E_SPENDERS = [
  { address: CTF_CONTRACT_ADDRESS, name: "CTF Contract" },
  { address: NEG_RISK_ADAPTER_ADDRESS, name: "Neg Risk Adapter" },
  { address: CTF_EXCHANGE_ADDRESS, name: "CTF Exchange" },
  { address: NEG_RISK_CTF_EXCHANGE_ADDRESS, name: "Neg Risk CTF Exchange" },
] as const;

const OUTCOME_TOKEN_SPENDERS = [
  { address: CTF_EXCHANGE_ADDRESS, name: "CTF Exchange" },
  { address: NEG_RISK_CTF_EXCHANGE_ADDRESS, name: "Neg Risk Exchange" },
  { address: NEG_RISK_ADAPTER_ADDRESS, name: "Neg Risk Adapter" },
] as const;

const checkUSDCApprovalForSpender = async (
  proxyAddress: string,
  spender: string
): Promise<boolean> => {
  try {
    const allowance = await publicClient.readContract({
      address: USDC_E_CONTRACT_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: "allowance",
      args: [proxyAddress as `0x${string}`, spender as `0x${string}`],
    });

    const threshold = BigInt("1000000000000");
    return allowance >= threshold;
  } catch (error) {
    console.warn(`Failed to check USDC approval for ${spender}:`, error);
    return false;
  }
};

const checkERC1155ApprovalForSpender = async (
  proxyAddress: string,
  spender: string
): Promise<boolean> => {
  try {
    const isApproved = await publicClient.readContract({
      address: CTF_CONTRACT_ADDRESS as `0x${string}`,
      abi: erc1155Abi,
      functionName: "isApprovedForAll",
      args: [proxyAddress as `0x${string}`, spender as `0x${string}`],
    });

    return isApproved;
  } catch (error) {
    console.warn(`Failed to check ERC1155 approval for ${spender}:`, error);
    return false;
  }
};

export const checkAllApprovals = async (
  proxyAddress: string
): Promise<{
  allApproved: boolean;
  usdcApprovals: Record<string, boolean>;
  outcomeTokenApprovals: Record<string, boolean>;
}> => {
  const usdcApprovals: Record<string, boolean> = {};
  const outcomeTokenApprovals: Record<string, boolean> = {};

  await Promise.all(
    USDC_E_SPENDERS.map(async ({ address, name }) => {
      usdcApprovals[name] = await checkUSDCApprovalForSpender(
        proxyAddress,
        address
      );
    })
  );

  await Promise.all(
    OUTCOME_TOKEN_SPENDERS.map(async ({ address, name }) => {
      outcomeTokenApprovals[name] = await checkERC1155ApprovalForSpender(
        proxyAddress,
        address
      );
    })
  );

  const allApproved =
    Object.values(usdcApprovals).every((approved) => approved) &&
    Object.values(outcomeTokenApprovals).every((approved) => approved);

  return {
    allApproved,
    usdcApprovals,
    outcomeTokenApprovals,
  };
};

// Transaction type compatible with RelayClient.execute()
interface ProxyTransaction {
  to: string;
  data: string;
  value: string;
}

export const createAllApprovalTxs = (): ProxyTransaction[] => {
  const txs: ProxyTransaction[] = [];

  for (const { address } of USDC_E_SPENDERS) {
    txs.push({
      to: USDC_E_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [address as `0x${string}`, BigInt(MAX_UINT256)],
      }),
      value: "0",
    });
  }

  for (const { address } of OUTCOME_TOKEN_SPENDERS) {
    txs.push({
      to: CTF_CONTRACT_ADDRESS,
      data: encodeFunctionData({
        abi: erc1155Abi,
        functionName: "setApprovalForAll",
        args: [address as `0x${string}`, true],
      }),
      value: "0",
    });
  }

  return txs;
};
