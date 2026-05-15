import { InputHTMLAttributes, forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  showPasswordToggle?: boolean
  showPassword?: boolean
  onPasswordToggle?: () => void
  error?: string
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      label,
      showPasswordToggle,
      showPassword,
      onPasswordToggle,
      error,
      type,
      className,
      ...props
    },
    ref
  ) => {
    const isPasswordField = type === 'password'

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={isPasswordField && showPassword ? 'text' : type}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              error ? 'border-red-500' : ''
            } ${className || ''}`}
            {...props}
          />
          {showPasswordToggle && isPasswordField && (
            <button
              type="button"
              onClick={onPasswordToggle}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-1">{error}</p>
        )}
      </div>
    )
  }
)

AuthInput.displayName = 'AuthInput'
