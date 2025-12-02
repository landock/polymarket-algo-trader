export default function SessionInfo({
  isComplete,
}: {
  isComplete: boolean | undefined;
}) {
  if (isComplete) return null;

  return (
    <div className="text-sm text-gray-300 bg-blue-500/10 border border-blue-500/20 rounded p-4 mb-4">
      <p className="font-medium mb-2">What is a Trading Session?</p>
      <p className="text-medium leading-relaxed text-gray-400 mb-3">
        A trading session pertaining to a Magic Link user who imports their PK
        involves initializing the CLOB client with the user's API credentials.
        The user must have previously logged into polymarket.com and made at
        least one trade for the custom proxy wallet to have been deployed with
        token approvals set.
      </p>
    </div>
  );
}
