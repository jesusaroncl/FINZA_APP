'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

const PAGE_WIDTH = 960

export default function LandingPage() {
  /* ─── refs para GSAP ─── */
  const navRef      = useRef<HTMLDivElement>(null)
  const heroImgRef  = useRef<HTMLDivElement>(null)
  const heroTextRef = useRef<HTMLDivElement>(null)
  const bannerRef   = useRef<HTMLDivElement>(null)
  const cardSecRef  = useRef<HTMLElement>(null)
  const servicesRef = useRef<HTMLElement>(null)
  const footerRef   = useRef<HTMLElement>(null)

  useEffect(() => {
    let gsap: typeof import('gsap').gsap
    let ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger

    const init = async () => {
      const mod  = await import('gsap')
      const stMod = await import('gsap/ScrollTrigger')
      gsap = mod.gsap
      ScrollTrigger = stMod.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)

      const ease = 'power3.out'

      /* ── Navbar: desliza desde arriba ── */
      gsap.from(navRef.current, {
        y: -60, opacity: 0, duration: 0.8, ease,
      })

      /* ── Hero imagen: entra desde la izquierda + efecto flotante infinito ── */
      gsap.from(heroImgRef.current, {
        x: -80, opacity: 0, duration: 1, delay: 0.3, ease,
        onComplete: () => {
          /* Float continuo: sube y baja suavemente para siempre */
          gsap.to(heroImgRef.current, {
            y: -16,
            duration: 2.8,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          })
        },
      })

      /* ── Hero texto: entra desde la derecha ── */
      if (heroTextRef.current) {
        const els = heroTextRef.current.querySelectorAll('.anim')
        gsap.from(els, {
          x: 60, opacity: 0, duration: 0.9, stagger: 0.15, delay: 0.4, ease,
        })
      }

      /* ── Banner: fade + scale ── */
      gsap.from(bannerRef.current, {
        scrollTrigger: { trigger: bannerRef.current, start: 'top 85%' },
        scale: 0.92, opacity: 0, duration: 0.9, ease,
      })

      /* ── Sección tarjeta ── */
      if (cardSecRef.current) {
        const [left, right] = cardSecRef.current.querySelectorAll('.card-col')
        gsap.from(left, { scrollTrigger: { trigger: left, start: 'top 80%' }, x: -60, opacity: 0, duration: 0.9, ease })
        gsap.from(right, { scrollTrigger: { trigger: right, start: 'top 80%' }, x: 60, opacity: 0, duration: 0.9, ease })
      }

      /* ── Servicios: stagger ── */
      if (servicesRef.current) {
        const items = servicesRef.current.querySelectorAll('.service-item')
        gsap.from(items, {
          scrollTrigger: { trigger: servicesRef.current, start: 'top 80%' },
          y: 40, opacity: 0, duration: 0.7, stagger: 0.12, ease,
        })
      }

      /* ── Footer ── */
      gsap.from(footerRef.current, {
        scrollTrigger: { trigger: footerRef.current, start: 'top 90%' },
        y: 30, opacity: 0, duration: 0.8, ease,
      })
    }

    init()
    return () => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => ScrollTrigger.getAll().forEach(t => t.kill()))
    }
  }, [])

  const cs: React.CSSProperties = {
    width: `${PAGE_WIDTH}px`,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: '24px',
    paddingRight: '24px',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', fontFamily: 'Inter, Geist, system-ui, sans-serif', overflowX: 'hidden' }}>

      {/* ══════════════ NAVBAR ══════════════ */}
      <div ref={navRef} style={{ ...cs, paddingTop: '20px' }}>
        <nav style={{
          backgroundColor: '#1c5c43',
          borderRadius: '14px',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Solo logo, sin caja ni texto */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '32px', height: '32px' }}>
              <Image src="/icon.svg" alt="Finza" fill style={{ objectFit: 'contain' }} />
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/auth/register" style={{ backgroundColor: '#3ea374', color: '#fff', borderRadius: '8px', padding: '8px 18px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#359962')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3ea374')}>
              Registrarme
            </Link>
            <Link href="/auth/login" style={{ backgroundColor: '#fff', color: '#1c5c43', borderRadius: '8px', padding: '8px 18px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0faf5')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}>
              Ingresar
            </Link>
          </div>
        </nav>
      </div>

      {/* ══════════════ HERO ══════════════ */}
      <div style={cs}>
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '48px 0 44px', gap: '32px' }}>

          {/* Imagen */}
          <div ref={heroImgRef} style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '360px', height: '420px' }}>
              <Image src="/hero-finance.png" alt="Finza" fill style={{ objectFit: 'contain' }} priority />
            </div>
          </div>

          {/* Texto */}
          <div ref={heroTextRef}>
            <h1 className="anim" style={{ fontSize: '2.8rem', fontWeight: 800, lineHeight: 1.1, color: '#111', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Controla tus finanzas<br />con inteligencia
            </h1>
            <p className="anim" style={{ color: '#999', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
              Gestiona tus ingresos, gastos y ahorros desde un solo lugar.<br />
              Simple, seguro y diseñado para ti.
            </p>
          </div>
        </section>
      </div>

      {/* ══════════════ CTA BANNER ══════════════ */}
      <div ref={bannerRef} style={{ ...cs, paddingBottom: '48px' }}>
        <div style={{
          position: 'relative',
          width: '100%',
          height: '210px',
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <Image src="/banner-bg.png" alt="Banner Finza" fill style={{ objectFit: 'cover', objectPosition: 'center top' }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a2e20', margin: '0 0 8px', letterSpacing: '0.04em' }}>
              Tu futuro financiero empieza hoy
            </h2>
            <p style={{ fontSize: '11px', color: '#1a3028', letterSpacing: '0.1em', margin: '0 0 24px' }}>
              Únete a nosotros, predice tus gastos y controla tu dinero fácilmente
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer ref={footerRef} style={{ borderTop: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
        <div style={{ ...cs, paddingTop: '48px', paddingBottom: '32px' }}>
          {/* Marca */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ position: 'relative', width: '28px', height: '28px' }}>
                <Image src="/icon.svg" alt="Finza" fill style={{ objectFit: 'contain' }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '18px', color: '#111' }}>Finza</span>
            </div>
            <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.8, maxWidth: '240px' }}>
              La plataforma de gestión financiera personal más completa. Controla tu dinero, ahorra más y alcanza tus metas.
            </p>
          </div>

          {/* Línea inferior */}
          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '24px' }}>
            <span style={{ fontSize: '11px', color: '#bbb' }}>
              © {new Date().getFullYear()} Finza. Todos los derechos reservados.
            </span>
          </div>
        </div>
      </footer>

    </div>
  )
}
