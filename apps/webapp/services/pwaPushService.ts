import { supabase } from './supabaseClient';

export async function notifyPwaResidents(input: { conjuntoId: string; title: string; body: string; userIds?: string[] }) {
  try {
    const { error } = await supabase.functions.invoke('send-pwa-push', { body: input });
    if (error) console.warn('No se pudo enviar la notificación PWA', error);
  } catch (err) {
    console.warn('Error invoking push notification function:', err);
  }
}

export async function notifyNewCommunication(conjuntoId: string, title: string) {
  await notifyPwaResidents({
    conjuntoId,
    title: 'Nuevo Comunicado',
    body: `Se ha publicado un nuevo comunicado: "${title}"`,
  });
}

export async function notifyNewDocument(conjuntoId: string, docName: string) {
  await notifyPwaResidents({
    conjuntoId,
    title: 'Nuevo Documento',
    body: `Se ha añadido un nuevo documento: "${docName}"`,
  });
}

export async function notifyNewVote(conjuntoId: string, voteTitle: string) {
  await notifyPwaResidents({
    conjuntoId,
    title: 'Nueva Votación Disponible',
    body: `Participa en la nueva votación: "${voteTitle}"`,
  });
}

export async function notifyNewPackage(conjuntoId: string, apartment: string, courier: string, residentUserIds?: string[]) {
  await notifyPwaResidents({
    conjuntoId,
    title: '¡Nuevo Paquete Recibido!',
    body: `Llegó un paquete de ${courier} para el apto ${apartment}`,
    userIds: residentUserIds,
  });
}

export async function notifyNewVisitor(conjuntoId: string, apartment: string, visitorName: string, residentUserIds?: string[]) {
  await notifyPwaResidents({
    conjuntoId,
    title: 'Aviso de Ingreso / Visita',
    body: `Hay una visita registrada para el apto ${apartment}: ${visitorName}`,
    userIds: residentUserIds,
  });
}

