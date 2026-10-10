import React, { useEffect, useState, useCallback } from 'react';
import { Badge, Button, Card, Icon, Input, Textarea } from '@paic/ui';
import { ConjuntoInfo, UserProfile } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { getPwaPushAudienceStats, notifyPwaResidents } from '../../services/pwaPushService';
import {
    getGoogleDrivePreviewUrl,
    isGoogleDriveFileUrl,
    isValidGoogleDriveLink,
} from '../../utils/googleDriveLinks';
import { openGoogleDrivePicker } from '../../utils/googleDrivePicker';
import CommunicationRecipientModal, { RecipientSelection } from '../CommunicationRecipientModal';

type Section = 'Comunicados' | 'Estado de cuenta' | 'Portería' | 'Reservas' | 'PQRs' | 'Documentos' | 'Votaciones' | 'Directorio' | 'Configuración';
const sections: Array<{ id: Section; icon: string }> = [
    ['Comunicados','mail'], ['Estado de cuenta','dollarSign'], ['Portería','shield'], ['Reservas','calendar'], ['PQRs','message-square'], ['Documentos','file-text'], ['Votaciones','checkSquare'], ['Directorio','phone'], ['Configuración','settings'],
].map(([id, icon]) => ({ id: id as Section, icon }));

export default function PwaAdminView({ userProfile, conjuntoInfo }: { userProfile: UserProfile; conjuntoInfo: ConjuntoInfo }) {
    const [active, setActive] = useState<Section>('Comunicados');
    const [notification, setNotification] = useState<string | null>(null);
    const [reservaCount, setReservaCount] = useState(0);
    const [pqrCount, setPqrCount] = useState(0);
    const [documentoCount, setDocumentoCount] = useState(0);
    const [votacionCount, setVotacionCount] = useState(0);
    const [directorioCount, setDirectorioCount] = useState(0);
    const { addToast } = useToast();

    // Show toast when notification changes
    useEffect(() => {
        if (notification) {
            addToast(notification, 'info', 5000);
            setNotification(null);
        }
    }, [notification, addToast]);

    // Real-time subscriptions for new items
    useEffect(() => {
        // Subscribe to new reservations in real-time
        const reservationSubscription = supabase
            .channel('new-reservations')
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'pwa_reservations',
                    filter: `conjunto_id=eq.${conjuntoInfo.id}`
                },
                (payload) => {
                    const newReservation = payload.new;
                    // Show toast notification for new reservation
                    setNotification(`Nueva reserva solicitada: ${newReservation.area_name || 'Área común'} para el apartamento ${newReservation.apartment}`);
                    // Increment reservation badge count
                    setReservaCount(prev => prev + 1);
                }
            )
            .subscribe();
            
        // Subscribe to new PQRs in real-time
        const pqrSubscription = supabase
            .channel('new-pqrs')
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'pwa_pqrs',
                    filter: `conjunto_id=eq.${conjuntoInfo.id}`
                },
                (payload) => {
                    const newPqr = payload.new;
                    // Show toast notification for new PQR
                    setNotification(`Nueva PQR recibida: ${newPqr.title || 'Solicitud'} de tipo ${newPqr.type || 'PQR'} del apartamento ${newPqr.apartment}`);
                    // Increment PQR badge count
                    setPqrCount(prev => prev + 1);
                }
            )
            .subscribe();
            
        // Subscribe to new documents in real-time
        const documentoSubscription = supabase
            .channel('new-documentos')
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'pwa_documents',
                    filter: `conjunto_id=eq.${conjuntoInfo.id}`
                },
                (payload) => {
                    const newDocumento = payload.new;
                    // Show toast notification for new document
                    setNotification(`Nuevo documento disponible: ${newDocumento.name}`);
                    // Increment documento badge count
                    setDocumentoCount(prev => prev + 1);
                }
            )
            .subscribe();
            
        // Subscribe to new votaciones in real-time
        const votacionSubscription = supabase
            .channel('new-votaciones')
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'pwa_votes',
                    filter: `conjunto_id=eq.${conjuntoInfo.id}`
                },
                (payload) => {
                    const newVotacion = payload.new;
                    // Show toast notification for new votación
                    setNotification(`Nueva votación publicada: ${newVotacion.title}`);
                    // Increment votacion badge count
                    setVotacionCount(prev => prev + 1);
                }
            )
            .subscribe();
            
        // Subscribe to new directorio items in real-time
        const directorioSubscription = supabase
            .channel('new-directorio')
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'pwa_directories',
                    filter: `conjunto_id=eq.${conjuntoInfo.id}`
                },
                (payload) => {
                    const newDirectorio = payload.new;
                    // Show toast notification for new directorio item
                    setNotification(`Nuevo contacto agregado: ${newDirectorio.entity_name}`);
                    // Increment directorio badge count
                    setDirectorioCount(prev => prev + 1);
                }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(reservationSubscription);
            supabase.removeChannel(pqrSubscription);
            supabase.removeChannel(documentoSubscription);
            supabase.removeChannel(votacionSubscription);
            supabase.removeChannel(directorioSubscription);
        };
    }, [conjuntoInfo.id, setNotification, addToast]);

    return (
        <div className="space-y-5">
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex min-w-max gap-1 p-2" role="tablist" aria-label="Submódulos PWA">
                    {sections.map(s => {
                        // Get the count for this section
                        let count = 0;
                        switch (s.id) {
                            case 'Reservas': count = reservaCount; break;
                            case 'PQRs': count = pqrCount; break;
                            case 'Documentos': count = documentoCount; break;
                            case 'Votaciones': count = votacionCount; break;
                            case 'Directorio': count = directorioCount; break;
                            default: count = 0;
                        }
                         
                        return (
                            <button 
                                key={s.id} 
                                role="tab" 
                                aria-selected={active === s.id} 
                                onClick={() => setActive(s.id)}
                                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${active === s.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`}
                            >
                                <Icon name={s.icon} className="h-4 w-4"/>
                                {s.id}
                                {count > 0 && (
                                    <span className="ml-1 text-xs bg-red-600 text-white rounded-full px-2 py-0.5">
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div role="tabpanel">
                {active === 'Comunicados' && <Communications conjuntoId={conjuntoInfo.id} userId={userProfile.id}/>} 
                {active === 'Estado de cuenta' && <Accounts conjuntoId={conjuntoInfo.id}/>} 
                {active === 'Portería' && <GateAdmin conjuntoId={conjuntoInfo.id}/>} 
                {active === 'Reservas' && <Reservas conjuntoId={conjuntoInfo.id} userId={userProfile.id}/>} 
                {active === 'PQRs' && <Pqrs conjuntoId={conjuntoInfo.id} userId={userProfile.id}/>} 
                {active === 'Documentos' && <Documents conjuntoId={conjuntoInfo.id} userId={userProfile.id}/>} 
                {active === 'Directorio' && <Directory conjuntoId={conjuntoInfo.id} userId={userProfile.id}/>} 
                {active === 'Votaciones' && <VotesAdmin conjuntoId={conjuntoInfo.id} userId={userProfile.id}/>} 
                {active === 'Configuración' && (
                    <>
                        <AccessInvite conjuntoId={conjuntoInfo.id}/>
                        <PushDiagnostics conjuntoId={conjuntoInfo.id}/>
                        <RequestsAdmin conjuntoId={conjuntoInfo.id}/>
                    </>
                )}
            </div>
        </div>
    );
}

async function uploadAdminAttachment(file: File, folder: string, userId: string) { 
    const path = `admin/${userId}/${folder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`; 
    const { error } = await supabase.storage.from('pwa-attachments').upload(path, file, { contentType: file.type, upsert: false }); 
    if (error) throw error; 
    return path; 
}
async function signedAdminAttachment(path: string | null) { 
    if (!path || path.startsWith('http')) return path; 
    const { data, error } = await supabase.storage.from('pwa-attachments').createSignedUrl(path, 3600); 
    if (error) return path; 
    return data.signedUrl; 
}

function AccessInvite({ conjuntoId }: { conjuntoId: string }) { 
    const [copied, setCopied] = useState(false); 
    const url = `https://usuarios.paicai.com.co/?registro=1&conjunto=${encodeURIComponent(conjuntoId)}`; 
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(url)}`; 
    const copy = async () => { 
        await navigator.clipboard.writeText(url); 
        setCopied(true); 
        window.setTimeout(() => setCopied(false), 2000); 
    }; 
    return <Card className="p-5">
        <h2 className="font-semibold">Acceso de residentes</h2>
        <p className="mt-1 text-sm text-gray-600">Comparte este enlace o código QR para que los residentes soliciten acceso a la PWA.</p>
        <div className="mt-4 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
                <label className="text-sm font-medium">Enlace de registro</label>
                <input readOnly value={url} className="mt-1 w-full rounded border bg-gray-50 p-2 text-sm"/>
                <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={()=>void copy()}>{copied?'Enlace copiado':'Copiar enlace'}</Button>
                    <a className="inline-flex items-center rounded border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" href={url} target="_blank" rel="noreferrer">Abrir PWA</a>
                    <a className="inline-flex items-center rounded border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" href={qr} download="paic-registro-residentes.png" target="_blank" rel="noreferrer">Descargar QR</a>
                </div>
            </div>
            <div className="rounded border bg-white p-2">
                <img src={qr} alt="Código QR para solicitar acceso a PAIC Residentes" className="h-40 w-40"/>
                <p className="mt-1 text-center text-xs text-gray-500">Escanea para solicitar acceso</p>
            </div>
        </div>
    </Card>;
}

function PushDiagnostics({ conjuntoId }: { conjuntoId: string }) {
    const [stats, setStats] = useState<{ activeMembers?: number; total?: number; sent?: number; failed?: number; removed?: number } | null>(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const refresh = async () => {
        setLoading(true);
        setMessage('');
        try {
            const result = await getPwaPushAudienceStats(conjuntoId);
            setStats(result);
            if (!result) setMessage('No se pudo consultar el estado de notificaciones.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void refresh(); }, [conjuntoId]);

    const sendTest = async () => {
        setLoading(true);
        setMessage('');
        try {
            const result = await notifyPwaResidents({ 
                conjuntoId, 
                title: 'Prueba de PAIC', 
                body: 'Si ves este aviso, tu teléfono ya recibe notificaciones.', 
                type: 'test', 
                id: 'test', 
                url: '/' 
            });
            setStats(result);
            setMessage(result ? `Prueba enviada: ${result.sent} recibieron el aviso, ${result.failed || 0} fallaron.` : 'No se pudo enviar la prueba.');
        } finally {
            setLoading(false);
        }
    };

    return <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h2 className="font-semibold">Notificaciones móviles</h2>
                <p className="mt-1 text-sm text-gray-600">Verifica cuántos residentes activos ya tienen un teléfono suscrito y envía una prueba real.</p>
            </div>
            <Badge variant={stats?.total ? 'success' : 'warning'}>
                {stats?.total || 0} teléfono(s)
            </Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded border bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Residentes activos</p>
                <p className="text-xl font-semibold">{stats?.activeMembers ?? '-'}</p>
            </div>
            <div className="rounded border bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Teléfonos suscritos</p>
                <p className="text-xl font-semibold">{stats?.total ?? '-'}</p>
            </div>
            <div className="rounded border bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Vencidas eliminadas</p>
                <p className="text-xl font-semibold">{stats?.removed ?? 0}</p>
            </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" loading={loading} onClick={()=>void refresh()}>Revisar estado</Button>
            <Button loading={loading} disabled={!stats?.total} onClick={()=>void sendTest()}>Enviar prueba</Button>
        </div>
        {message&&<p className="mt-3 text-sm text-gray-600">{message}</p>}
    </Card>;
}

function Communications({ conjuntoId, userId }: { conjuntoId: string; userId: string }) {
    const [rows, setRows] = useState<any[]>([]);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [scheduleMode, setScheduleMode] = useState<'now' | 'once' | 'weekly' | 'monthly'>('now');
    const [recipientSelection, setRecipientSelection] = useState<RecipientSelection>({ audience: 'all_residents', apartments: [], emails: [], emailsByApartment: {} });
    const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [message, setMessage] = useState('');

    const load = async () => {
        const { data } = await supabase.from('pwa_communications').select('*').eq('conjunto_id', conjuntoId).order('created_at', { ascending: false });
        setRows(data || []);
    };

    useEffect(() => { void load(); }, [conjuntoId]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const scheduled = scheduledAt ? new Date(scheduledAt).toISOString() : null;
            const apartments = recipientSelection.apartments;
            if (scheduleMode !== 'now' && !scheduled) throw new Error('Selecciona la fecha y hora de inicio.');
            if (!apartments.length && recipientSelection.audience === 'manual') throw new Error('Selecciona al menos un apartamento.');
            if (scheduleMode !== 'now') {
                const campaign = await supabase.from('communication_campaigns').insert({
                    conjunto_id: conjuntoId,
                    channel: 'pwa',
                    title,
                    body,
                    audience: recipientSelection.audience,
                    recurrence: scheduleMode === 'once' ? 'none' : scheduleMode,
                    scheduled_at: scheduled,
                    next_run_at: scheduled,
                    created_by: userId,
                }).select('id').single();
                if (campaign.error) throw campaign.error;
                const campaignRecipients = apartments.map(apartment => ({ campaign_id: campaign.data.id, conjunto_id: conjuntoId, apartment }));
                const recipientResult = await supabase.from('communication_campaign_recipients').insert(campaignRecipients);
                if (recipientResult.error) throw recipientResult.error;
                setTitle(''); setBody(''); setScheduledAt(''); setScheduleMode('now'); setRecipientSelection({ audience: 'all_residents', apartments: [], emails: [], emailsByApartment: {} });
                setMessage('Comunicado programado.');
                return;
            }
            const result = await supabase.from('pwa_communications').insert({
                conjunto_id: conjuntoId,
                title,
                body,
                attachment_url: attachmentUrl || null,
                status: scheduled ? 'borrador' : 'publicado',
                scheduled_at: scheduled,
                published_at: scheduled ? null : new Date().toISOString(),
                created_by: userId,
                audience: recipientSelection.audience,
                target_apartments: apartments,
            }).select('id').single();
            if (result.error) throw result.error;
            const comunicadoId = result.data?.id;
            const pushResult = !scheduled ? await notifyPwaResidents({ 
                conjuntoId, 
                title: title, 
                body: body, 
                type: 'comunicado',
                id: comunicadoId,
                url: `/comunicados/${comunicadoId}`
            }) : null;
            setTitle('');
            setBody('');
            setScheduledAt('');
            setAttachmentUrl('');
            setScheduleMode('now');
            setRecipientSelection({ audience: 'all_residents', apartments: [], emails: [], emailsByApartment: {} });
            setMessage(scheduled ? 'Comunicado programado.' : `Comunicado publicado.${pushResult ? ` Notificaciones enviadas: ${pushResult.sent}/${pushResult.total || pushResult.sent}.` : ''}`);
            void load();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'No se pudo guardar el comunicado.');
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
                <h2 className="font-semibold">Nuevo comunicado</h2>
                <form onSubmit={save} className="mt-3 space-y-3">
                    <Input label="Título" value={title} onChange={e => setTitle(e.target.value)} required />
                    <Textarea label="Mensaje" value={body} onChange={e => setBody(e.target.value)} required />
                    <button type="button" onClick={() => setIsRecipientModalOpen(true)} className="flex w-full items-center justify-between rounded border p-3 text-left text-sm hover:border-blue-500"><span>{recipientSelection.audience === 'all_residents' && !recipientSelection.apartments.length ? 'Todos los residentes' : `${recipientSelection.apartments.length} apartamento(s) seleccionados`}</span><Icon name="users" className="h-4 w-4 text-blue-600" /></button>
                    <div>
                        <label className="block text-sm font-medium mb-1">Archivo adjunto (Google Drive)</label>
                        <div className="flex gap-2">
                            <Input
                                className="flex-1"
                                value={attachmentUrl}
                                onChange={e => setAttachmentUrl(e.target.value)}
                                placeholder="https://drive.google.com/..."
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void openGoogleDrivePicker({ onSelect: (f) => setAttachmentUrl(f.url) })}
                            >
                                Drive
                            </Button>
                        </div>
                    </div>
                    <label className="block text-sm">
                        Programar publicación
                        <select className="mt-1 w-full rounded border p-2" value={scheduleMode} onChange={event => setScheduleMode(event.target.value as typeof scheduleMode)}>
                            <option value="now">Publicar ahora</option>
                            <option value="once">Programar una vez</option>
                            <option value="weekly">Repetir semanalmente</option>
                            <option value="monthly">Repetir mensualmente</option>
                        </select>
                        <input
                            className="mt-1 w-full rounded border p-2"
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={e => setScheduledAt(e.target.value)}
                            required={scheduleMode !== 'now'}
                        />
                    </label>
                    <Button type="submit">{scheduleMode === 'now' ? 'Publicar' : 'Guardar programación'}</Button>
                    {message && <p className="text-sm text-gray-600 mt-2">{message}</p>}
                </form>
            </Card>
            <div className="space-y-3">
                <h3 className="font-semibold">Comunicados recientes</h3>
                {rows.map(r => (
                    <div className="rounded border p-3 text-sm bg-white shadow-sm" key={r.id}>
                        <b>{r.title}</b>
                        <p className="text-gray-600 mt-1">{r.body}</p>
                        {r.attachment_url && (
                            <a
                                href={r.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block mt-2 text-blue-600 hover:underline text-xs"
                            >
                                Ver archivo en Drive &rarr;
                            </a>
                        )}
                    </div>
                ))}
                {!rows.length && <p className="text-sm text-gray-500">No hay comunicados registrados.</p>}
            </div>
            <CommunicationRecipientModal conjuntoId={conjuntoId} open={isRecipientModalOpen} initialSelection={recipientSelection} onClose={() => setIsRecipientModalOpen(false)} onConfirm={selection => { setRecipientSelection(selection); setIsRecipientModalOpen(false); }} />
        </div>
    );
}

function Accounts({ conjuntoId }: { conjuntoId:string }) { 
    const [rows,setRows]=useState<any[]>([]); 
    const [message,setMessage]=useState(''); 
    const load=async()=>{const {data}=await supabase.from('pwa_account_status').select('*').eq('conjunto_id',conjuntoId).order('apartment');setRows(data||[])}; 
    useEffect(()=>{void load()},[conjuntoId]); 
    const save=async(r:any)=>{const {error}=await supabase.from('pwa_account_status').upsert({...r,conjunto_id:conjuntoId,updated_at:new Date().toISOString()},{onConflict:'conjunto_id,apartment'});setMessage(error?error.message:'Guardado.');if(!error)void load()}; 
    const importCsv=async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;const text=await file.text();const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const data=lines.slice(1).map(line=>{const [apartment,status,balance,observations='']=line.split(',').map(x=>x.trim());return {conjunto_id:conjuntoId,apartment,status:status||'al_dia',balance:Number(balance||0),observations,updated_at:new Date().toISOString()}}).filter(r=>r.apartment&&['al_dia','pendiente','en_mora'].includes(r.status));if(!data.length){setMessage('El CSV debe tener: apartamento,estado,saldo,observaciones.');return}const {error}=await supabase.from('pwa_account_status').upsert(data,{onConflict:'conjunto_id,apartment'});setMessage(error?error.message:`${data.length} registros importados.`);if(!error)void load()}; 
    return <Card className="p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">Estado de cuenta</h2><div className="flex gap-2"><label className="cursor-pointer rounded border px-3 py-2 text-sm">Importar CSV<input className="hidden" type="file" accept=".csv,text/csv" onChange={e=>void importCsv(e)}/></label><Button onClick={()=>setRows([...rows,{apartment:'',status:'al_dia',balance:0,observations:''}])}>Agregar</Button></div></div><p className="mt-2 text-xs text-gray-500">Columnas: apartamento, estado (al_dia/pendiente/en_mora), saldo, observaciones</p>{rows.length>0?(
        <>
        {rows.map(r=>(<div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 mb-4"><div className="flex items-center justify-between"><span className="font-medium">{r.apartment}</span><span className="font-medium">{r.status}</span><span className="font-medium">${r.balance?.toLocaleString()||'0'}</span></div><p className="text-xs">{r.observations||''}</p></div>))
        }):(
        <p className="text-center py-8 text-gray-500">No hay registros de estado de cuenta</p>
    )}</Card>;
}

function Reservations({ conjuntoId, userId }: { conjuntoId:string; userId:string }) { 
    const [rows,setRows]=useState<any[]>([]); 
    const [legacy,setLegacy]=useState<any[]>([]); 
    const [calendar,setCalendar]=useState(false); 
    const [date,setDate]=useState(''); 
    const [notification, setNotification] = useState<string | null>(null); 
    const { addToast } = useToast(); 
    const load=async()=>{const [p,b]=await Promise.all([supabase.from('pwa_reservations').select('*').eq('conjunto_id',conjuntoId).order('reservation_date'),supabase.from('bookings').select('id,day,time,event,user').eq('conjunto_id',conjuntoId).order('day')]);setRows(p.data||[]);setLegacy(b.data||[])}; 
    useEffect(()=>{
        void load();
        
        // Subscribe to new reservations in real-time
        const reservationSubscription = supabase
            .channel('new-reservations')
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'pwa_reservations',
                    filter: `conjunto_id=eq.${conjuntoId}`
                },
                (payload) => {
                    const newReservation = payload.new;
                    // Show toast notification for new reservation
                    setNotification(`Nueva reserva solicitada: ${newReservation.area_name || 'Área común'} para el apartamento ${newReservation.apartment}`);
                    
                    // Also notify via PWA push to administrator's devices (optional)
                    // notifyPwaResidents({
                    //   conjuntoId,
                    //   titulo: 'Nueva reserva solicitada',
                    //   cuerpo: `Se ha solicitado una reserva para ${newReservation.area_name || 'un área común'} en el apartamento ${newReservation.apartment}`,
                    //   tipo: 'reserva',
                    //   userId: userId, // Send to administrator
                    // });
                }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(reservationSubscription);
        };
    }, [conjuntoId, userId, setNotification, addToast]); 
    const update=async(row:any,status:string)=>{await supabase.from('pwa_reservations').update({status,reviewed_by:userId,reviewed_at:new Date().toISOString()}).eq('id',row.id);void notifyPwaResidents({conjuntoId,userIds:[row.user_id],title:`Reserva ${status}`,body:`Tu reserva de ${row.area_name} está ${status}.`, type: 'reserva', id: row.id, url: `/reservas/${row.id}`});void load()}; 
    const visible=rows.filter(r=>!date||r.reservation_date===date); 
    return <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Solicitudes de reserva</h2><div className="flex gap-2"><input className="rounded border p-2 text-sm" type="date" value={date} onChange={e=>setDate(e.target.value)}/><Button variant="outline" onClick={()=>setCalendar(!calendar)}>{calendar?'Ocultar calendario':'Ver calendario'}</Button></div></div>{calendar&&<div className="mt-4 rounded border bg-blue-50 p-4"><h3 className="font-semibold">Calendario unificado</h3><p className="mt-1 text-xs text-gray-600">Incluye reservas de la PWA y registros existentes de la WebApp.</p><div className="mt-3 space-y-2">{legacy.map(r=><div className="rounded bg-white p-2 text-sm" key={`legacy-${r.id}`}>WebApp · {r.event||'Reserva'} · {r.time||''} · {r.user||''}</div>)}{rows.map(r=><div className="rounded bg-white p-2 text-sm" key={`pwa-${r.id}`}>PWA · {r.reservation_date} · {r.area_name} · {r.start_time}-{r.end_time} · {r.status}</div>)}{!legacy.length&&!rows.length&&<p className="text-sm text-gray-500">No hay reservas registradas.</p>}</div></div>}<div className="mt-3 space-y-2">{visible.map(r=><div className="flex flex-wrap justify-between gap-3 rounded border p-3" key={r.id}><div><b>{r.area_name} · Apto. {r.apartment}</b><p className="text-sm">{r.reservation_date} · {r.start_time} - {r.end_time}</p><a className="text-sm text-blue-600 underline" href={r.payment_proof_url} target="_blank" rel="noreferrer">Ver comprobante</a>{r.status==='pendiente'&&<Button variant="outline" onClick={()=>void supabase.from('pwa_reservations').update({status:'en_revision'}).eq('id',row.id)}})</div>}</div></Card>;
}

function Pqrs({ conjuntoId, userId }: { conjuntoId:string; userId:string }) { 
    const [rows,setRows]=useState<any[]>([]); 
    const [answers,setAnswers]=useState<Record<string,string>>({}); 
    const [titles,setTitles]=useState<Record<string,string>>({}); 
    const [files,setFiles]=useState<Record<string,File|null>>({}); 
    const [message,setMessage]=useState(''); 
    const load=async()=>{const {data}=await supabase.from('pwa_pqrs').select('*').eq('conjunto_id',conjuntoId).order('created_at',{ascending:false});setRows(data||[])}; 
    useEffect(()=>{void load()},[conjuntoId]); 
    const respond=async(r:any)=>{try{const attachmentUrl=files[r.id]?await uploadAdminAttachment(files[r.id] as File,'pqr-responses',userId):null;const result=await supabase.from('pwa_pqrs').update({status:'respondido',response_title:titles[r.id]||'Respuesta de administración',response_body:answers[r.id]||'',response_attachment_url:attachmentUrl,responded_by:userId,responded_at:new Date().toISOString()}).eq('id',r.id);if(result.error)throw result.error;void notifyPwaResidents({conjuntoId,userIds:[r.user_id],title:'Respuesta a tu PQR',body:titles[r.id]||'La administración respondió tu solicitud.', type: 'pqr', id: r.id, url: `/pqrs/${r.id}`});setMessage('Respuesta enviada.');void load()}catch(error){setMessage(error instanceof Error?error.message:'No se pudo responder la PQR.')}}; 
    return <Card className="p-5"><h2 className="font-semibold">PQRs recibidas</h2><div className="mt-3 space-y-4">{rows.map(r=><article className="rounded border p-3" key={r.id}><div className="flex justify-between"><b>{r.title}</b><Badge variant={r.status==='respondido'?'success':'warning'}>{r.status}</Badge></div><p className="text-xs text-gray-500">{r.type} · Apto. {r.apartment} · Recibida {new Date(r.created_at).toLocaleDateString('es-CO')}</p><p className="mt-2 text-sm">{r.description}</p><div className="mt-2 flex gap-2">{r.status==='pendiente'&&<Button variant="outline" onClick={()=>void supabase.from('pwa_pqrs').update({status:'en_revision'}).eq('id',row.id)}})</div>}</div></Card>;
}

function Documents({ conjuntoId, userId }: { conjuntoId:string; userId:string }) { 
    const [rows,setRows]=useState<any[]>([]); 
    const [form,setForm]=useState({name:'',category:'Institucional',description:''}); 
    const [file,setFile]=useState<File|null>(null); 
    const [message,setMessage]=useState(''); 
    const load=async()=>{const {data}=await supabase.from('pwa_documents').select('*').eq('conjunto_id',conjuntoId).order('created_at',{ascending:false});setRows(data||[])}; 
    useEffect(()=>{void load()},[conjuntoId]); 
    const save=async(e:React.FormEvent)=>{e.preventDefault();if(!file){setMessage('Selecciona un PDF.');return}try{const fileUrl=await uploadAdminAttachment(file,'documents',userId);const result=await supabase.from('pwa_documents').insert({name:form.name,category:form.category,description:form.description,file_url:fileUrl,conjunto_id:conjuntoId,created_by:userId}).select('id').single();if(result.error)throw result.error;void notifyPwaResidents({conjuntoId,title:'Nuevo documento',body:form.name,type:'documento',id:result.data.id,url:`/documentos/${result.data.id}`});setForm({name:'',category:'Institucional',description:''});setFile(null);setMessage('Documento publicado.');void load()}catch(error){setMessage(error instanceof Error?error.message:'No se pudo publicar el documento.')}}; 
    return <div className="grid gap-6 lg:grid-cols-2"><Card className="p-5"><h2 className="font-semibold">Publicar documento</h2><form className="mt-3 space-y-3" onSubmit={save}><Input label="Nombre" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/><Input label="Categoría" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required/><Textarea label="Descripción" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} required/><Button type="submit">Publicar</Button>{message&&<p className="text-sm text-gray-600">{message}</p>}</Card></div>;
}

function Votaciones({ conjuntoId, userId }: { conjuntoId:string; userId:string }) { 
    const [rows,setRows]=useState<any[]>([]); 
    const [title,setTitle]=useState(''); 
    const [description,setDescription]=useState(''); 
    const [questions,setQuestions]=useState<{question:string;options:string[]}[]>([{question:'',options:['','']}]); 
    const [message,setMessage]=useState(''); 
    const load=async()=>{const {data}=await supabase.from('pwa_votes').select('*').eq('conjunto_id',conjuntoId).order('created_at',{ascending:false});setRows(data||[])}; 
    useEffect(()=>{void load()},[conjuntoId]); 
    const save=async(e:React.FormEvent)=>{e.preventDefault();if(!title.trim()||!description.trim()){setMessage('Título y descripción son obligatorios.');return}try{const vote=await supabase.from('pwa_votes').insert({conjunto_id:conjuntoId,title:title,description:description,status:'publicada',created_by:userId}).select('id').single();if(vote.error){setMessage(vote.error.message);return}for(const [position,q] of valid.entries()){const created=await supabase.from('pwa_vote_questions').insert({vote_id:vote.data.id,question:q.question,position}).select('id').single();if(created.error){setMessage(created.error.message);return}const result=await supabase.from('pwa_vote_options').insert(q.options.map((label,optionPosition)=>({question_id:created.data.id,label,position:optionPosition})));if(result.error){setMessage(result.error.message);return}}setMessage('Votación publicada.');setTitle('');setDescription('');setQuestions([{question:'',options:['','']}]);void load()};const close=async(id:string)=>{await supabase.from('pwa_votes').update({status:'cerrada'}).eq('id',id);void load()}; 
    const valid=questions.filter(q=>q.question.trim()&&q.options.some(o=>o.trim())); 
    return <div className="space-y-6"><Card className="p-5"><h2 className="font-semibold">Crear votación</h2><form className="mt-3 space-y-3" onSubmit={save}><Input label="Título" value={title} onChange={e=>setTitle(e.target.value)} required/><Textarea label="Descripción" value={description} onChange={e=>setDescription(e.target.value)} required/><div className="space-y-2"><h3 className="font-semibold">Preguntas</h2>{questions.map((q,i)=><div key={i} className="space-y-2"><Input label={`Pregunta ${i+1}`} value={q.question} onChange={e=>setQuestions(questions.map((q2,i2)=>i2===i?{...q2,question:e.target.value}:q2))} required/><div className="flex flex-wrap gap-2">{q.options.map((opt,optIndex)=><div key={optIndex} className="flex items-center gap-1"><Input label={`Opción ${optIndex+1}`} value={opt} onChange={e=>setQuestions(questions.map((q2,i2)=>i2===i?{...q2,options:q2.map((o2,o2Index)=>o2Index===optIndex?{...o2,value:e.target.value}:o2)}:q2))} required/><Button variant="danger" onClick={()=>setQuestions(questions.map((q2,i2)=>i2===i?{...q2,options:q2.filter((_,index)=>index!==optIndex)}:q2))}>Eliminar</Button></div>)}}{q.options.length<2&&<Button variant="outline" onClick={()=>setQuestions(questions.map((q2,i2)=>i2===i?{...q2,options:[...q2.options,'']}:q2))}>Agregar opción</Button>}</div>)}){questions.length<1&&<Button variant="outline" onClick={()=>setQuestions([{question:'',options:['','']}])}>Agregar pregunta</Button>}</div></div><Button type="submit">Publicar votación</Button></form>{message&&<p className="text-sm text-gray-600">{message}</p>}</Card></div>;
}

function Directory({ conjuntoId, userId }: { conjuntoId:string; userId:string }) { 
    const [rows,setRows]=useState<any[]>([]); 
    const [form,setForm]=useState({category:'Emergencias',entity_name:'',phone:''}); 
    const [editing,setEditing]=useState<string|null>(null); 
    const [message,setMessage]=useState(''); 
    const load=async()=>{const {data}=await supabase.from('pwa_directories').select('*').eq('conjunto_id',conjuntoId).order('category');setRows(data||[])}; 
    useEffect(()=>{void load()},[conjuntoId]); 
    const save=async(e:React.FormEvent)=>{e.preventDefault();const result=editing?await supabase.from('pwa_directories').update(form).eq('id',editing):await supabase.from('pwa_directories').insert({...form,conjunto_id:conjuntoId,created_by:userId}).select('id').single();if(result.error){setMessage(result.error.message);return}if(!editing){void notifyPwaResidents({conjuntoId,title:'Nuevo contacto',body:form.entity_name,type:'directorio',id:result.data.id,url:`/directorio/${result.data.id}`});}setForm({category:'Emergencias',entity_name:'',phone:''});setEditing(null);setMessage('Directorio actualizado.');void load()}; 
    const remove=async(id:string)=>{if(!window.confirm('¿Eliminar este contacto?'))return;const {error}=await supabase.from('pwa_directories').delete().eq('id',id);setMessage(error?error.message:'Contacto eliminado.');if(!error)void load()}; 
    return <div className="grid gap-6 lg:grid-cols-2"><Card className="p-5"><h2 className="font-semibold">{editing?'Editar contacto':'Agregar contacto'}</h2><form className="mt-3 space-y-3" onSubmit={save}><Input label="Categoría" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required/><Input label="Entidad" value={form.entity_name} onChange={e=>setForm({...form,entity_name:e.target.value})} required/><Input label="Teléfono" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required/><div className="flex gap-2"><Button type="submit">{editing?'Guardar cambios':'Agregar'}</Button>{!editing&&<Button variant="outline" onClick={()=>setForm({...form,category:'Emergencias',entity_name:'Soporte Técnico',phone:'+57 300 123 4567'})}>Ejemplo de contacto</Button>}</div></form>{message&&<p className="text-sm text-gray-600">{message}</p>}</Card></div>;
}

function GateAdmin({ conjuntoId }: { conjuntoId:string }) { 
    const [rows,setRows]=useState<any[]>([]); 
    const [message,setMessage]=useState(''); 
    const load=async()=>{const {data}=await supabase.from('pwa_gate_logs').select('*').eq('conjunto_id',conjuntoId).order('created_at',{descending:true});setRows(data||[])}; 
    useEffect(()=>{void load()},[conjuntoId]); 
    return <Card className="p-5"><h2 className="font-semibold">Registro de accesos</h2>{rows.length>0?(
        <>
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
        <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha/Hora</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apartamento</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitante/Remitente</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
        </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
        {rows.map(r=>(<tr key={r.id} className="hover:bg-gray-50"><td className="px-6 py-4 text-sm text-gray-900">{new Date(r.created_at).toLocaleString('es-CO')}</td><td className="px-6 py-4 text-sm font-medium">{r.type===?'visitante':'paquete'}</td><td className="px-6 py-4 text-sm">{r.apartment}</td><td className="px-6 py-4 text-sm">{r.name}</td><td className="px-6 py-4 text-sm">{r.reason}</td><td className="px-6 py-4 text-sm">{r.status==='aprobado'?'✅ Aprobado':r.status==='pendiente'?'⏳ Pendiente':'❌ Rechazado'}</td></tr>))
        }):(
        <p className="text-center py-8 text-gray-500">No hay registros de accesos</p>
        )}</table>
        </div>
        </>
    ):(
        <p className="text-center py-8 text-gray-500">No hay registros de accesos</p>
    )}</Card>;
}

function RequestsAdmin({ conjuntoId }: { conjuntoId:string }) { 
    const [rows,setRows]=useState<any[]>([]); 
    const [message,setMessage]=useState(''); 
    const load=async()=>{const {data}=await supabase.from('pwa_access_requests').select('*').eq('conjunto_id',conjuntoId).order('created_at',{descending:true});setRows(data||[])}; 
    useEffect(()=>{void load()},[conjuntoId]); 
    const review=async(r:any,status:string)=>{const {error}=await supabase.from('pwa_access_requests').update({status,reviewed_by:userId,reviewed_at:new Date().toISOString()}).eq('id',r.id);if(!error){void notifyPwaResidents({conjuntoId,userIds:[r.user_id],title:`Solicitud ${status}`,body:`Tu solicitud de acceso fue ${status}.`, type: 'solicitud', id: r.id, url: `/solicitudes/${r.id}`});void load()}}; 
    return <Card className="p-5"><h2 className="font-semibold">Solicitudes de acceso</h2><div className="mt-3 space-y-3">{rows.map(r=><div className="flex flex-wrap items-center justify-between gap-3 rounded border p-4" key={r.id}><div><p className="font-semibold">Apartamento {r.apartment}</p><p className="text-sm text-gray-500">Rol: {r.role} · Usuario: {r.user_id}</p></div><div className="flex gap-2"><Button onClick={()=>void review(r,'activo')}>Aprobar</Button><Button variant="danger" onClick={()=>void review(r,'inactivo')}>Rechazar</Button></div></div>)}{!rows.length&&<p className="text-sm text-gray-500">No hay solicitudes pendientes.</p>}{message&&<p className="text-sm text-gray-600">{message}</p>}</div></Card>;
}