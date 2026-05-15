import Image from 'next/image'
import { ReactNode } from 'react'

interface AuthContainerProps {
  children: ReactNode
  title: string
}

export function AuthContainer({ children, title }: AuthContainerProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-600 to-teal-700 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/finza-logo.jpg"
          alt="Finza Logo"
          width={60}
          height={60}
          className="rounded-lg"
        />
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-center text-2xl font-semibold text-blue-600 mb-6">
          {title}
        </h1>

        {children}
      </div>
    </div>
  )
}
