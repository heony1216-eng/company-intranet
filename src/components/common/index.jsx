import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    className = '',
    ...props
}) => {
    const baseStyles = 'font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'

    const variants = {
        primary: 'bg-toss-blue text-white hover:bg-toss-blue-dark',
        secondary: 'bg-toss-gray-100 text-toss-gray-800 hover:bg-toss-gray-200',
        ghost: 'bg-transparent text-toss-gray-600 hover:bg-toss-gray-100',
        danger: 'bg-red-500 text-white hover:bg-red-600'
    }

    const sizes = {
        sm: 'py-2 px-4 text-sm rounded-toss',
        md: 'py-3 px-6 rounded-toss',
        lg: 'py-4 px-8 text-lg rounded-toss-lg'
    }

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {children}
        </button>
    )
}

export const Input = ({
    label,
    type = 'text',
    error,
    className = '',
    ...props
}) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    type={isPassword && showPassword ? 'text' : type}
                    className={`w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss text-toss-gray-900 placeholder-toss-gray-500 focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all ${error ? 'ring-2 ring-red-500' : ''} ${className}`}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-toss-gray-500 hover:text-toss-gray-700"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
        </div>
    )
}

export const Card = ({
    children,
    className = '',
    padding = 'p-6',
    ...props
}) => {
    return (
        <div
            className={`bg-white rounded-toss-lg shadow-toss ${padding} ${className}`}
            {...props}
        >
            {children}
        </div>
    )
}

export const Modal = ({
    isOpen,
    onClose,
    title,
    children
}) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-toss-lg shadow-toss-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between p-6 border-b border-toss-gray-100">
                    <h2 className="text-xl font-bold text-toss-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-toss-gray-500 hover:text-toss-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}

export { default as ImageGallery } from './ImageGallery'
