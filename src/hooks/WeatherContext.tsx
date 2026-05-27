import { createContext, useContext, type ReactNode } from 'react'
import { useWeather } from './useWeather'

// 헤더·대시보드가 같은 날씨 상태를 공유하도록 Context로 제공
// (한 곳에서 새로고침하면 모두 함께 갱신, API 중복 호출 방지)
type WeatherCtxValue = ReturnType<typeof useWeather>

const WeatherContext = createContext<WeatherCtxValue | null>(null)

export function WeatherProvider({ children }: { children: ReactNode }) {
    const value = useWeather()
    return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>
}

export function useWeatherContext(): WeatherCtxValue {
    const ctx = useContext(WeatherContext)
    if (!ctx) {
        throw new Error('useWeatherContext must be used within a WeatherProvider')
    }
    return ctx
}
