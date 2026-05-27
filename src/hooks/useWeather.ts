import { useState, useEffect, useCallback } from 'react'

// OpenWeatherMap 현재 날씨 — 강화도/부평 실시간
// (날짜 비의존이라 시스템 시계와 무관하게 실제 현재 날씨를 반환)
const OWM_KEY = import.meta.env.VITE_OPENWEATHER_KEY || 'c288ab88cac094899f649d0246a57bc2'
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'

export type SkyState = 'clear' | 'cloudy' | 'rain' | 'snow' | null

export interface WeatherInfo {
    name: string
    temp: number | null
    sky: SkyState
}

// 강화도(강화군), 부평(부평구) 좌표
const LOCATIONS = [
    { key: 'ganghwa', name: '강화도', lat: 37.7470, lon: 126.4878 },
    { key: 'bupyeong', name: '부평', lat: 37.5074, lon: 126.7218 },
]

// OWM weather main → 아이콘 상태
const decodeSky = (main: string): SkyState => {
    if (!main) return null
    if (main === 'Clear') return 'clear'
    if (main === 'Clouds') return 'cloudy'
    if (main === 'Snow') return 'snow'
    if (['Rain', 'Drizzle', 'Thunderstorm'].includes(main)) return 'rain'
    return 'cloudy' // Mist/Fog/Haze 등
}

const fetchLocation = async (lat: number, lon: number): Promise<{ temp: number | null; sky: SkyState }> => {
    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        appid: OWM_KEY,
        units: 'metric',
        lang: 'kr',
    })
    const res = await fetch(`${BASE_URL}?${params}`)
    if (!res.ok) {
        const t = await res.text()
        console.warn(`[weather] OWM 응답 오류 ${res.status}:`, t.slice(0, 200))
        return { temp: null, sky: null }
    }
    const json: any = await res.json()
    const temp = typeof json?.main?.temp === 'number' ? json.main.temp : null
    const main = json?.weather?.[0]?.main || ''
    return { temp, sky: decodeSky(main) }
}

export function useWeather(autoRefreshMs = 30 * 60 * 1000) {
    const [data, setData] = useState<WeatherInfo[]>(
        LOCATIONS.map((l) => ({ name: l.name, temp: null, sky: null }))
    )
    const [loading, setLoading] = useState(false)
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const results = await Promise.all(
                LOCATIONS.map(async (l) => {
                    try {
                        const r = await fetchLocation(l.lat, l.lon)
                        return { name: l.name, temp: r.temp, sky: r.sky }
                    } catch (e) {
                        console.warn(`[weather] ${l.name} 호출 실패(CORS/네트워크 가능):`, e)
                        return { name: l.name, temp: null, sky: null }
                    }
                })
            )
            setData(results)
            setUpdatedAt(new Date())
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
        if (!autoRefreshMs) return
        const id = setInterval(refresh, autoRefreshMs)
        return () => clearInterval(id)
    }, [refresh, autoRefreshMs])

    return { data, loading, updatedAt, refresh }
}
