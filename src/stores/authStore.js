import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
                    const { data, error } = await supabase
                        .from('users')
                        .select('id, user_id, name, team, rank, role, created_at')
                        .eq('user_id', id)
                        .eq('password', password)
                        .single()

                    if (error || !data) {
                        return { error: { message: '아이디 또는 비밀번호가 올바르지 않습니다.' } }
                    }

                    set({ user: data, profile: data })
                    return { data, error: null }
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

                    const { data, error } = await supabase
                        .from('users')
                        .insert([{
                            user_id: id,
                            password: password,
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
