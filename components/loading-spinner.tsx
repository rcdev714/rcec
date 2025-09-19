'use client';

import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-black dark:border-gray-600"></div>
    </div>
  );
} 