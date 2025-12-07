export default function SessionInfo({
  isComplete,
}: {
  isComplete: boolean | undefined;
}) {
  if (isComplete) return null;

  return (
    <div className="text-sm text-gray-300 bg-blue-500/10 border border-blue-500/20 rounded p-4 mb-4">
      <p className="font-medium mb-2">What is a Trading Session?</p>
      <p className="text-xs leading-relaxed text-gray-400 mb-3">
        A trading session initializes all necessary components for gasless
        trading on Polymarket:
      </p>
      <ul className="text-xs leading-relaxed text-gray-400 space-y-1 ml-4 list-disc">
        <li>Initialize the relay and CLOB clients</li>
        <li>Create or derive the user's API credentials</li>
        <li>
          If not already approved, set all token approvals for the proxy wallet
        </li>
        <li>Automatically deploys the custom proxy wallet on token approval</li>
      </ul>
    </div>
  );
}
