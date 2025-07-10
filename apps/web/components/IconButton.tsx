import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  activated?: boolean;
}

export function IconButton({ icon, onClick, activated = false }: IconButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`p-1 sm:p-2 rounded-md ${
        activated 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } transition-colors touch-manipulation active:scale-95`}
    >
      {icon}
    </button>
  );
}
