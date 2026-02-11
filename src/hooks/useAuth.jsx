import { useState, useEffect, createContext, useContext } from 'react'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check localStorage for existing session
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
            const userData = JSON.parse(storedUser)
            setUser(userData)
            setProfile(userData)
        }
        setLoading(false)
    }, [])

    // Login with ID/Password (bcrypt 비밀번호 비교)
    const signInWithPassword = async (id, password) => {
        try {
            // user_id로 사용자 조회 (password 포함)
            const { data, error } = await supabase
                .from('users')
                .select('id, user_id, name, team, rank, role, password, created_at')
                .eq('user_id', id)
                .single()

            if (error || !data) {
                return { error: { message: '아이디 또는 비밀번호가 올바르지 않습니다.' } }
            }

            // bcrypt 해시 여부 확인 ($2a$ 또는 $2b$ 시작)
            const isHashed = data.password && data.password.startsWith('$2')

            if (isHashed) {
                // bcrypt 해시 비교
                const isMatch = await bcrypt.compare(password, data.password)
                if (!isMatch) {
                    return { error: { message: '아이디 또는 비밀번호가 올바르지 않습니다.' } }
                }
            } else {
                // 평문 비밀번호 비교 (마이그레이션 전)
                if (data.password !== password) {
                    return { error: { message: '아이디 또는 비밀번호가 올바르지 않습니다.' } }
                }
                // 자동 마이그레이션: 평문 → bcrypt 해시로 업데이트
                const hashedPassword = await bcrypt.hash(password, 10)
                await supabase
                    .from('users')
                    .update({ password: hashedPassword })
                    .eq('user_id', id)
            }

            // password 필드 제외하고 localStorage에 저장
            const { password: _, ...userData } = data
            localStorage.setItem('user', JSON.stringify(userData))
            setUser(userData)
            setProfile(userData)

            return { data: userData, error: null }
        } catch (error) {
            return { error: { message: '로그인 중 오류가 발생했습니다.' } }
        }
    }

    // Sign out
    const signOut = async () => {
        localStorage.removeItem('user')
        setUser(null)
        setProfile(null)
        return { error: null }
    }

    // Sign up (bcrypt 해시 후 DB insert)
    const signUp = async ({ id, password, name, team, rank }) => {
        try {
            // Check if user_id already exists
            const { data: existing } = await supabase
                .from('users')
                .select('user_id')
                .eq('user_id', id)
                .single()

            if (existing) {
                return { error: { message: '이미 사용 중인 아이디입니다.' } }
            }

            // 비밀번호 해시 처리
            const hashedPassword = await bcrypt.hash(password, 10)

            // Insert new user
            const { data, error } = await supabase
                .from('users')
                .insert([{
                    user_id: id,
                    password: hashedPassword,
                    name: name,
                    team: team,
                    rank: rank,
                    role: 'user',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single()

            if (error) {
                return { error: { message: '회원가입 중 오류가 발생했습니다.' } }
            }

            return { data, error: null }
        } catch (error) {
            return { error: { message: '회원가입 중 오류가 발생했습니다.' } }
        }
    }

    // Update profile
    const updateProfile = async (updates) => {
        if (!user || !user.user_id) {
            return { data: null, error: { message: '로그인이 필요합니다.' } }
        }

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('user_id', user.user_id)
            .select()
            .single()

        if (!error && data) {
            const updatedUser = { ...user, ...data }
            localStorage.setItem('user', JSON.stringify(updatedUser))
            setUser(updatedUser)
            setProfile(updatedUser)
        }
        return { data, error }
    }

    const value = {
        user,
        profile,
        loading,
        signInWithPassword,
        signUp,
        signOut,
        updateProfile,
        isAdmin: profile?.role === 'admin',
        isSubAdmin: profile?.role === 'sub_admin'
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
