const unsupported = (action: string) => {
  throw new Error(`JSON wallet ${action} is not supported in extension builds.`);
};

export const decryptCrowdsale = () => unsupported('decryption');
export const decryptKeystore = () => unsupported('decryption');
export const decryptKeystoreSync = () => unsupported('decryption');
export const encryptKeystore = () => unsupported('encryption');
export const getJsonWalletAddress = () => unsupported('inspection');

export const isCrowdsaleWallet = () => false;
export const isKeystoreWallet = () => false;

export const decryptJsonWallet = () => unsupported('decryption');
export const decryptJsonWalletSync = () => unsupported('decryption');
