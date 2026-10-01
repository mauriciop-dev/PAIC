import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../agent-actions/shared/supabase.ts';

// Web Push implementation for Deno
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  vibrate?: number[];
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
  requireInteraction?: boolean;
  tag?: string;
  url?: string;
}

interface SendPushPayload {
  subscriptions: PushSubscription[];
  payload: PushPayload;
}

// VAPID keys from environment
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

// Base64 URL-safe encoding
function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate JWT for VAPID
async function generateVapidJWT(audience: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const claims = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: 'mailto:admin@paicai.com.co',
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const claimsB64 = base64UrlEncode(encoder.encode(JSON.stringify(claims)));
  const unsignedToken = `${headerB64}.${claimsB64}`;

  // Import private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    base64ToArrayBuffer(VAPID_PRIVATE_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(unsignedToken)
  );

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Encrypt payload for Web Push
async function encryptPayload(payload: string, subscription: PushSubscription): Promise<{
  body: Uint8Array;
  headers: Record<string, string>;
}> {
  // Decode subscription keys
  const auth = base64ToArrayBuffer(subscription.keys.auth);
  const p256dh = base64ToArrayBuffer(subscription.keys.p256dh);

  // Generate ephemeral key pair
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Import receiver's public key
  const receiverPublicKey = await crypto.subtle.importKey(
    'raw',
    p256dh.slice(1), // Remove 0x04 prefix
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverPublicKey },
    keyPair.privateKey,
    256
  );

  // HKDF - derive encryption key and nonce
  const ikm = new Uint8Array(sharedSecret);
  const salt = new Uint8Array(auth);
  const prk = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('Content-Encoding: auth\0') },
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  // For simplicity, using a simplified encryption (in production use web-push library)
  // This is a minimal implementation - production should use web-push library
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  // Generate a simple salt for encryption
  const cryptoKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    payloadBytes
  );

  // Build headers
  const publicKeyB64 = base64UrlEncode(
    await crypto.subtle.exportKey('raw', keyPair.publicKey)
  );

  return {
    body: new Uint8Array(encrypted),
    headers: {
      'Content-Encoding': 'aesgcm',
      'Content-Type': 'application/octet-stream',
      'Encryption': `keyid=p256dh;salt=${base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)))};rs=4096`,
      'Crypto-Key': `dh=${publicKeyB64};p256ecdsa=${VAPID_PUBLIC_KEY}`,
    },
  };
}

serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const origin = req.headers.get('origin');
  const headers = {
    ...corsHeaders(origin),
    'Content-Type': 'application/json',
  };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers,
      });
    }

    // Verify superadmin
    const { data: admin } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('user_id', user.id)
      .eq('activo', true)
      .single();

    if (!admin) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers,
      });
    }

    const { subscriptions, payload }: SendPushPayload = await req.json();

    if (!subscriptions || !subscriptions.length) {
      return new Response(JSON.stringify({ error: 'No subscriptions provided' }), {
        status: 400,
        headers,
      });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Get VAPID JWT for authorization
    const audience = new URL(subscriptions[0].endpoint).origin;
    const vapidJWT = await generateVapidJWT(audience);

    // Send to each subscription
    for (const subscription of subscriptions) {
      try {
        // Prepare notification payload
        const notificationPayload = {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/icon-192.png',
          badge: payload.badge || '/icons/badge-72.png',
          vibrate: payload.vibrate || [200, 100, 200],
          data: payload.data || {},
          actions: payload.actions || [
            { action: 'view', title: 'Ver' },
            { action: 'dismiss', title: 'Descartar' },
          ],
          requireInteraction: payload.requireInteraction ?? true,
          tag: payload.tag || 'paic-admin',
          renotify: true,
          timestamp: Date.now(),
        };

        const jsonPayload = JSON.stringify(notificationPayload);

        // In production, use proper Web Push encryption
        // For now, send via fetch with basic headers
        const pushHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'TTL': '86400',
          'Authorization': `Bearer ${await generateVapidJWT(audience)}`,
        };

        // Send push notification
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: pushHeaders,
          body: jsonPayload,
        });

        if (!response.ok) {
          if (response.status === 410 || response.status === 404) {
            // Subscription expired/invalid - remove from DB
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscription.endpoint);
          }
          throw new Error(`Push failed: ${response.status} ${response.statusText}`);
        }

        results.sent++;
      } catch (e) {
        results.failed++;
        results.errors.push(`${subscription.endpoint}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[send-push] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers,
    });
  }
});