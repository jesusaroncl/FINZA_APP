'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, User, Upload, X } from 'lucide-react'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg' }
const PRESET_AVATARS = [1, 2, 3, 4, 5, 6].map((n) => `/avatars/avatar-${n}.svg`)

function revokeBlob(url: string) {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

export default function SettingsPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (error) throw error

        if (data) {
          setFirstName(data.first_name || '')
          setLastName(data.last_name || '')
          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url)
            setPreviewUrl(data.avatar_url)
          }
        } else {
          setFirstName(user.user_metadata?.first_name || '')
          setLastName(user.user_metadata?.last_name || '')
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [supabase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (!ALLOWED_TYPES[file.type]) {
        setMessage({ type: 'error', text: 'Formato no permitido. Usa JPG o PNG.' })
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      if (file.size > MAX_AVATAR_BYTES) {
        setMessage({ type: 'error', text: 'La imagen supera 2MB.' })
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      revokeBlob(previewUrl)
      setSelectedPreset(null)
      setMessage(null)
      setAvatarFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSelectPreset = (url: string) => {
    revokeBlob(previewUrl)
    setAvatarFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setSelectedPreset(url)
    setPreviewUrl(url)
    setMessage(null)
  }

  const handleRemoveFile = () => {
    revokeBlob(previewUrl)
    setAvatarFile(null)
    setSelectedPreset(null)
    setPreviewUrl(avatarUrl) // Volver a la original
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No usuario autenticado')

      let finalAvatarUrl = avatarUrl

      // Si hay un archivo nuevo, lo subimos
      if (avatarFile) {
        const ext = ALLOWED_TYPES[avatarFile.type]
        const filePath = `${user.id}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: false, contentType: avatarFile.type })

        if (uploadError) {
          setMessage({ type: 'error', text: 'No se pudo subir la imagen. Intenta de nuevo.' })
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)
          
        finalAvatarUrl = publicUrl
      } else if (selectedPreset) {
        finalAvatarUrl = selectedPreset
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
          ...(finalAvatarUrl ? { avatar_url: finalAvatarUrl } : {}),
        }, { onConflict: 'id' })
        .select('id, avatar_url')
        .maybeSingle()

      if (error || !data) {
        setMessage({ type: 'error', text: 'No se pudo actualizar el perfil. Intenta de nuevo.' })
        return
      }

      revokeBlob(previewUrl)
      setAvatarUrl(data.avatar_url ?? finalAvatarUrl)
      setPreviewUrl(data.avatar_url ?? finalAvatarUrl)
      setAvatarFile(null)
      setSelectedPreset(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' })
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'No se pudo actualizar el perfil. Intenta de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#1D4ED8] animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] px-8 pt-7 pb-8">
      <div className="w-full max-w-3xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-[#0F172A] tracking-tight">
            Configuración
          </h1>
          <p className="text-gray-500 mt-1">
            Actualiza tu información personal y foto de perfil.
          </p>
        </div>

        <div className="bg-white rounded-[28px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50">
          <form onSubmit={handleSave} className="space-y-6">
            
            <div className="flex flex-col md:flex-row gap-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div
                    className="w-32 h-32 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 relative group"
                    role="button"
                    tabIndex={0}
                    aria-label="Cambiar foto de perfil"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className="text-slate-400" />
                    )}
                    
                    <div 
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Upload className="text-white" size={24} />
                    </div>
                  </div>
                  {(avatarFile || selectedPreset) && (
                    <button 
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Subir nueva foto
                </button>
                <p className="text-xs text-center text-gray-400 max-w-[140px]">
                  Formatos recomendados: JPG, PNG. Max 2MB.
                </p>
                <p className="text-xs font-semibold text-gray-500 mt-2">O elige un avatar</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      aria-label={`Avatar ${i + 1}`}
                      aria-pressed={selectedPreset === url}
                      onClick={() => handleSelectPreset(url)}
                      className={`rounded-full ${selectedPreset === url ? 'ring-2 ring-[#1D4ED8] ring-offset-2' : ''}`}
                    >
                      <img src={url} alt="" className="w-10 h-10 rounded-full" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="flex-1 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Nombre</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-gray-50/50"
                      placeholder="Tu nombre"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Apellido</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-gray-50/50"
                      placeholder="Tu apellido"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
              <div>
                {message && (
                  <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {message.text}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-[#1D4ED8] hover:bg-blue-800 text-white rounded-xl font-semibold transition-colors disabled:opacity-70"
              >
                {saving ? (
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-white animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
