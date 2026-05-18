import Image from 'next/image'
import { ReactNode } from 'react'

interface AuthContainerProps {
  children: ReactNode
  title: string
}

export function AuthContainer({ children, title }: AuthContainerProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#385A4D] via-[#7EA392] to-[#C2D7CB] flex flex-col items-center justify-center p-4 font-sans">
      {/* Logo */}
      <div className="mb-7 shadow-[0_8px_24px_rgba(0,0,0,0.12)] rounded-[20px] overflow-hidden">
        <Image
          src="/logo.png"
          alt="Finza Logo"
          width={84}
          height={84}
          className="object-cover"
        />
      </div>

      {/* Card */}
      <div className="relative bg-[#CADCD6]/80 backdrop-blur-xl rounded-[24px] shadow-[0_12px_50px_rgba(0,0,0,0.05)] pt-12 pb-20 px-9 w-full max-w-[495px] border-[2.5px] border-white overflow-hidden flex flex-col">
        {/* Bright radial glow flare at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-44 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,1)_0%,_rgba(255,255,255,0)_65%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full">
          <h1 className="text-center text-[28px] font-bold mb-7 tracking-tight bg-gradient-to-r from-[#38508B] to-[#5C8AEC] bg-clip-text text-transparent select-none">
            {title}
          </h1>

          {children}
        </div>
      </div>
    </div>
  )
}
