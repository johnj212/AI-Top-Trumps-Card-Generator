
import React from 'react';

interface LoaderProps {
  message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
      <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-orange-500"></div>
      <p className="mt-6 text-xl text-orange-300 font-bold tracking-wider">{message}</p>
    </div>
  );
};

export default Loader;
