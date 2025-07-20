import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-center p-4">
      <WifiOff className="h-16 w-16 text-gray-400 mb-4" />
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
        You're Offline
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">
        It seems you've lost your internet connection.
      </p>
      <p className="text-gray-600 dark:text-gray-400">
        But don't worry, you can still access pages you've already visited.
      </p>
    </div>
  );
}
