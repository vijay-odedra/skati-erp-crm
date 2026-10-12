import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div
        className="w-9 h-9 border-3 border-[#D9EAF0] border-t-[#087EA4] rounded-full animate-spin mb-3"
        style={{
          borderWidth: '3px',
          borderStyle: 'solid',
          borderColor: '#D9EAF0',
          borderTopColor: '#087EA4',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span className="text-sm font-medium text-[#64748B] tracking-wide">
        {message}
      </span>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#F4FAFC',
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};
