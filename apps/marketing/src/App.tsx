import React, { useState } from 'react';
import { Button, Card, Badge, Icon } from '@paic/ui';
import { PLANS, formatCOP, getPlanCapacityText } from '@paic/types/plans';
import { analytics } from '@paic/analytics';
import './App.css';

const NavLinks = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#cobro', label: 'Cobro' },
  { href: '#tareas', label: 'Tareas' },
  { href: '#informes', label: 'Informes' },
  { href: '#planes', label: 'Planes' },
];

export default function MarketingApp() {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setShowMobileMenu(false);
  };

  const handlePlanClick = (plan: typeof PLANS[0], period: 'monthly' | 'annual') => {
    const link = period === 'annual' ? plan.annualLink : plan.monthlyLink;
    if (link) {
      analytics.trackFeature('pricing', 'click_cta', `${plan.name}_${period}`);
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="NavegaciÃ³n principal">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo-paic.png" alt="Logo PAIC" className="w-8 h-8" />
              <span className="text-xl font-bold text-blue-900">PAIC</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {NavLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); scrollTo(link.href.slice(1)); }}
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => scrollTo('planes')}>
                Prueba Gratis 14 dÃ­as
              </Button>
              <Button variant="primary" size="sm" onClick={() => scrollTo('planes')}>
                Iniciar Prueba
              </Button>
            </div>

            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="MenÃº"
              aria-expanded={showMobileMenu}
            >
              <Icon name={showMobileMenu ? 'x' : 'menu'} className="w-6 h-6" />
            </button>
          </div>

          {showMobileMenu && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <div className="flex flex-col gap-3">
                {NavLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => { e.preventDefault(); scrollTo(link.href.slice(1)); }}
                    className="text-base font-medium text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="ghost" className="w-full" onClick={() => scrollTo('planes')}>
                    Prueba Gratis 14 dÃ­as
                  </Button>
                  <Button variant="primary" className="w-full" onClick={() => scrollTo('planes')}>
                    Iniciar Prueba
                  </Button>
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>

      <main>
        <section id="inicio" className="relative pt-32 pb-20 lg:pt-48 lg:pb-28 overflow-hidden">
          <canvas className="absolute inset-0 -z-10" data-effect="particles" aria-hidden="true" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="text-center lg:text-left">
                <Badge variant="info" className="mb-4 inline-flex" dot>Novedad: IA Asistente</Badge>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                  Administra con{' '}
                  <span className="text-blue-600">Inteligencia</span>.
                  {' '}Recupera tu Tiempo.
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                  PAIC es su Plataforma de AdministraciÃ³n Inteligente de Copropiedades.
                  Deje de hacer Excel, empiece a hacer gestiÃ³n.
                </p>
                <ul className="space-y-3 mb-8 max-w-xl mx-auto lg:mx-0">
                  {[
                    'Cero Mora â€” Comunicaciones automÃ¡ticas y precisas.',
                    'Informes al Instante â€” Pregunte y obtenga respuestas en segundos.',
                    'GestiÃ³n 24/7 â€” Reservas, seguridad y vencimientos centralizados.',
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-700 text-base justify-center lg:justify-start">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                        <Icon name="checkSquare" className="w-4 h-4" />
                      </span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => scrollTo('planes')}
                    rightIcon={<Icon name="send" className="w-4 h-4" />}
                  >
                    Iniciar Prueba Gratuita Ahora â€” 14 dÃ­as
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="relative aspect-video max-w-md mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl blur-2xl" />
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-2xl">
                    <iframe
                      title="Demo PAIC"
                      width="100%"
                      height="100%"
                      src="https://www.youtube.com/embed/N-42ptIn9BU"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded-2xl"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl" aria-hidden="true" />
                <div className="absolute -top-10 -right-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-xl">
              <img
                src="/paic_home.png"
                alt="Vista general de PAIC - Dashboard principal"
                className="w-full h-auto"
              />
            </div>
          </div>
        </section>

        <section id="cobro" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-xl">
                <img
                  src="/paic_mora.png"
                  alt="PAIC cobro inteligente"
                  className="w-full h-auto"
                />
              </div>
              <div className="text-center lg:text-left">
                <Badge variant="warning" className="mb-4 inline-flex" dot>MÃ³dulo: Cobro</Badge>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
                  Â¿Mora que Ahorca? Deje que la <span className="text-blue-600">IA cobre por usted.</span>
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  El cobro es incÃ³modo, consume tiempo y deteriora relaciones.
                  PAIC transforma la obligaciÃ³n en un proceso profesional y automatizado.
                </p>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Funcionalidad Clave: Comunicaciones de Cobro Inteligentes</h3>
                <p className="text-gray-600 mb-6">
                  PAIC identifica deudores y genera avisos con la formalidad exacta vÃ­a correo o WhatsApp,
                  liberÃ¡ndolo de la confrontaciÃ³n.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Reduce la cartera vencida en un 30% promedio.',
                    'DocumentaciÃ³n automÃ¡tica para procesos legales.',
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-700">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Icon name="checkSquare" className="w-4 h-4" />
                      </span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="primary" size="lg" onClick={() => scrollTo('planes')}>
                  Â¡Prueba PAIC Gratis por 14 DÃ­as!
                </Button>
              </div>
            </div>

            <div className="mt-16 grid md:grid-cols-2 gap-6">
              {[
                { title: 'ComunicaciÃ³n AutomÃ¡tica', desc: 'Mensajes con tono y formalidad adecuados segÃºn la etapa del cobro.', icon: 'mail' },
                { title: 'HistÃ³rico y Evidencia', desc: 'Registro completo para auditar y usar en procesos legales.', icon: 'file-text' },
              ].map((feature, i) => (
                <Card key={i} className="h-full" padding="lg" hover>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                    <Icon name={feature.icon} className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="tareas" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="info" className="mb-4 inline-flex" dot>MÃ³dulo: Tareas</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                GestiÃ³n de <span className="text-blue-600">Tareas y Seguimiento</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Crea, asigna y da seguimiento a tareas del dÃ­a a dÃ­a. Recibe alertas automÃ¡ticas y mantÃ©n todo bajo control.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: 'CreaciÃ³n RÃ¡pida', desc: 'Agrega tareas en segundos desde el dashboard o el chatbot.', icon: 'checkSquare' },
                { title: 'Alertas Inteligentes', desc: 'Notificaciones automÃ¡ticas por vencimiento y prioridad.', icon: 'alert-triangle' },
                { title: 'Historial Completo', desc: 'Visualiza tareas completadas, pendientes y por responsable.', icon: 'database' },
              ].map((feature, i) => (
                <Card key={i} className="h-full text-center" padding="lg" hover>
                  <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
                    <Icon name={feature.icon} className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="informes" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="success" className="mb-4 inline-flex" dot>MÃ³dulo: Informes</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                Informes al <span className="text-blue-600">Instante</span> con IA
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                PregÃºntele al chatbot quÃ© necesita saber (gastos, saldos, mora, ocupaciÃ³n) y obtenga la respuesta en segundos.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: 'Chat con Datos', desc: 'Consulta en lenguaje natural: "Â¿CuÃ¡nto debemos en servicios?"', icon: 'bot' },
                { title: 'ExportaciÃ³n', desc: 'Descarga reportes en Excel/PDF con un clic.', icon: 'file-text' },
                { title: 'Dashboards', desc: 'Visualiza KPIs en tiempo real: mora, ingresos, gastos.', icon: 'dashboard' },
              ].map((feature, i) => (
                <Card key={i} className="h-full text-center" padding="lg" hover>
                  <div className="w-14 h-14 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                    <Icon name={feature.icon} className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="planes" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="info" className="mb-4 inline-flex" dot>Precios en COP</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                Elige el plan ideal para tu <span className="text-blue-600">copropiedad</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Precios en pesos colombianos. Puedes pagar mensual o anual y ahorrar hasta un 15%.
                <Button variant="ghost" size="sm" className="ml-2" onClick={() => analytics.trackFeature('pricing', 'view_details')}>
                  Ver detalles
                </Button>
              </p>
            </div>

            <div className="flex justify-center gap-3 mb-10" role="radiogroup" aria-label="Periodo de facturaciÃ³n">
              <Button
                variant={period === 'monthly' ? 'primary' : 'outline'}
                onClick={() => setPeriod('monthly')}
                aria-pressed={period === 'monthly'}
              >
                Mensual
              </Button>
              <Button
                variant={period === 'annual' ? 'primary' : 'outline'}
                onClick={() => setPeriod('annual')}
                aria-pressed={period === 'annual'}
              >
                Anual <Badge variant="success" className="ml-2" size="sm">Ahorra 15%</Badge>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLANS.slice(0, 3).map((plan) => (
                <PlanCard key={plan.name} plan={plan} period={period} onClick={handlePlanClick} />
              ))}
              <PlanCardCorporate period={period} onClick={handlePlanClick} />
            </div>

            <p className="text-center text-sm text-gray-500 mt-8 max-w-3xl mx-auto">
              Todos los planes incluyen prueba gratuita de 14 dÃ­as (sin tarjeta de crÃ©dito).
              Cancela cuando quieras. Soporte incluido.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          Â© PAIC â€” Plataforma de AdministraciÃ³n Inteligente de Copropiedades
        </div>
      </footer>
    </div>
  );
}

function PlanCard({ plan, period, onClick }: { plan: typeof PLANS[0]; period: 'monthly' | 'annual'; onClick: (p: typeof PLANS[0], per: 'monthly' | 'annual') => void }) {
  const price = period === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  const link = period === 'annual' ? plan.annualLink : plan.monthlyLink;
  const equivalent = period === 'annual' && plan.annualPrice
    ? `Equivale a ${formatCOP(Math.round(plan.annualPrice / 12))}/mes â€” Ahorras 15%`
    : null;

  return (
    <Card
      className={`h-full flex flex-col ${plan.popular ? 'ring-2 ring-amber-500 shadow-lg' : ''}`}
      padding="lg"
    >
      {plan.popular && (
        <div className="flex justify-center mb-2">
          <Badge variant="warning" size="sm">MÃ¡s popular</Badge>
        </div>
      )}
      <h3 className="text-xl font-bold text-blue-900 mb-1">{plan.name}</h3>
      <p className="text-sm text-gray-500 mb-4">{getPlanCapacityText(plan)}</p>
      <div className="mb-4">
        <div className="text-3xl font-extrabold text-gray-900">
          {price ? formatCOP(price) : 'CotizaciÃ³n'}
          <span className="text-base font-normal text-gray-500"> / {period === 'annual' ? 'aÃ±o' : 'mes'}</span>
        </div>
        {equivalent && <p className="text-xs text-green-700 font-medium mt-1">{equivalent}</p>}
      </div>
      <ul className="space-y-2 mb-6 flex-1" role="list">
        {[
          'Cobro inteligente a deudores',
          'Informes al instante vÃ­a IA',
          'GestiÃ³n de vencimientos',
          'Soporte por chat y email',
        ].slice(0, plan.name === 'Edificio' ? 4 : 5).map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
            <Icon name="checkSquare" className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        variant={plan.popular ? 'primary' : 'outline'}
        className="w-full"
        onClick={() => onClick(plan, period)}
        disabled={!link}
      >
        {period === 'annual' ? 'Suscribirse Anual' : 'Suscribirse Mensual'}
      </Button>
    </Card>
  );
}

function PlanCardCorporate({ period, onClick }: { period: 'monthly' | 'annual'; onClick: (p: typeof PLANS[0], per: 'monthly' | 'annual') => void }) {
  const plan = PLANS[3];
  return (
    <Card className="h-full flex flex-col" padding="lg">
      <h3 className="text-xl font-bold text-blue-900 mb-1">{plan.name}</h3>
      <p className="text-sm text-gray-500 mb-4">{getPlanCapacityText(plan)}</p>
      <div className="mb-4">
        <div className="text-2xl font-bold text-gray-900">CotizaciÃ³n a la medida</div>
      </div>
      <ul className="space-y-2 mb-6 flex-1" role="list">
        {['Todo lo del Plan Megaproyecto', 'Infraestructura dedicada', 'SLA garantizado', 'Soporte 24/7', 'CapacitaciÃ³n presencial']
          .map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <Icon name="checkSquare" className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
      </ul>
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => onClick(plan, period)}
      >
        Cotizar por WhatsApp
      </Button>
    </Card>
  );
}

