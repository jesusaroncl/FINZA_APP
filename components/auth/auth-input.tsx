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
            className={`w-full px-5 py-[16px] bg-white border border-gray-200/40 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#587FD9] text-[14px] text-black placeholder-black/90 ${
              error ? 'ring-2 ring-red-500' : ''
            } ${className || ''}`}
            {...props}
          />
          {showPasswordToggle && isPasswordField && (
            <button
              type="button"
              onClick={onPasswordToggle}
              className="absolute right-5 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] opacity-70 focus:outline-none"
            >
              {showPassword ? (
                <Eye size={20} strokeWidth={1.2} />
              ) : (
                <EyeOff size={20} strokeWidth={1.2} />
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
