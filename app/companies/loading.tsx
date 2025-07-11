import LoadingSpinner from "@/components/loading-spinner";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <LoadingSpinner />
      <p className="text-gray-600 dark:text-gray-400 mt-4">Loading companies...</p>
    </div>
  );
} 