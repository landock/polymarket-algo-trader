import { encodeFunctionData } from "viem";
import {
  USDC_E_CONTRACT_ADDRESS,
  CTF_CONTRACT_ADDRESS,
} from '../constants/tokens';

const ctfAbi = [
  {
    inputs: [
      { name: "collateralToken", type: "address" },
      { name: "parentCollectionId", type: "bytes32" },
      { name: "conditionId", type: "bytes32" },
      { name: "indexSets", type: "uint256[]" },
    ],
    name: "redeemPositions",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export interface RedeemParams {
  conditionId: string;
  outcomeIndex: number;
}

export interface RedeemTx {
  to: string;
  data: string;
  value: string;
}

export const createRedeemTx = (params: RedeemParams): RedeemTx => {
  const { conditionId, outcomeIndex } = params;

  const parentCollectionId = "0x" + "0".repeat(64);
  const indexSet = BigInt(1 << outcomeIndex);

  const data = encodeFunctionData({
    abi: ctfAbi,
    functionName: "redeemPositions",
    args: [
      USDC_E_CONTRACT_ADDRESS as `0x${string}`,
      parentCollectionId as `0x${string}`,
      conditionId as `0x${string}`,
      [indexSet],
    ],
  });

  return {
    to: CTF_CONTRACT_ADDRESS,
    data,
    value: "0",
  };
};
