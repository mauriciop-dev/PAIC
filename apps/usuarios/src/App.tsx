import { useState, useEffect } from 'react';
import { Button, Card, Icon, Input, Badge, Avatar, useToast } from '@paic/ui';
import { analytics } from '@paic/analytics';
import { getMembership, getSession, requestMembership, signInWithGoogle, signOut, supabase, type PwaMembership } from './services/pwaAuth';
import { loadPwaData, createPqr, uploadPwaAttachment, answerVote, createReservation, createVisitAuthorization, inviteAdditionalUser, type Communication, type AccountStatus, type PwaReservation, type GateEvent, type VisitAuthorization, type Pqr, type PwaDocument, type DirectoryEntry, type PwaVote } from './services/pwaData';
import { subscribeToPush } from './services/pwaPush';
import './App.css';

const NavTabs = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'reservas', label: 'Reservas', icon: 'calendar' },
  { id: 'comunicados', label: 'Noticias', icon: 'mail' },
  { id: 'cuenta', label: 'Cuenta', icon: 'dollarSign' },
  { id: 'pqrs', label: 'PQRs', icon: 'message-square' },
  { id: 'documentos', label: 'Docs', icon: 'file-text' },
  { id: 'directorio', label: 'Contactos', icon: 'phone' },
  { id: 'votaciones', label: 'Votos', icon: 'checkSquare' },
  { id: 'paquetes', label: 'Paquetes', icon: 'package' },
  { id: 'visitantes', label: 'Visitas', icon: 'user-plus' },
  { id: 'perfil', label: 'Perfil', icon: 'user' },
];

