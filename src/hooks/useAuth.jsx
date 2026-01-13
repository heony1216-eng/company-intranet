import { useState, useEffect, createContext, useContext } from 'react'
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

    // Login with ID/Password (direct DB check)
    const signInWithPassword = async (id, password) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', id)
                .eq('password', password)
                .single()

            if (error || !data) {
                return { error: { message: '아이디 또는 비밀번호가 올바르지 않습니다.' } }
            }

            // Save to localStorage
            localStorage.setItem('user', JSON.stringify(data))
            setUser(data)
            setProfile(data)

            return { data, error: null }
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

    // Sign up (direct DB insert)
    const signUp = async ({ id, password, name, position, rank }) => {
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

            // Insert new user
            const { data, error } = await supabase
                .from('users')
                .insert([{
                    user_id: id,
                    password: password,
                    name: name,
                    position: position,
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
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('user_id', user.user_id)
            .select()
            .single()

        if (!error) {
            const updatedUser = { ...user, ...data }
            localStorage.setItem('user', JSON.stringify(updatedUser))
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
        isAdmin: profile?.role === 'admin'
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
