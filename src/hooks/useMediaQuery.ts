import { useEffect, useState } from 'react'

// CSS 미디어 쿼리 일치 여부를 반환하는 훅
// 예) const isMobile = useMediaQuery('(max-width: 639px)')  // Tailwind sm 미만
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

    useEffect(() => {
        const mql = window.matchMedia(query)
        const onChange = () => setMatches(mql.matches)
        onChange()
        mql.addEventListener('change', onChange)
        return () => mql.removeEventListener('change', onChange)
    }, [query])

    return matches
}
