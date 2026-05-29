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

          {/* Links */}
          <div style={{ display: 'flex', gap: '28px' }}>
            {[
              { label: 'Servicios', href: '#servicios' },
              { label: 'Precios',   href: '#precios'   },
              { label: 'Nosotros',  href: '#nosotros'  },
              { label: 'Blog',      href: '#blog'      },
            ].map((item) => (
              <Link key={item.label} href={item.href} style={{ color: 'rgba(255,255,255,0.82)', fontSize: '12px', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.82)')}>
                {item.label}
              </Link>
            ))}
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

          {/* Tarjetas */}
          <div ref={heroImgRef} style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '360px', height: '420px' }}>
              <Image src="/cards.png" alt="Tarjetas Finza" fill style={{ objectFit: 'contain' }} priority />
            </div>
          </div>

          {/* Texto */}
          <div ref={heroTextRef}>
            {/* Número de tarjeta ficticio como elemento visual */}
            <div className="anim" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f0faf5',
              border: '1px solid #c8e8d8',
              borderRadius: '10px',
              padding: '8px 16px',
              marginBottom: '20px',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3ea374' }} />
              <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#1c5c43', letterSpacing: '0.12em' }}>
                4532 •••• •••• 1847
              </span>
            </div>

            <h1 className="anim" style={{ fontSize: '2.8rem', fontWeight: 800, lineHeight: 1.1, color: '#111', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Controla tus finanzas<br />con inteligencia
            </h1>
            <p className="anim" style={{ color: '#999', fontSize: '13px', lineHeight: 1.7, margin: '0 0 36px' }}>
              Gestiona tus ingresos, gastos y ahorros desde un solo lugar.<br />
              Simple, seguro y diseñado para ti.
            </p>
            <div className="anim" style={{ display: 'flex', gap: '48px' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111' }}>2M+</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>Usuarios Registrados</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111' }}>$10B+</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>Ingresos Gestionados</div>
              </div>
            </div>
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
            {/* Número de tarjeta ficticio en el banner */}
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#2a5c3a', letterSpacing: '0.2em', marginBottom: '12px', opacity: 0.7 }}>
              5182 •••• •••• 3094  ·  Válida hasta 09/28
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a2e20', margin: '0 0 8px', letterSpacing: '0.04em' }}>
              Tu futuro financiero empieza hoy
            </h2>
            <p style={{ fontSize: '11px', color: '#1a3028', letterSpacing: '0.1em', margin: '0 0 24px' }}>
              Únete a miles de personas que ya gestionan su dinero con Finza
            </p>
            <Link href="/auth/register" style={{ backgroundColor: '#0f0f0f', color: '#fff', borderRadius: '8px', padding: '10px 32px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#333')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0f0f0f')}>
              Registrarme
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════ TARJETA OSCURA + WIDGET ══════════════ */}
      <div style={cs}>
        <section ref={cardSecRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '0 0 80px', gap: '48px' }}>
          <div className="card-col" style={{ position: 'relative' }}>
            <div style={{ position: 'relative', width: '100%', height: '240px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
              <Image src="/card-dark.png" alt="Tarjeta Finza" fill style={{ objectFit: 'cover' }} />
            </div>
            {/* Widget flotante */}
            <div style={{ position: 'absolute', bottom: '-28px', right: '-12px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', padding: '14px 16px', width: '196px', zIndex: 10 }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#1a1a1a', marginBottom: '2px' }}>Actividad del Mes</div>
              <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '12px', lineHeight: 1.5 }}>Resumen de tus movimientos este mes.</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', width: '54px', height: '54px', flexShrink: 0 }}>
                  <svg viewBox="0 0 54 54" width="54" height="54" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="27" cy="27" r="21" fill="none" stroke="#e8eaed" strokeWidth="5.5" />
                    <circle cx="27" cy="27" r="21" fill="none" stroke="#3b82f6" strokeWidth="5.5" strokeDasharray="79.2 52.8" strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#1a1a1a' }}>60%</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                    <span style={{ fontSize: '9px', color: '#666' }}>Débito</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d1d5db' }} />
                    <span style={{ fontSize: '9px', color: '#666' }}>Crédito</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-col" style={{ paddingLeft: '16px' }}>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 700, color: '#111', lineHeight: 1.3, margin: '0 0 16px' }}>
              Tu camino hacia el éxito<br />financiero está en tus manos
            </h2>
            <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.7, margin: '0 0 28px' }}>
              Explora transacciones seguras y gestión de cuentas en la banca digital de Finza.
            </p>
            <button
              style={{ border: '1.5px solid #d1d5db', backgroundColor: 'transparent', borderRadius: '8px', padding: '10px 24px', fontSize: '13px', fontWeight: 600, color: '#333', cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1c5c43'; e.currentTarget.style.color = '#1c5c43' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#333' }}
            >
              Saber más
            </button>
          </div>
        </section>
      </div>

      {/* ══════════════ SERVICIOS ══════════════ */}
      <div style={cs} id="servicios">
        <section ref={servicesRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', textAlign: 'center', paddingBottom: '80px' }}>
          {[
            { label: 'Ahorro',       desc: 'Construye tu futuro con estrategias de ahorro efectivas.',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> },
            { label: 'Pagos',        desc: 'Simplifica tus pagos con banca digital segura.',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg> },
            { label: 'Inversiones',  desc: 'Invierte en línea para maximizar tus rendimientos.',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg> },
            { label: 'Préstamos',    desc: 'Accede a préstamos sin complicaciones desde tu móvil.',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /><path d="M9 12h6M12 9v6" /></svg> },
            { label: 'Seguimiento',  desc: 'Monitorea tus finanzas fácilmente con nuestra app.',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
          ].map(({ label, desc, icon }) => (
            <div key={label} className="service-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{ width: '64px', height: '64px', borderRadius: '50%', border: '1.5px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', transition: 'border-color 0.25s, box-shadow 0.25s', cursor: 'default' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3ea374'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(62,163,116,0.18)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#d1d5db'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >
                {icon}
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#111', marginBottom: '8px' }}>{label}</div>
              <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </section>
      </div>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer ref={footerRef} style={{ borderTop: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
        <div style={{ ...cs, paddingTop: '48px', paddingBottom: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '40px', marginBottom: '40px' }}>
            {/* Marca */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ position: 'relative', width: '28px', height: '28px' }}>
                  <Image src="/icon.svg" alt="Finza" fill style={{ objectFit: 'contain' }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#111' }}>Finza</span>
              </div>
              <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.8, maxWidth: '240px' }}>
                La plataforma de gestión financiera personal más completa. Controla tu dinero, ahorra más y alcanza tus metas.
              </p>
              {/* Número ficticio de muestra */}
              <div style={{ marginTop: '16px', fontFamily: 'monospace', fontSize: '11px', color: '#bbb', letterSpacing: '0.1em' }}>
                4532 •••• •••• 1847
              </div>
            </div>

            {/* Producto */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#111', marginBottom: '16px' }}>Producto</div>
              {['Características', 'Precios', 'Seguridad', 'Novedades'].map((item) => (
                <div key={item} style={{ marginBottom: '10px' }}>
                  <Link href="#" style={{ fontSize: '12px', color: '#888', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1c5c43')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#888')}>
                    {item}
                  </Link>
                </div>
              ))}
            </div>

            {/* Empresa */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#111', marginBottom: '16px' }}>Empresa</div>
              {['Nosotros', 'Blog', 'Prensa', 'Trabaja con nosotros'].map((item) => (
                <div key={item} style={{ marginBottom: '10px' }}>
                  <Link href="#" style={{ fontSize: '12px', color: '#888', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1c5c43')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#888')}>
                    {item}
                  </Link>
                </div>
              ))}
            </div>

            {/* Soporte */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#111', marginBottom: '16px' }}>Soporte</div>
              {['Centro de ayuda', 'Contacto', 'Privacidad', 'Términos de uso'].map((item) => (
                <div key={item} style={{ marginBottom: '10px' }}>
                  <Link href="#" style={{ fontSize: '12px', color: '#888', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1c5c43')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#888')}>
                    {item}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Línea inferior */}
          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#bbb' }}>
              © {new Date().getFullYear()} Finza. Todos los derechos reservados.
            </span>
            <div style={{ display: 'flex', gap: '20px' }}>
              <Link href="#" style={{ color: '#bbb', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#111')}
                onMouseLeave={e => (e.currentTarget.style.color = '#bbb')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </Link>
              <Link href="#" style={{ color: '#bbb', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#E1306C')}
                onMouseLeave={e => (e.currentTarget.style.color = '#bbb')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </Link>
              <Link href="#" style={{ color: '#bbb', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#0077B5')}
                onMouseLeave={e => (e.currentTarget.style.color = '#bbb')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