export default function UsuariosApp() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [user, setUser] = useState<{ id: string; membershipId: string; conjuntoId: string; name: string; email: string; apt: string; avatar?: string; role: PwaMembership['role'] } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pwaData, setPwaData] = useState<{ communications: Communication[]; account: AccountStatus | null; reservations: PwaReservation[]; packages: GateEvent[]; visitors: GateEvent[]; authorizations: VisitAuthorization[]; pqrs: Pqr[]; documents: PwaDocument[]; directories: DirectoryEntry[]; votes: PwaVote[] } | null>(null);
  const { addToast } = useToast();
  const registrationConjunto = new URLSearchParams(window.location.search).get('conjunto') || '';
  const registrationMode = new URLSearchParams(window.location.search).get('registro') === '1';

  useEffect(() => {
    analytics.init();
    let active = true;
    const loadAuth = async () => {
      try {
        const session = await getSession();
        if (!session) return;
        const membership = await getMembership(session.user);
        if (active && membership) { setUser({ id: session.user.id, membershipId: membership.id, conjuntoId: membership.conjunto_id, name: session.user.user_metadata?.full_name || session.user.email || 'Residente', email: session.user.email || '', apt: membership.apartment, avatar: session.user.user_metadata?.avatar_url, role: membership.role }); setPwaData(await loadPwaData(membership)); }
        if (active && !membership) setAuthError('Tu cuenta aún no tiene una unidad vinculada. Solicita aprobación a la administración.');
      } catch (error) {
        if (active) setAuthError(error instanceof Error ? error.message : 'No fue posible validar la cuenta.');
      } finally { if (active) setAuthLoading(false); }
    };
    void loadAuth();
    const subscription = supabase?.auth.onAuthStateChange(() => { void loadAuth(); });
    return () => { active = false; subscription?.data.subscription.unsubscribe(); };
  }, []);

  if (authLoading) return <div className="min-h-screen grid place-items-center bg-gray-50 text-gray-600">Validando tu acceso…</div>;
  if (!user) return registrationMode ? <RegistrationScreen conjuntoId={registrationConjunto} userEmail={authError?.startsWith('AUTH:') ? authError.slice(5) : ''} onSubmitted={() => setAuthError('Tu solicitud fue enviada y está pendiente de aprobación.')} onLogin={() => void signInWithGoogle().catch((error) => setAuthError(error instanceof Error ? error.message : 'No fue posible iniciar sesión.'))} error={authError} /> : <LoginScreen error={authError} onLogin={() => void signInWithGoogle().catch((error) => setAuthError(error instanceof Error ? error.message : 'No fue posible iniciar sesión.'))} />;

  const renderTab = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <div className="space-y-6 p-4">
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <Avatar name={user?.name} size="xl" className="bg-blue-500" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-gray-500">{user?.email}</p>
                <Badge variant="info" className="mt-1">{user?.apt}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 text-center" hover onClick={() => setActiveTab('reservas')}>
                <Icon name="calendar" className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">Mis Reservas</h3>
                <p className="text-gray-500 text-sm mt-1">Ver y gestionar tus reservas</p>
              </Card>
              <Card className="p-6 text-center" hover onClick={() => setActiveTab('paquetes')}>
                <Icon name="package" className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">Paquetes</h3>
                <p className="text-gray-500 text-sm mt-1">Revisar paquetes recibidos</p>
              </Card>
              <Card className="p-6 text-center" hover onClick={() => setActiveTab('visitantes')}>
                <Icon name="user-plus" className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">Autorizar Visitas</h3>
                <p className="text-gray-500 text-sm mt-1">Gestionar ingresos de visitantes</p>
              </Card>
              <Card className="p-6 text-center" hover onClick={() => setActiveTab('perfil')}>
                <Icon name="user" className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">Mi Perfil</h3>
                <p className="text-gray-500 text-sm mt-1">Datos personales y notificaciones</p>
              </Card>
            </div>
            <Card className="p-4 bg-blue-50 border-blue-100">
              <div className="flex items-center gap-3">
                <Icon name="bot" className="w-10 h-10 text-blue-600 bg-blue-100 rounded-xl p-2" />
                <div>
                  <h3 className="font-semibold text-gray-900">¿Necesitas ayuda?</h3>
                  <p className="text-sm text-gray-600">Chatea con el asistente de PAIC</p>
                </div>
                <Button variant="primary" className="ml-auto" onClick={() => addToast('Chatbot próximamente', 'info')}>
                  Abrir Chat
                </Button>
              </div>
            </Card>
          </div>
        );
      case 'reservas':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Mis Reservas</h2>
              <ReservationForm user={user} onCreated={() => void getSession().then(async session => { if (session) { const membership = await getMembership(session.user); if (membership) setPwaData(await loadPwaData(membership)); } })} />
            </div>
            <div className="space-y-3">
              {(pwaData?.reservations || []).map((r, i) => (
                <Card key={i} className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{r.area_name}</h3>
                    <p className="text-sm text-gray-500">{r.reservation_date} · {r.start_time} - {r.end_time}</p>
                  </div>
                  <Badge variant={r.status === 'aprobada' ? 'success' : 'warning'}>{r.status}</Badge>
                </Card>
              ))}
            </div>
          </div>
        );
      case 'paquetes':
        return (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Mis Paquetes</h2>
            <div className="space-y-3">
              {(pwaData?.packages || []).map((p, i) => (
                <Card key={i} className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.courier}</h3>
                    <p className="text-sm text-gray-500">Guía: {p.tracking_number || 'Sin guía'} · {p.received_date || 'Sin fecha'}</p>
                  </div>
                  <Badge variant={p.status === 'Entregado' ? 'success' : 'warning'}>{p.status}</Badge>
                </Card>
              ))}
            </div>
          </div>
        );
      case 'visitantes':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Autorizar Visitas</h2>
              <VisitAuthorizationForm user={user} onCreated={() => void getSession().then(async session => { if (session) { const membership = await getMembership(session.user); if (membership) setPwaData(await loadPwaData(membership)); } })} />
            </div>
            <Card className="p-4"><h3 className="font-semibold">Autorizaciones enviadas</h3>{(pwaData?.authorizations || []).length === 0 ? <p className="text-gray-600 text-center py-8">No hay autorizaciones registradas</p> : <div className="space-y-3">{pwaData!.authorizations.map((v) => <div key={v.id} className="flex justify-between"><div><span>{v.visitor_name}</span><p className="text-xs text-gray-500">{v.visit_date} {v.visitor_phone || ''}</p></div><Badge variant={v.status === 'aprobada' ? 'success' : 'warning'}>{v.status}</Badge></div>)}</div>}</Card>
          </div>
        );
      case 'comunicados':
        return <div className="p-4 space-y-4"><h2 className="text-xl font-bold text-gray-900">Comunicados</h2>{(pwaData?.communications || []).map((c) => <Card key={c.id} className="p-4"><h3 className="font-semibold text-gray-900">{c.title}</h3><p className="text-xs text-gray-500 mt-1">{c.published_at ? new Date(c.published_at).toLocaleDateString('es-CO') : ''}</p><p className="mt-3 text-gray-700 whitespace-pre-wrap">{c.body}</p>{c.attachment_url && (c.attachment_url.match(/\.(png|jpe?g|gif|webp)(\?|$)/i) ? <img className="mt-3 max-h-64 w-full rounded object-contain" src={c.attachment_url} alt="Adjunto del comunicado" /> : <a className="mt-3 inline-block text-blue-600 underline" href={c.attachment_url} target="_blank" rel="noreferrer">Abrir adjunto</a>)}</Card>)}{!pwaData?.communications.length && <Card className="p-6 text-center text-gray-500">No hay comunicados publicados.</Card>}</div>;
      case 'cuenta':
        return <div className="p-4 space-y-4"><h2 className="text-xl font-bold text-gray-900">Estado de cuenta</h2><Card className="p-5"><p className="font-semibold">Apartamento {user?.apt}</p><Badge variant={pwaData?.account?.status === 'al_dia' ? 'success' : 'warning'}>{pwaData?.account?.status || 'Sin información'}</Badge><p className="mt-4 text-2xl font-bold">${(pwaData?.account?.balance || 0).toLocaleString('es-CO')}</p><p className="mt-2 text-sm text-gray-600">{pwaData?.account?.observations || 'Sin observaciones.'}</p><p className="mt-4 text-xs text-gray-500">Información de referencia. Si considera que no está actualizada, comuníquese con la administración.</p></Card></div>;
      case 'pqrs':
        return <PqrsTab user={user} items={pwaData?.pqrs || []} />;
      case 'documentos':
        return <div className="p-4 space-y-4"><h2 className="text-xl font-bold">Documentos</h2>{(pwaData?.documents || []).map((d) => <Card key={d.id} className="p-4"><p className="text-xs text-blue-600">{d.category}</p><h3 className="font-semibold">{d.name}</h3>{d.description && <p className="mt-1 text-sm text-gray-600">{d.description}</p>}<a className="mt-3 inline-block text-blue-600 underline" href={d.file_url} target="_blank" rel="noreferrer">Abrir documento</a></Card>)}{!pwaData?.documents.length && <Card className="p-6 text-center text-gray-500">No hay documentos publicados.</Card>}</div>;
      case 'directorio':
        return <div className="p-4 space-y-4"><h2 className="text-xl font-bold">Directorio</h2>{(pwaData?.directories || []).map((d) => <Card key={d.id} className="flex items-center justify-between p-4"><div><p className="text-xs text-blue-600">{d.category}</p><h3 className="font-semibold">{d.entity_name}</h3></div><a className="text-blue-600 underline" href={`tel:${d.phone}`}>{d.phone}</a></Card>)}{!pwaData?.directories.length && <Card className="p-6 text-center text-gray-500">No hay contactos publicados.</Card>}</div>;
      case 'votaciones':
        return user?.role === 'residente_principal' ? <VotesTab userId={user.id} votes={pwaData?.votes || []} /> : <Card className="m-4 p-6 text-center text-gray-500">Las votaciones están disponibles únicamente para residentes principales.</Card>;
      case 'perfil':
        return (
          <div className="p-4 space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <Avatar name={user?.name} size="2xl" className="bg-blue-500" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                  <p className="text-gray-500">{user?.email}</p>
                  <Badge variant="info" className="mt-1">{user?.apt}</Badge>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Notificaciones</h3>
              <Button variant="outline" onClick={() => void subscribeToPush(user.id).then(() => addToast('Notificaciones activadas', 'success')).catch(error => addToast(error instanceof Error ? error.message : 'No se pudieron activar las notificaciones', 'error'))}>Activar notificaciones Push</Button>
              <div className="space-y-3">
                {['Nuevos paquetes', 'Recordatorio de reservas', 'Alertas de seguridad', 'Comunicaciones de la administración'].map((n, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded border-gray-300" />
                    <span className="text-gray-700">{n}</span>
                  </label>
                ))}
              </div>
            </Card>
            {user.role === 'residente_principal' && <InvitationForm membershipId={user.membershipId} />}
            <Button variant="danger" onClick={() => void signOut().then(() => setUser(null))}>
              <Icon name="log-in" className="w-4 h-4" /> Cerrar Sesión
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-2">
              <img src="/logo-paic.png" alt="PAIC" className="w-7 h-7" />
              <span className="font-bold text-blue-900">PAIC</span>
            </div>
            {user && (
              <Avatar name={user?.name} size="sm" className="bg-blue-500" />
            )}
          </div>
        </div>
      </header>

      <main className="pt-16 pb-20 max-w-md mx-auto px-4">
        {renderTab()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 md:hidden" role="navigation" aria-label="Navegación principal">
        <div className="flex items-center justify-around h-14">
          {NavTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 flex-1 min-h-[48px] transition-colors ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <Icon name={tab.icon} className={`w-6 h-6 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function InvitationForm({ membershipId }: { membershipId: string }) { const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const submit = async (e: React.FormEvent) => { e.preventDefault(); try { await inviteAdditionalUser(membershipId, email); setMessage('Invitación registrada.'); setEmail(''); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo enviar la invitación.'); } }; return <Card className="p-4"><h3 className="font-semibold">Invitar usuario adicional</h3><p className="mt-1 text-sm text-gray-600">Puedes tener hasta cuatro invitaciones pendientes.</p><form onSubmit={submit} className="mt-3 flex gap-2"><Input type="email" placeholder="correo Gmail" value={email} onChange={e => setEmail(e.target.value)} required/><Button type="submit">Invitar</Button></form>{message && <p className="mt-2 text-sm text-gray-600">{message}</p>}</Card>; }

function VisitAuthorizationForm({ user, onCreated }: { user: { id: string; conjuntoId: string; apt: string }; onCreated: () => void }) { const [form,setForm]=useState({visitorName:'',visitorPhone:'',visitDate:'',notes:''}); const [message,setMessage]=useState(''); const [open,setOpen]=useState(false); const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await createVisitAuthorization({conjuntoId:user.conjuntoId,apartment:user.apt,userId:user.id,...form});setMessage('Autorización enviada a portería.');setForm({visitorName:'',visitorPhone:'',visitDate:'',notes:''});setOpen(false);onCreated()}catch(error){setMessage(error instanceof Error?error.message:'No se pudo registrar la visita.')}};return <details className="rounded-xl border bg-white p-4" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary className="cursor-pointer font-semibold">Autorizar nueva visita</summary><form onSubmit={submit} className="mt-3 grid gap-3"><Input placeholder="Nombre del visitante" value={form.visitorName} onChange={e=>setForm({...form,visitorName:e.target.value})} required/><Input type="tel" placeholder="Teléfono (opcional)" value={form.visitorPhone} onChange={e=>setForm({...form,visitorPhone:e.target.value})}/><input className="rounded border p-2" type="date" min={new Date().toISOString().slice(0,10)} value={form.visitDate} onChange={e=>setForm({...form,visitDate:e.target.value})} required/><textarea className="min-h-20 rounded border p-2" placeholder="Observaciones (opcional)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><Button type="submit">Enviar autorización</Button>{message&&<p className="text-sm text-gray-600">{message}</p>}</form></details>; }

function ReservationForm({ user, onCreated }: { user: { id: string; conjuntoId: string; apt: string }; onCreated: () => void }) {
  const [form, setForm] = useState({ areaName: '', date: '', startTime: '', endTime: '' }); const [file, setFile] = useState<File | null>(null); const [message, setMessage] = useState('');
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!file) { setMessage('Adjunta el comprobante de pago.'); return; } try { const path = await uploadPwaAttachment(file, user.id); await createReservation({ conjuntoId: user.conjuntoId, apartment: user.apt, userId: user.id, ...form, paymentProofPath: path }); setMessage('Reserva enviada para revisión.'); setForm({ areaName: '', date: '', startTime: '', endTime: '' }); setFile(null); onCreated(); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo crear la reserva.'); } };
  return <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">Solicitar nueva reserva</summary><form onSubmit={submit} className="mt-3 grid gap-3"><Input placeholder="Zona o área común" value={form.areaName} onChange={e => setForm({ ...form, areaName: e.target.value })} required/><input className="rounded border p-2" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required/><div className="grid grid-cols-2 gap-2"><input className="rounded border p-2" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required/><input className="rounded border p-2" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required/></div><input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} required/><Button type="submit">Enviar solicitud</Button>{message && <p className="text-sm text-gray-600">{message}</p>}</form></details>;
}

function PqrsTab({ user, items }: { user: { id: string; conjuntoId: string; apt: string }; items: Pqr[] }) {
  const [form, setForm] = useState({ type: 'peticion', title: '', description: '' }); const [file, setFile] = useState<File | null>(null); const [message, setMessage] = useState('');
  const submit = async (event: React.FormEvent) => { event.preventDefault(); try { let attachmentUrl: string | null = null; if (file) attachmentUrl = await uploadPwaAttachment(file, user.id); await createPqr({ conjuntoId: user.conjuntoId, apartment: user.apt, userId: user.id, type: form.type, title: form.title, description: form.description, attachmentUrl }); setMessage('PQR radicada correctamente.'); setForm({ type: 'peticion', title: '', description: '' }); setFile(null); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo radicar la PQR.'); } };
  return <div className="p-4 space-y-4"><h2 className="text-xl font-bold">Mis PQRs</h2><Card className="p-4"><form onSubmit={submit} className="space-y-3"><select className="w-full rounded border p-2" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="peticion">Petición</option><option value="queja">Queja</option><option value="reclamo">Reclamo</option><option value="felicitacion">Felicitación</option><option value="informacion">Información</option><option value="otros">Otros</option></select><Input placeholder="Título" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required/><textarea className="min-h-24 w-full rounded border p-2" placeholder="Descripción" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required/><input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] || null)}/><Button type="submit">Radicar PQR</Button>{message && <p className="text-sm text-gray-600">{message}</p>}</form></Card>{items.map(p => <Card key={p.id} className="p-4"><div className="flex justify-between"><h3 className="font-semibold">{p.title}</h3><Badge variant={p.status === 'respondido' ? 'success' : 'warning'}>{p.status}</Badge></div><p className="mt-2 text-sm">{p.description}</p>{p.response_body && <div className="mt-3 rounded bg-green-50 p-3 text-sm"><p className="font-semibold">{p.response_title || 'Respuesta de administración'}</p><p className="mt-1">{p.response_body}</p>{p.response_attachment_url&&<a className="mt-2 inline-block text-blue-700 underline" href={p.response_attachment_url} target="_blank" rel="noreferrer">Abrir documento de respuesta</a>}</div>}</Card>)}</div>;
}

function VotesTab({ userId, votes }: { userId: string; votes: PwaVote[] }) { const [message, setMessage] = useState(''); const submit = async (vote: PwaVote, questionId: string, optionId: string) => { try { await answerVote(vote.id, questionId, optionId, userId); setMessage('Voto registrado.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo registrar el voto.'); } }; return <div className="p-4 space-y-4"><h2 className="text-xl font-bold">Votaciones</h2>{votes.map(v => <Card key={v.id} className="p-4"><h3 className="font-semibold">{v.title}</h3>{v.description && <p className="mt-1 text-sm text-gray-600">{v.description}</p>}{v.questions.map(q => <div key={q.id} className="mt-4"><p className="font-medium">{q.question}</p><div className="mt-2 space-y-2">{q.options.map(o => <button key={o.id} className="block w-full rounded border p-2 text-left hover:bg-blue-50" onClick={() => void submit(v, q.id, o.id)}>{o.label}</button>)}</div></div>)}</Card>)}{!votes.length && <Card className="p-6 text-center text-gray-500">No hay votaciones activas.</Card>}{message && <p className="text-sm text-gray-600">{message}</p>}</div>; }

function LoginScreen({ error, onLogin }: { error: string | null; onLogin: () => void }) {
  return <main className="min-h-screen grid place-items-center bg-gray-50 p-6"><Card className="w-full max-w-sm p-6 text-center"><img src="/logo-paic.png" alt="PAIC" className="mx-auto h-16 w-16 rounded-xl" /><h1 className="mt-4 text-2xl font-bold text-gray-900">PAIC Residentes</h1><p className="mt-2 text-sm text-gray-500">Ingresa con Google para consultar la información de tu unidad.</p>{error && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}<Button className="mt-6 w-full" onClick={onLogin}>Continuar con Google</Button></Card></main>;
}

function RegistrationScreen({ conjuntoId, userEmail, onSubmitted, onLogin, error }: { conjuntoId: string; userEmail: string; onSubmitted: () => void; onLogin: () => void; error: string | null }) {
  const [email, setEmail] = useState(userEmail);
  const [apartment, setApartment] = useState('');
  const [role, setRole] = useState<PwaMembership['role']>('residente_principal');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!conjuntoId) { setMessage('El código QR no contiene la copropiedad. Solicita un código actualizado a la administración.'); return; }
    try {
      const session = await getSession();
      if (!session) { setMessage('Primero inicia sesión con Google para enviar la solicitud.'); return; }
      await requestMembership({ userId: session.user.id, conjuntoId, apartment, role });
      setSubmitted(true);
      onSubmitted();
    } catch (requestError) {
      setMessage(requestError instanceof Error && requestError.message.includes('duplicate') ? 'Ya existe una solicitud para esta unidad y cuenta.' : requestError instanceof Error ? requestError.message : 'No se pudo enviar la solicitud.');
    }
  };
  return <main className="min-h-screen grid place-items-center bg-gray-50 p-6"><Card className="w-full max-w-sm p-6"><img src="/logo-paic.png" alt="PAIC" className="mx-auto h-16 w-16 rounded-xl"/><h1 className="mt-4 text-2xl font-bold text-center">Solicitar acceso</h1><p className="mt-2 text-sm text-gray-600">Ingresa los datos de tu unidad. La administración validará la solicitud.</p><Button className="mt-5 w-full" onClick={onLogin}>Continuar con Google</Button>{!submitted && <form onSubmit={submit} className="mt-5 space-y-3"><Input type="email" placeholder="Correo de Google" value={email} onChange={e => setEmail(e.target.value)} required/><Input placeholder="Apartamento u oficina" value={apartment} onChange={e => setApartment(e.target.value)} required/><select className="w-full rounded border p-2" value={role} onChange={e => setRole(e.target.value as PwaMembership['role'])}><option value="residente_principal">Residente principal</option><option value="residente_secundario">Residente secundario</option><option value="propietario_no_residente">Propietario no residente</option></select><Button type="submit" className="w-full">Enviar solicitud</Button></form>}{(message || error || submitted) && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{submitted ? 'Solicitud enviada. Espera la aprobación de la administración.' : message || error}</p>}</Card></main>;
}
