import { supabase, type PwaMembership } from './pwaAuth';

export interface Communication { id: string; title: string; body: string; attachment_url: string | null; published_at: string | null; }
export interface AccountStatus { apartment: string; status: string; balance: number; observations: string | null; updated_at: string; }
export interface PwaReservation { id: string; area_name: string; reservation_date: string; start_time: string; end_time: string; status: string; payment_proof_url: string; }
export interface GateEvent { id: number; apartment: string; courier?: string; tracking_number?: string | null; visitor_name?: string; status: string; date?: string; received_date?: string | null; }
export interface Pqr { id: string; type: string; title: string; description: string; status: string; response_title?: string | null; response_body?: string | null; response_attachment_url?: string | null; created_at: string; }
export interface PwaDocument { id: string; category: string; name: string; description?: string | null; file_url: string; }
export interface DirectoryEntry { id: string; category: string; entity_name: string; phone: string; }
export interface PwaVote { id: string; title: string; description: string | null; questions: Array<{ id: string; question: string; options: Array<{ id: string; label: string }> }> }

function requireClient() { if (!supabase) throw new Error('Supabase no está configurado.'); return supabase; }

export async function loadPwaData(membership: PwaMembership) {
  const client = requireClient();
  const [communications, account, reservations, packages, visitors, pqrs, documents, directories, votes] = await Promise.all([
    client.from('pwa_communications').select('id,title,body,attachment_url,published_at').eq('conjunto_id', membership.conjunto_id).eq('status', 'publicado').order('published_at', { ascending: false }),
    client.from('pwa_account_status').select('apartment,status,balance,observations,updated_at').eq('conjunto_id', membership.conjunto_id).eq('apartment', membership.apartment).maybeSingle(),
    client.from('pwa_reservations').select('id,area_name,reservation_date,start_time,end_time,status,payment_proof_url').eq('user_id', membership.user_id).order('reservation_date', { ascending: true }),
    client.from('package_logs').select('id,apartment,courier,tracking_number,status,received_date').eq('conjunto_id', membership.conjunto_id).eq('apartment', membership.apartment).order('received_date', { ascending: false }),
    client.from('visitor_logs').select('id,apartment,visitor_name,status,date,entry_time').eq('conjunto_id', membership.conjunto_id).eq('apartment', membership.apartment).order('date', { ascending: false }),
    client.from('pwa_pqrs').select('id,type,title,description,status,response_title,response_body,response_attachment_url,created_at').eq('user_id', membership.user_id).order('created_at', { ascending: false }),
    client.from('pwa_documents').select('id,category,name,description,file_url').eq('conjunto_id', membership.conjunto_id).order('category'),
    client.from('pwa_directories').select('id,category,entity_name,phone').eq('conjunto_id', membership.conjunto_id).order('category'),
    membership.role === 'residente_principal' ? client.from('pwa_votes').select('id,title,description,pwa_vote_questions(id,question,pwa_vote_options(id,label))').eq('conjunto_id', membership.conjunto_id).eq('status', 'publicada') : Promise.resolve({ data: [], error: null }),
  ]);
  const error = communications.error || account.error || reservations.error || packages.error || visitors.error || pqrs.error || documents.error || directories.error || votes.error;
  if (error) throw error;
  const [safeCommunications, safePqrs, safeDocuments, safeReservations] = await Promise.all([
    Promise.all(((communications.data || []) as Communication[]).map(async (item) => ({ ...item, attachment_url: await getPwaAttachmentUrl(item.attachment_url) }))),
    Promise.all(((pqrs.data || []) as Pqr[]).map(async (item) => ({ ...item, response_attachment_url: item.response_attachment_url?.startsWith('http') ? item.response_attachment_url : await getPwaAttachmentUrl(item.response_attachment_url) }))),
    Promise.all(((documents.data || []) as PwaDocument[]).map(async (item) => ({ ...item, file_url: item.file_url.startsWith('http') ? item.file_url : (await getPwaAttachmentUrl(item.file_url)) || item.file_url }))),
    Promise.all(((reservations.data || []) as PwaReservation[]).map(async (item) => ({ ...item, payment_proof_url: item.payment_proof_url.startsWith('http') ? item.payment_proof_url : (await getPwaAttachmentUrl(item.payment_proof_url)) || item.payment_proof_url }))),
  ]);
  return { communications: safeCommunications, account: account.data as AccountStatus | null, reservations: safeReservations, packages: (packages.data || []) as GateEvent[], visitors: (visitors.data || []) as GateEvent[], pqrs: safePqrs, documents: safeDocuments, directories: (directories.data || []) as DirectoryEntry[], votes: (votes.data || []).map((vote: any) => ({ ...vote, questions: (vote.pwa_vote_questions || []).map((q: any) => ({ ...q, options: q.pwa_vote_options || [] })) })) as PwaVote[] };
}

export async function uploadPwaAttachment(file: File, userId: string) { if (!supabase) throw new Error('Supabase no está configurado.'); const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`; const { error } = await supabase.storage.from('pwa-attachments').upload(path, file, { contentType: file.type, upsert: false }); if (error) throw error; return path; }
export async function getPwaAttachmentUrl(path: string | null | undefined) { if (!supabase || !path) return null; const { data, error } = await supabase.storage.from('pwa-attachments').createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; }
export async function createPqr(input: { conjuntoId: string; apartment: string; userId: string; type: string; title: string; description: string; attachmentUrl?: string | null }) { if (!supabase) throw new Error('Supabase no está configurado.'); const { error } = await supabase.from('pwa_pqrs').insert({ conjunto_id: input.conjuntoId, apartment: input.apartment, user_id: input.userId, type: input.type, title: input.title, description: input.description, attachment_url: input.attachmentUrl || null }); if (error) throw error; }
export async function answerVote(voteId: string, questionId: string, optionId: string, userId: string) { if (!supabase) throw new Error('Supabase no está configurado.'); const { error } = await supabase.from('pwa_vote_answers').insert({ vote_id: voteId, question_id: questionId, option_id: optionId, user_id: userId }); if (error) throw error; }
export async function createReservation(input: { conjuntoId: string; apartment: string; userId: string; areaName: string; date: string; startTime: string; endTime: string; paymentProofPath: string }) { if (!supabase) throw new Error('Supabase no está configurado.'); const { error } = await supabase.rpc('pwa_create_reservation', { target_conjunto: input.conjuntoId, target_apartment: input.apartment, target_area: input.areaName, target_date: input.date, target_start: input.startTime, target_end: input.endTime, target_payment_proof: input.paymentProofPath }); if (error) throw error; }
export async function inviteAdditionalUser(membershipId: string, email: string) { if (!supabase) throw new Error('Supabase no está configurado.'); const { error } = await supabase.rpc('pwa_create_invitation', { target_membership: membershipId, target_email: email }); if (error) throw error; const appUrl = window.location.origin; const emailResult = await supabase.functions.invoke('send-email', { body: { to: [email], subject: 'Invitación a PAIC Residentes', html: `<h2>Has sido invitado a PAIC Residentes</h2><p>Usa tu cuenta de Google para ingresar a la aplicación.</p><p><a href="${appUrl}">Abrir PAIC Residentes</a></p>` } }); if (emailResult.error) throw emailResult.error; }
