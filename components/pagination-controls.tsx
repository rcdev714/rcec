'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

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
    <div className="flex items-center space-x-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`?${createPageURL(1)}`)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronsLeft size={14} />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`?${createPageURL(currentPage - 1)}`)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft size={14} />
      </Button>

      {startPage > 1 && (
        <span className="px-2 text-xs text-muted-foreground">...</span>
      )}

      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="sm"
          onClick={() => router.push(`?${createPageURL(page)}`)}
          className="h-8 min-w-8 text-xs"
        >
          {page}
        </Button>
      ))}

      {endPage < totalPages && (
        <span className="px-2 text-xs text-muted-foreground">...</span>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`?${createPageURL(currentPage + 1)}`)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronRight size={14} />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`?${createPageURL(totalPages)}`)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronsRight size={14} />
      </Button>
    </div>
  )
} 