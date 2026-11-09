export default function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600 text-sm font-medium">{message}</p>
    </div>
  );
}
