'use client';

import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-500 dark:border-red-300"></div>
    </div>
  );
} 