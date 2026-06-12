import { useCallback, useEffect, useMemo, useState } from 'react'

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100] as const
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

const PAGE_SIZE_STORAGE_KEY = 'table-page-size:v1'

const pageSizeListeners = new Set<() => void>()
let sharedPageSize: PageSizeOption = DEFAULT_PAGE_SIZE

function readStoredPageSize(): PageSizeOption {
  try {
    const stored = localStorage.getItem(PAGE_SIZE_STORAGE_KEY)
    if (!stored) return DEFAULT_PAGE_SIZE
    const value = Number(stored)
    return PAGE_SIZE_OPTIONS.includes(value as PageSizeOption)
      ? (value as PageSizeOption)
      : DEFAULT_PAGE_SIZE
  } catch {
    return DEFAULT_PAGE_SIZE
  }
}

sharedPageSize = readStoredPageSize()

function notifyPageSizeListeners(): void {
  for (const listener of pageSizeListeners) listener()
}

export function usePageSize(): {
  pageSize: PageSizeOption
  setPageSize: (size: PageSizeOption) => void
  pageSizeOptions: readonly PageSizeOption[]
} {
  const [pageSize, setPageSizeState] = useState<PageSizeOption>(sharedPageSize)

  useEffect(() => {
    const listener = (): void => setPageSizeState(sharedPageSize)
    pageSizeListeners.add(listener)
    return () => {
      pageSizeListeners.delete(listener)
    }
  }, [])

  const setPageSize = useCallback((size: PageSizeOption) => {
    sharedPageSize = size
    setPageSizeState(size)
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size))
    } catch {
      // private browsing / disabled storage
    }
    notifyPageSizeListeners()
  }, [])

  return { pageSize, setPageSize, pageSizeOptions: PAGE_SIZE_OPTIONS }
}

export function paginate<T>(items: T[], page: number, pageSize: number): {
  slice: T[]
  totalPages: number
  safePage: number
  totalItems: number
} {
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    slice: items.slice(start, start + pageSize),
    totalPages,
    safePage,
    totalItems
  }
}

/** Client-side pagination with shared page size preference. */
export function useClientPagination<T>(items: T[], resetKey = ''): {
  page: number
  setPage: (page: number) => void
  slice: T[]
  totalPages: number
  totalItems: number
  pageSize: PageSizeOption
  setPageSize: (size: PageSizeOption) => void
  pageSizeOptions: readonly PageSizeOption[]
} {
  const { pageSize, setPageSize, pageSizeOptions } = usePageSize()
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [resetKey, pageSize])

  const { slice, totalPages, safePage, totalItems } = useMemo(
    () => paginate(items, page, pageSize),
    [items, page, pageSize]
  )

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  return {
    page: safePage,
    setPage,
    slice,
    totalPages,
    totalItems,
    pageSize,
    setPageSize,
    pageSizeOptions
  }
}
