import { useState, useMemo, useCallback } from 'react'

/**
 * 페이지네이션 훅
 * @param {Array} items - 전체 아이템 배열
 * @param {Object} options - 옵션
 * @param {number} options.initialPage - 시작 페이지 (기본: 1)
 * @param {number} options.pageSize - 페이지당 아이템 수 (기본: 10)
 */
export const usePagination = (items = [], options = {}) => {
    const { initialPage = 1, pageSize = 10 } = options
    const [currentPage, setCurrentPage] = useState(initialPage)

    const totalItems = items.length
    const totalPages = Math.ceil(totalItems / pageSize)

    // 페이지 범위 검증
    const validPage = useMemo(() => {
        if (currentPage < 1) return 1
        if (currentPage > totalPages && totalPages > 0) return totalPages
        return currentPage
    }, [currentPage, totalPages])

    // 현재 페이지의 아이템들
    const paginatedItems = useMemo(() => {
        const startIndex = (validPage - 1) * pageSize
        return items.slice(startIndex, startIndex + pageSize)
    }, [items, validPage, pageSize])

    // 페이지 변경
    const goToPage = useCallback((page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages || 1)))
    }, [totalPages])

    const nextPage = useCallback(() => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages))
    }, [totalPages])

    const prevPage = useCallback(() => {
        setCurrentPage(prev => Math.max(prev - 1, 1))
    }, [])

    const firstPage = useCallback(() => {
        setCurrentPage(1)
    }, [])

    const lastPage = useCallback(() => {
        setCurrentPage(totalPages || 1)
    }, [totalPages])

    // 페이지 번호 배열 생성 (현재 페이지 주변 ±2)
    const pageNumbers = useMemo(() => {
        const pages = []
        const range = 2
        const start = Math.max(1, validPage - range)
        const end = Math.min(totalPages, validPage + range)

        for (let i = start; i <= end; i++) {
            pages.push(i)
        }
        return pages
    }, [validPage, totalPages])

    return {
        items: paginatedItems,
        currentPage: validPage,
        totalPages,
        totalItems,
        pageSize,
        hasNextPage: validPage < totalPages,
        hasPrevPage: validPage > 1,
        goToPage,
        nextPage,
        prevPage,
        firstPage,
        lastPage,
        pageNumbers,
        // 인덱스 정보
        startIndex: (validPage - 1) * pageSize + 1,
        endIndex: Math.min(validPage * pageSize, totalItems)
    }
}

export default usePagination
