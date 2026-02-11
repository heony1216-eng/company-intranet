import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            profile: null,
            loading: true,

            // Computed
            get isAdmin() {
                return get().profile?.role === 'admin'
            },
            get isSubAdmin() {
                return get().profile?.role === 'sub_admin'
            },
            get canManage() {
                const profile = get().profile
                return profile?.role === 'admin' || profile?.role === 'sub_admin'
            },

            // Actions
            setLoading: (loading) => set({ loading }),

            signInWithPassword: async (id, password) => {
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

                    // bcrypt 해시 여부 확인
                    const isHashed = data.password && data.password.startsWith('$2')

                    if (isHashed) {
                        const isMatch = await bcrypt.compare(password, data.password)
                        if (!isMatch) {
                            return { error: { message: '아이디 또는 비밀번호가 올바르지 않습니다.' } }
                        }
                    } else {
                        if (data.password !== password) {
                            return { error: { message: '아이디 또는 비밀번호가 올바르지 않습니다.' } }
                        }
                        // 자동 마이그레이션: 평문 → bcrypt
                        const hashedPassword = await bcrypt.hash(password, 10)
                        await supabase
                            .from('users')
                            .update({ password: hashedPassword })
                            .eq('user_id', id)
                    }

                    // password 필드 제외
                    const { password: _, ...userData } = data
                    set({ user: userData, profile: userData })
                    return { data: userData, error: null }
                } catch (error) {
                    return { error: { message: '로그인 중 오류가 발생했습니다.' } }
                }
            },

            signOut: async () => {
                set({ user: null, profile: null })
                return { error: null }
            },

            signUp: async ({ id, password, name, team, rank }) => {
                try {
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
            },

            updateProfile: async (updates) => {
                const { user } = get()
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
                    set({ user: updatedUser, profile: updatedUser })
                }
                return { data, error }
            },

            initializeAuth: () => {
                set({ loading: false })
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, profile: state.profile })
        }
    )
)

export default useAuthStore
