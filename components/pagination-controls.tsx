'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
}

export function PaginationControls({
  currentPage,
  totalPages,
}: PaginationControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const createPageURL = useCallback(
    (page: number | string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', String(page))
      return params.toString()
    },
    [searchParams],
  )

  const pageNumbersToShow = 5 // Number of page buttons to display directly
  const startPage = Math.max(1, currentPage - Math.floor(pageNumbersToShow / 2))
  const endPage = Math.min(totalPages, startPage + pageNumbersToShow - 1)

  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i,
  )

  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={() => router.push(`?${createPageURL(1)}`)}
        disabled={currentPage === 1}
        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50 dark:bg-gray-600 dark:hover:bg-gray-500"
      >
        &lt;&lt;
      </Button>
      <Button
        onClick={() => router.push(`?${createPageURL(currentPage - 1)}`)}
        disabled={currentPage === 1}
        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50 dark:bg-gray-600 dark:hover:bg-gray-500"
      >
        &lt;
      </Button>

      {startPage > 1 && (
        <span className="text-gray-700 dark:text-gray-300">...</span>
      )}

      {pages.map((page) => (
        <Button
          key={page}
          onClick={() => router.push(`?${createPageURL(page)}`)}
          className={`py-2 px-4 rounded font-bold ${
            currentPage === page
              ? 'bg-gray-800 text-white dark:bg-gray-400 dark:text-gray-900'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
          }`}
        >
          {page}
        </Button>
      ))}

      {endPage < totalPages && (
        <span className="text-gray-700 dark:text-gray-300">...</span>
      )}

      <Button
        onClick={() => router.push(`?${createPageURL(currentPage + 1)}`)}
        disabled={currentPage === totalPages}
        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50 dark:bg-gray-600 dark:hover:bg-gray-500"
      >
        &gt;
      </Button>
      <Button
        onClick={() => router.push(`?${createPageURL(totalPages)}`)}
        disabled={currentPage === totalPages}
        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50 dark:bg-gray-600 dark:hover:bg-gray-500"
      >
        &gt;&gt;
      </Button>
    </div>
  )
} 