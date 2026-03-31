'use client';

interface ModalStatusBoxProps {
  $type: 'loading' | 'error';
  $message: string;
  $onClose?: () => void;
}

const ModalStatusBox = ({ $type, $message, $onClose }: ModalStatusBoxProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-overlay">
      <div
        className={`bg-white rounded-lg p-6 w-96 text-center ${
          $type === 'error' ? 'text-red-600' : ''
        }`}
      >
        {$type === 'loading' && (
          <>
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm font-medium">{$message}</p>
          </>
        )}

        {$type === 'error' && (
          <>
            <i className="ri-error-warning-line text-4xl mb-2" />
            <p className="font-medium">{$message}</p>
            {$onClose && (
              <button
                onClick={$onClose}
                className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                닫기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ModalStatusBox;
