'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 21 Component Playground
 * design-system: design.md · designed-as-app · theme: Cobalt (light + dark)
 * shape: section index · prose column · sticky request/response panel
 * enrichment: graphite code cards only · reveal: none · contrast: light + dark
 * pre-emit critique: P5 H5 E4 S5 R5 V4
 */

import {
  Code2,
  Fingerprint,
  FlaskConical,
  HelpCircle,
  Key,
  Link2,
  Shield,
  Terminal,
  Webhook,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, GraphiteCard } from '@/components/ui/card';
import { CodeBlock, toPrismLang } from '@/components/ui/code-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CopyButton } from '@/components/developers/copy-button';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { ApiKeys } from '@/lib/types';

/* ══════════════════════════════════════════════════════════════════════════
 * 1 · Reference data — the single source of truth for the public API.
 * Mirrors PublicPaymentController and merchant-notification.service.ts.
 * ════════════════════════════════════════════════════════════════════════ */

type EndpointId = 'payment' | 'paymentLink' | 'payout' | 'retrieve' | 'retrieveOrder';

interface EndpointParam {
  name: string;
  type: string;
  required: boolean;
  in?: 'body' | 'path';
  desc: string;
}

interface EndpointMeta {
  id: EndpointId;
  method: 'GET' | 'POST';
  path: string;
  title: string;
  summary: string;
  hmac: boolean;
  returns: string;
  params: EndpointParam[];
}

const ENDPOINTS: EndpointMeta[] = [
  {
    id: 'payment',
    method: 'POST',
    path: '/payment',
    title: 'Crear pago directo',
    summary:
      'Crea una transacción de cobro PENDING server-to-server. Ideal para construir tu propia experiencia de pago.',
    hmac: true,
    returns: 'El objeto Transaction recién creado con su reference única y estado PENDING.',
    params: [
      {
        name: 'order',
        type: 'string',
        required: true,
        desc: 'Tu identificador único de la orden. Forma parte de la firma HMAC y previene cobros duplicados.',
      },
      {
        name: 'amount',
        type: 'string',
        required: true,
        desc: 'Monto con hasta 2 decimales, enviado como string para preservar precisión. Debe ser mayor a 0.',
      },
      { name: 'currency', type: 'enum USD | VES', required: true, desc: 'Moneda del cobro.' },
      {
        name: 'customerName',
        type: 'string',
        required: false,
        desc: 'Nombre del pagador (máx. 120 caracteres). Heredado; preferir customer.',
      },
      {
        name: 'customer',
        type: 'object',
        required: false,
        desc: 'Datos del pagador para registrarlo como cliente: { firstName, lastName, email (obligatorios), phone, address, country, cedula }. La cédula es OBLIGATORIA para cobros en VES (métodos venezolanos); para USD/USDT los datos son opcionales. Se deduplica por correo: reenviar el mismo email actualiza al cliente existente.',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        desc: 'Concepto del cobro (máx. 255 caracteres).',
      },
      {
        name: 'cardToken',
        type: 'string',
        required: false,
        desc: 'Token de tarjeta previamente tokenizada para un cobro inmediato.',
      },
    ],
  },
  {
    id: 'paymentLink',
    method: 'POST',
    path: '/payment/links',
    title: 'Crear link de pago',
    summary:
      'Genera programáticamente un enlace de pago alojado (Hosted Checkout) y devuelve su URL y token.',
    hmac: true,
    returns: 'Un objeto con el token, la url del checkout alojado y el detalle del cobro.',
    params: [
      {
        name: 'order',
        type: 'string',
        required: true,
        desc: 'Tu identificador único de la orden. Forma parte de la firma HMAC.',
      },
      {
        name: 'amount',
        type: 'string',
        required: true,
        desc: 'Monto con hasta 2 decimales, como string. Debe ser mayor a 0.',
      },
      { name: 'currency', type: 'enum USD | VES', required: true, desc: 'Moneda del cobro.' },
      {
        name: 'description',
        type: 'string',
        required: false,
        desc: 'Concepto mostrado al cliente en el checkout.',
      },
      {
        name: 'methods',
        type: 'array<PaymentMethod>',
        required: false,
        desc: 'Métodos habilitados: PAGO_MOVIL, C2P, TRANSFER, CARD, USDT, ZELLE. Por defecto todos los disponibles. Ver la sección Métodos de pago del panel para el detalle de cada uno.',
      },
      {
        name: 'successUrl',
        type: 'string (url)',
        required: false,
        desc: 'URL a la que se redirige al cliente tras un pago exitoso.',
      },
    ],
  },
  {
    id: 'payout',
    method: 'POST',
    path: '/payment/payout',
    title: 'Crear payout (retiro)',
    summary:
      'Envía fondos desde tu saldo. Para pagar a tu cliente final indica su destino como objeto (destination, con los campos que pide la pasarela); para liquidar tu propio saldo indica una cuenta registrada (bankAccountId). Consi resuelve la pasarela y el modo de retiro internamente.',
    hmac: true,
    returns: 'El objeto Transaction de tipo PAYOUT con su reference y estado PENDING.',
    params: [
      {
        name: 'amount',
        type: 'string',
        required: true,
        desc: 'Monto a retirar, con hasta 2 decimales. Debe ser mayor a 0.',
      },
      { name: 'currency', type: 'enum USD | VES', required: true, desc: 'Moneda del retiro.' },
      {
        name: 'bankAccountId',
        type: 'string',
        required: false,
        desc: 'Liquidación a tu cuenta bancaria registrada. Úsalo para retiros del comercio. Excluyente con destination.',
      },
      {
        name: 'destination',
        type: 'object',
        required: false,
        desc: 'Destino del cliente final como objeto (ej. { document, phone, bank } para Pago Móvil). Sus campos los define la pasarela que resuelve Consi; si falta uno requerido la API responde 400. Excluyente con bankAccountId.',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        desc: 'Concepto del retiro (máx. 255 caracteres).',
      },
      {
        name: 'order',
        type: 'string',
        required: false,
        desc: 'Identificador opcional. Si lo envías, forma parte de la firma HMAC.',
      },
    ],
  },
  {
    id: 'retrieve',
    method: 'GET',
    path: '/payment/:reference',
    title: 'Consultar por referencia',
    summary:
      'Recupera los detalles y el estado actual de un pago usando la referencia única de Consi.',
    hmac: false,
    returns: 'El objeto Transaction correspondiente a la referencia.',
    params: [
      {
        name: 'reference',
        type: 'string',
        required: true,
        in: 'path',
        desc: 'Referencia única generada por Consi, ej. CONSI-TRX-ABCD1234.',
      },
    ],
  },
  {
    id: 'retrieveOrder',
    method: 'GET',
    path: '/payment/order/:orderId',
    title: 'Consultar por orden',
    summary: 'Recupera el estado de un pago usando tu propio ID de orden de comercio.',
    hmac: false,
    returns: 'El objeto Transaction asociado a tu orderId.',
    params: [
      {
        name: 'orderId',
        type: 'string',
        required: true,
        in: 'path',
        desc: 'El identificador de orden que tú asignaste al crear el cobro.',
      },
    ],
  },
];

const WEBHOOK_EVENTS: { event: string; when: string; tone: 'ok' | 'warn' | 'bad' }[] = [
  {
    event: 'transaction.completed',
    when: 'El pago se liquidó correctamente. Esta es la señal para entregar el producto o servicio.',
    tone: 'ok',
  },
  {
    event: 'transaction.pending',
    when: 'El pago fue creado y está a la espera de confirmación del banco o del cliente.',
    tone: 'warn',
  },
  {
    event: 'transaction.failed',
    when: 'El pago fue rechazado, expiró o no pudo completarse.',
    tone: 'bad',
  },
];

/** Response bodies don't depend on the merchant's keys — only on where the
 * hosted checkout lives, so the link example shows a URL they can actually open. */
function buildResponses(origin: string): Record<EndpointId | 'webhook' | 'sdk', string> {
  return {
  payment: `{
  "success": true,
  "data": {
    "reference": "CONSI-TRX-ABCD1234",
    "order": "orden_101",
    "status": "PENDING",
    "currency": "USD",
    "amount": "150.00",
    "fee": "3.50",
    "net": "146.50",
    "createdAt": "2026-06-16T18:30:00.000Z"
  }
}`,
  paymentLink: `{
  "success": true,
  "data": {
    "token": "link_xyz123",
    "url": "${origin}/c/link_xyz123",
    "amount": "250.00",
    "currency": "VES",
    "description": "Enlace para suscripción mensual",
    "methods": ["CARD", "PAGO_MOVIL"],
    "status": "ACTIVE",
    "order": "orden_102",
    "createdAt": "2026-06-16T18:35:00.000Z"
  }
}`,
  payout: `{
  "success": true,
  "data": {
    "reference": "CONSI-PAYOUT-EFGH5678",
    "order": "payout_501",
    "type": "PAYOUT",
    "status": "PENDING",
    "currency": "VES",
    "amount": "500.00",
    "destination": { "document": "V-12345678", "phone": "0414-1234567", "bank": "0105" },
    "createdAt": "2026-06-16T18:40:00.000Z"
  }
}`,
  retrieve: `{
  "success": true,
  "data": {
    "reference": "CONSI-TRX-ABCD1234",
    "order": "orden_101",
    "status": "COMPLETED",
    "currency": "USD",
    "amount": "150.00",
    "fee": "3.50",
    "net": "146.50",
    "createdAt": "2026-06-16T18:30:00.000Z"
  }
}`,
  retrieveOrder: `{
  "success": true,
  "data": {
    "reference": "CONSI-TRX-ABCD1234",
    "order": "orden_101",
    "status": "COMPLETED",
    "currency": "USD",
    "amount": "150.00",
    "fee": "3.50",
    "net": "146.50",
    "createdAt": "2026-06-16T18:30:00.000Z"
  }
}`,
  webhook: `{
  "event": "transaction.completed",
  "reference": "CONSI-TRX-ABCD1234",
  "order": "orden_101",
  "type": "PAYIN",
  "status": "COMPLETED",
  "currency": "USD",
  "amount": "150.00",
  "fee": "3.50",
  "net": "146.50",
  "providerRef": "CONSI-PI-ABCD1234",
  "createdAt": "2026-06-16T18:30:00.000Z"
}`,
  sdk: `{
  "type": "consi:paid",
  "token": "link_xyz123",
  "status": "PAID",
  "reference": "CONSI-TRX-123456"
}`,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 2 · Section index — the left rail, and the mobile strip that replaces it.
 * ════════════════════════════════════════════════════════════════════════ */

type DocSection =
  | 'intro'
  | 'auth'
  | 'hmac'
  | 'checkout'
  | 'sdk'
  | 'endpoints'
  | 'webhooks'
  | 'testing';

interface SectionItem {
  id: DocSection;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const SECTION_GROUPS: { group: string; items: SectionItem[] }[] = [
  {
    group: 'Integración',
    items: [
      { id: 'intro', label: 'Introducción', icon: HelpCircle },
      { id: 'auth', label: 'Autenticación', icon: Key },
      { id: 'hmac', label: 'Firma HMAC', icon: Fingerprint },
      { id: 'checkout', label: 'Checkout', icon: Link2 },
      { id: 'sdk', label: 'SDK consi.js', icon: Code2 },
    ],
  },
  {
    group: 'Referencia',
    items: [
      { id: 'endpoints', label: 'Endpoints', icon: Terminal },
      { id: 'webhooks', label: 'Webhooks', icon: Webhook },
      { id: 'testing', label: 'Pruebas', icon: FlaskConical },
    ],
  },
];

const ALL_SECTIONS: SectionItem[] = SECTION_GROUPS.flatMap((g) => g.items);
const SECTION_IDS: DocSection[] = ALL_SECTIONS.map((i) => i.id);

/* ══════════════════════════════════════════════════════════════════════════
 * 3 · Snippets — built from the merchant's own live test credentials so the
 * code on screen is the code that runs. Placeholders only when keys fail to load.
 * ════════════════════════════════════════════════════════════════════════ */

interface SnippetCtx {
  apiKey: string;
  apiSecret: string;
  /** Public API base, e.g. https://panel.consi.com/api */
  base: string;
  /** Origin serving consi.js */
  origin: string;
}

function buildSnippets({ apiKey, apiSecret, base, origin }: SnippetCtx) {
  const sign = (order: string, amount: string, currency: string) => ({
    js: `const crypto = require('crypto');
const apiKey = '${apiKey}';
const secret = '${apiSecret}';
const order = '${order}';
const amount = '${amount}';
const currency = '${currency}';

const payload = [apiKey, order, amount, currency].join('|');
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');`,
    python: `import hmac
import hashlib
import requests

api_key = "${apiKey}"
secret = "${apiSecret}"
order = "${order}"
amount = "${amount}"
currency = "${currency}"

payload = f"{api_key}|{order}|{amount}|{currency}".encode('utf-8')
signature = hmac.new(secret.encode('utf-8'), payload, hashlib.sha256).hexdigest()

headers = {
    "Content-Type": "application/json",
    "x-api-key": api_key,
    "x-signature": signature
}`,
    php: `<?php
$apiKey = '${apiKey}';
$secret = '${apiSecret}';
$order = '${order}';
$amount = '${amount}';
$currency = '${currency}';

$payload = implode('|', [$apiKey, $order, $amount, $currency]);
$signature = hash_hmac('sha256', $payload, $secret);`,
  });

  const paymentSign = sign('orden_101', '150.00', 'USD');
  const linkSign = sign('orden_102', '250.00', 'VES');
  const payoutSign = sign('payout_501', '500.00', 'VES');

  return {
    payment: {
      curl: `curl -X POST ${base}/payment \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -H "x-signature: FIRMA_HMAC_CALCULADA" \\
  -d '{
    "order": "orden_101",
    "amount": "150.00",
    "currency": "USD",
    "customer": {
      "firstName": "Juan",
      "lastName": "Pérez",
      "email": "juan.perez@example.com",
      "cedula": "V-12345678"
    },
    "description": "Pago de Factura #101"
  }'`,
      js: `${paymentSign.js}

fetch('${base}/payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'x-signature': signature
  },
  body: JSON.stringify({
    order, amount, currency,
    // Datos del pagador. La cédula es obligatoria para cobros en VES.
    customer: {
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan.perez@example.com',
      cedula: 'V-12345678',
      phone: '04141234567'
    },
    description: 'Pago de Factura #101'
  })
})
  .then(res => res.json())
  .then(console.log);`,
      python: `${paymentSign.python}

body = {
    "order": order,
    "amount": amount,
    "currency": currency,
    "customer": {
        "firstName": "Juan",
        "lastName": "Pérez",
        "email": "juan.perez@example.com",
        "cedula": "V-12345678"  # obligatoria para VES
    },
    "description": "Pago de Factura #101"
}

response = requests.post("${base}/payment", json=body, headers=headers)
print(response.json())`,
      php: `${paymentSign.php}

$ch = curl_init('${base}/payment');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey,
    'x-signature: ' . $signature
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'order' => $order,
    'amount' => $amount,
    'currency' => $currency,
    'customer' => [
        'firstName' => 'Juan',
        'lastName' => 'Pérez',
        'email' => 'juan.perez@example.com',
        'cedula' => 'V-12345678'  // obligatoria para VES
    ],
    'description' => 'Pago de Factura #101'
]));

$response = curl_exec($ch);
echo $response;
?>`,
    },

    paymentLink: {
      curl: `curl -X POST ${base}/payment/links \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -H "x-signature: FIRMA_HMAC_CALCULADA" \\
  -d '{
    "order": "orden_102",
    "amount": "250.00",
    "currency": "VES",
    "description": "Enlace para suscripción mensual",
    "methods": ["CARD", "PAGO_MOVIL"],
    "successUrl": "https://mi-tienda.com/success"
  }'`,
      js: `${linkSign.js}

fetch('${base}/payment/links', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'x-signature': signature
  },
  body: JSON.stringify({
    order, amount, currency,
    description: 'Enlace para suscripción mensual',
    methods: ['CARD', 'PAGO_MOVIL'],
    successUrl: 'https://mi-tienda.com/success'
  })
})
  .then(res => res.json())
  .then(console.log);`,
      python: `${linkSign.python}

body = {
    "order": order,
    "amount": amount,
    "currency": currency,
    "description": "Enlace para suscripción mensual",
    "methods": ["CARD", "PAGO_MOVIL"],
    "successUrl": "https://mi-tienda.com/success"
}

response = requests.post("${base}/payment/links", json=body, headers=headers)
print(response.json())`,
      php: `${linkSign.php}

$ch = curl_init('${base}/payment/links');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey,
    'x-signature: ' . $signature
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'order' => $order,
    'amount' => $amount,
    'currency' => $currency,
    'description' => 'Enlace para suscripción mensual',
    'methods' => ['CARD', 'PAGO_MOVIL'],
    'successUrl' => 'https://mi-tienda.com/success'
]));

$response = curl_exec($ch);
echo $response;
?>`,
    },

    payout: {
      curl: `curl -X POST ${base}/payment/payout \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -H "x-signature: FIRMA_HMAC_CALCULADA" \\
  -d '{
    "order": "payout_501",
    "amount": "500.00",
    "currency": "VES",
    "destination": { "document": "V-12345678", "phone": "0414-1234567", "bank": "0105" },
    "description": "Retiro a Pago Móvil del cliente"
  }'`,
      js: `${payoutSign.js}

fetch('${base}/payment/payout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'x-signature': signature
  },
  body: JSON.stringify({
    order, amount, currency,
    // Destino del cliente final: objeto con los campos que pide la pasarela
    // (aquí Pago Móvil). Para liquidar tu propio saldo usa { bankAccountId }.
    destination: { document: 'V-12345678', phone: '0414-1234567', bank: '0105' },
    description: 'Retiro a Pago Móvil del cliente'
  })
})
  .then(res => res.json())
  .then(console.log);`,
      python: `${payoutSign.python}

body = {
    "order": order,
    "amount": amount,
    "currency": currency,
    # Destino del cliente final: objeto con los campos que pide la pasarela
    # (aquí Pago Móvil). Para liquidar tu propio saldo usa "bankAccountId".
    "destination": {"document": "V-12345678", "phone": "0414-1234567", "bank": "0105"},
    "description": "Retiro a Pago Móvil del cliente"
}

response = requests.post("${base}/payment/payout", json=body, headers=headers)
print(response.json())`,
      php: `${payoutSign.php}

$ch = curl_init('${base}/payment/payout');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey,
    'x-signature: ' . $signature
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'order' => $order,
    'amount' => $amount,
    'currency' => $currency,
    // Destino del cliente final (campos según la pasarela); para liquidar tu
    // saldo usa 'bankAccountId'.
    'destination' => ['document' => 'V-12345678', 'phone' => '0414-1234567', 'bank' => '0105'],
    'description' => 'Retiro a Pago Móvil del cliente'
]));

$response = curl_exec($ch);
echo $response;
?>`,
    },

    retrieve: {
      curl: `curl -X GET ${base}/payment/CONSI-TRX-ABCD1234 \\
  -H "x-api-key: ${apiKey}"`,
      js: `const apiKey = '${apiKey}';
const reference = 'CONSI-TRX-ABCD1234';

fetch(\`${base}/payment/\${reference}\`, {
  method: 'GET',
  headers: { 'x-api-key': apiKey }
})
  .then(res => res.json())
  .then(console.log);`,
      python: `import requests

api_key = "${apiKey}"
reference = "CONSI-TRX-ABCD1234"

headers = {"x-api-key": api_key}

response = requests.get(f"${base}/payment/{reference}", headers=headers)
print(response.json())`,
      php: `<?php
$apiKey = '${apiKey}';
$reference = 'CONSI-TRX-ABCD1234';

$ch = curl_init("${base}/payment/" . $reference);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['x-api-key: ' . $apiKey]);

$response = curl_exec($ch);
echo $response;
?>`,
    },

    retrieveOrder: {
      curl: `curl -X GET ${base}/payment/order/orden_101 \\
  -H "x-api-key: ${apiKey}"`,
      js: `const apiKey = '${apiKey}';
const orderId = 'orden_101';

fetch(\`${base}/payment/order/\${orderId}\`, {
  method: 'GET',
  headers: { 'x-api-key': apiKey }
})
  .then(res => res.json())
  .then(console.log);`,
      python: `import requests

api_key = "${apiKey}"
order_id = "orden_101"

headers = {"x-api-key": api_key}

response = requests.get(f"${base}/payment/order/{order_id}", headers=headers)
print(response.json())`,
      php: `<?php
$apiKey = '${apiKey}';
$orderId = 'orden_101';

$ch = curl_init("${base}/payment/order/" . $orderId);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['x-api-key: ' . $apiKey]);

$response = curl_exec($ch);
echo $response;
?>`,
    },

    /* Webhooks are verified on YOUR server — there is no cURL form, so the
     * panel simply doesn't offer that tab for this section. */
    webhook: {
      js: `const crypto = require('crypto');

// En tu endpoint de Express / Next.js de webhooks:
const secret = '${apiSecret}';
const signature = req.headers['x-webhook-signature'];
const payload = JSON.stringify(req.body);

const expected = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

const valid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expected)
);

if (valid) {
  console.log('Webhook verificado:', req.body.event);
  res.sendStatus(200); // responde 2xx antes de procesar
} else {
  res.status(400).send('Firma inválida');
}`,
      python: `import hmac
import hashlib

secret = "${apiSecret}"
signature = request.headers.get("x-webhook-signature")
payload_bytes = request.data  # Datos crudos JSON recibidos

expected = hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()

if hmac.compare_digest(signature, expected):
    print("Firma válida, procesar webhook")
else:
    print("Firma inválida, denegar")`,
      php: `<?php
$secret = '${apiSecret}';
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'];
$payload = file_get_contents('php://input');

$expected = hash_hmac('sha256', $payload, $secret);

if (hash_equals($expected, $signature)) {
    echo "Firma válida. Evento recibido.";
} else {
    http_response_code(400);
    echo "Firma inválida";
}
?>`,
    },

    /* The SDK panel switches on framework, not on language — that is the axis
     * that actually varies for a front-end integration. */
    sdk: {
      html: `<!-- 1. Carga el SDK una sola vez, antes de </body> -->
<script src="${origin}/consi.js"></script>

<button id="pay">Pagar con Consi</button>

<script>
  document.getElementById('pay').addEventListener('click', () => {
    // El token lo generas en tu backend (POST /payment/links)
    Consi.checkout({
      token: 'link_xyz123',
      onSuccess: (data) => {
        console.log('Pago confirmado:', data.reference);
        window.location.href = '/gracias';
      },
      onClose: () => console.log('El cliente cerró el modal'),
    });
  });
</script>`,
      react: `import { useCallback, useEffect } from 'react';

// Carga el script de consi.js una sola vez por app
function useConsi() {
  useEffect(() => {
    if (document.getElementById('consi-sdk')) return;
    const s = document.createElement('script');
    s.id = 'consi-sdk';
    s.src = '${origin}/consi.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);
}

export function PayButton({ token }) {
  useConsi();

  const pay = useCallback(() => {
    window.Consi?.checkout({
      token,
      onSuccess: (data) => alert('Pagado: ' + data.reference),
      onClose: () => console.log('Modal cerrado'),
    });
  }, [token]);

  return <button onClick={pay}>Pagar ahora</button>;
}`,
      vue: `<script setup>
import { onMounted } from 'vue';

const props = defineProps({ token: String });

onMounted(() => {
  if (document.getElementById('consi-sdk')) return;
  const s = document.createElement('script');
  s.id = 'consi-sdk';
  s.src = '${origin}/consi.js';
  s.async = true;
  document.body.appendChild(s);
});

function pay() {
  window.Consi?.checkout({
    token: props.token,
    onSuccess: (data) => alert('Pagado: ' + data.reference),
    onClose: () => console.log('Modal cerrado'),
  });
}
</script>

<template>
  <button @click="pay">Pagar ahora</button>
</template>`,
    },
  };
}

type Snippets = ReturnType<typeof buildSnippets>;

/* ══════════════════════════════════════════════════════════════════════════
 * 4 · Shared page voice
 * ════════════════════════════════════════════════════════════════════════ */

/** Method is a readout, not a traffic light: POST carries the signal, GET is quiet. */
function MethodTag({ method, onDark = false }: { method: 'GET' | 'POST'; onDark?: boolean }) {
  const tone = onDark
    ? method === 'POST'
      ? 'text-[var(--color-accent-on-graphite)]'
      : 'text-[var(--color-on-graphite-2)]'
    : method === 'POST'
      ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
      : 'bg-[var(--color-paper-3)] text-[var(--color-ink-3)]';
  return (
    <span
      className={cn(
        'inline-block rounded-[var(--radius-xs)] font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)]',
        onDark ? '' : 'px-1.5 py-0.5',
        tone,
      )}
    >
      {method}
    </span>
  );
}

/** Numbered step: a ruler-drawn square, never a circle badge. */
function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-[var(--space-xs)]">
      <span className="num mt-0.5 grid size-5 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-[var(--color-accent-soft)] text-[length:var(--text-2xs)] font-semibold text-[var(--color-accent)]">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[var(--color-ink)]">{title}</p>
        {children}
      </div>
    </li>
  );
}

/** Segmented control living on graphite — the panel's only chrome. */
function TabStrip<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex shrink-0 gap-0.5 rounded-[var(--radius-sm)] border border-[var(--color-graphite-rule)] bg-[var(--color-graphite-2)] p-0.5"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'whitespace-nowrap rounded-[var(--radius-xs)] px-2 py-1 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)]',
            'transition-colors duration-[var(--dur-fast)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-focus)]',
            value === t.id
              ? 'bg-[var(--color-accent-on-graphite)] text-[var(--color-graphite)]'
              : 'text-[var(--color-on-graphite-3)] hover:text-[var(--color-on-graphite)]',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const API_TABS = [
  { id: 'curl', label: 'cURL' },
  { id: 'js', label: 'Node' },
  { id: 'python', label: 'Python' },
  { id: 'php', label: 'PHP' },
] as const;

const WEBHOOK_TABS = API_TABS.filter((t) => t.id !== 'curl');

const SDK_TABS = [
  { id: 'html', label: 'HTML' },
  { id: 'react', label: 'React' },
  { id: 'vue', label: 'Vue' },
] as const;

type ApiLang = (typeof API_TABS)[number]['id'];
type SdkFramework = (typeof SDK_TABS)[number]['id'];

/**
 * The request/response panel. What the merchant is reading on the left, in the
 * language they picked, with the exact body the API sends back.
 * No fake browser chrome — `design.md` bans re-drawn window furniture.
 */
function RequestPanel({
  method,
  path,
  req,
  reqLang,
  res,
  resLabel,
  resStatus,
  tabs,
  tabValue,
  onTab,
}: {
  method?: 'GET' | 'POST';
  path: string;
  req: string;
  reqLang: string;
  res: string;
  resLabel: string;
  /** Only a real HTTP response carries a status. Webhook bodies and postMessage
   * payloads are not responses — labelling them "200 OK" would be a lie. */
  resStatus?: string;
  tabs: readonly { id: string; label: string }[];
  tabValue: string;
  onTab: (id: string) => void;
}) {
  return (
    <GraphiteCard className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-graphite-rule)] px-[var(--space-xs)] py-2">
        <span className="flex min-w-0 items-baseline gap-2">
          {method ? <MethodTag method={method} onDark /> : null}
          <code className="num truncate text-[length:var(--text-2xs)] text-[var(--color-on-graphite)]">
            {path}
          </code>
        </span>
        <TabStrip tabs={tabs} value={tabValue} onChange={onTab} label="Lenguaje del ejemplo" />
      </div>

      <CodeBlock code={req} language={reqLang} maxHeight={380} className="rounded-none border-0" />

      <div className="flex items-center justify-between border-y border-[var(--color-graphite-rule)] px-[var(--space-xs)] py-2">
        <span className="label text-[var(--color-on-graphite-3)]">{resLabel}</span>
        {resStatus ? (
          <span className="num text-[length:var(--text-2xs)] text-[var(--color-tok-str)]">
            {resStatus}
          </span>
        ) : null}
      </div>

      <CodeBlock
        code={res}
        language="json"
        maxHeight={240}
        showCopy={false}
        className="rounded-none border-0"
      />
    </GraphiteCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * 5 · Interactive pieces — the "playground" half of the macrostructure.
 * ════════════════════════════════════════════════════════════════════════ */

function SignatureGenerator({ keys }: { keys: ApiKeys | null }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [order, setOrder] = useState('orden-123');
  const [amount, setAmount] = useState('100.00');
  const [currency, setCurrency] = useState('USD');
  const [signature, setSignature] = useState('');

  useEffect(() => {
    if (!keys) return;
    setApiKeyInput(keys.apiKeyTest);
    setSecretInput(keys.apiSecretTest);
  }, [keys]);

  const payload = `${apiKeyInput || 'API_KEY'}|${order}|${amount}|${currency}`;

  useEffect(() => {
    let cancelled = false;
    async function calculate() {
      if (!apiKeyInput || !secretInput) {
        setSignature('');
        return;
      }
      try {
        const enc = new TextEncoder();
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          enc.encode(secretInput),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign'],
        );
        const buf = await window.crypto.subtle.sign('HMAC', cryptoKey, enc.encode(payload));
        const hex = Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        if (!cancelled) setSignature(hex);
      } catch {
        if (!cancelled) setSignature('');
      }
    }
    calculate();
    return () => {
      cancelled = true;
    };
  }, [apiKeyInput, secretInput, payload]);

  return (
    <Card className="flex flex-col gap-[var(--space-sm)] p-[var(--space-sm)]">
      <div>
        <h3 className="text-[length:var(--text-base)]">Calculadora de firma</h3>
        <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          Se rellena con tus credenciales de prueba. Todo se calcula en tu navegador — el
          secret nunca sale de esta pestaña.
        </p>
      </div>

      <div className="grid gap-[var(--space-xs)] sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sig-key">API Key</Label>
          <Input
            id="sig-key"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="c_test_…"
            className="num"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sig-secret">API Secret</Label>
          <Input
            id="sig-secret"
            type="password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="c_test_secret_…"
            className="num"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sig-order">Order</Label>
          <Input
            id="sig-order"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="num"
          />
        </div>
        <div className="grid grid-cols-2 gap-[var(--space-2xs)]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sig-amount">Amount</Label>
            <Input
              id="sig-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="num"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sig-currency">Currency</Label>
            <Select
              id="sig-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="num"
            >
              <option value="USD">USD</option>
              <option value="VES">VES</option>
              <option value="USDT">USDT</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Cadena a firmar · apiKey|order|amount|currency</Label>
        <p className="num overflow-x-auto whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-2.5 py-2 text-[length:var(--text-2xs)] text-[var(--color-ink-2)]">
          {payload}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>x-signature · HMAC-SHA256 hex</Label>
        <div className="flex gap-[var(--space-2xs)]">
          <Input
            readOnly
            value={signature}
            placeholder="Ingresa API Key y Secret para calcular la firma"
            className="num text-[length:var(--text-2xs)]"
          />
          <CopyButton value={signature} label="firma" />
        </div>
      </div>
    </Card>
  );
}

function SdkPlayground({ origin }: { origin: string }) {
  const [currency, setCurrency] = useState<'USD' | 'VES' | 'USDT'>('USD');
  const [amount, setAmount] = useState('100.00');
  const [description, setDescription] = useState('Prueba de integración SDK');
  const [mode, setMode] = useState<'mock' | 'live'>('mock');
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [mockOpen, setMockOpen] = useState(false);
  const [mockToken, setMockToken] = useState('mock-token');

  const log = (msg: string) =>
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  async function run() {
    setBusy(true);
    log(`Iniciando prueba en modo ${mode.toUpperCase()}`);
    try {
      if (!(window as unknown as { Consi?: unknown }).Consi) {
        log('Cargando consi.js…');
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = `${origin}/consi.js`;
          s.async = true;
          s.onload = () => {
            log('consi.js cargado');
            resolve();
          };
          s.onerror = () => reject(new Error('No se pudo cargar consi.js'));
          document.body.appendChild(s);
        });
      } else {
        log('consi.js ya disponible en window');
      }

      const Consi = (window as unknown as { Consi: any }).Consi;

      if (mode === 'live') {
        log('Creando link de pago real vía POST /payment/links…');
        const link = await api.createPaymentLink({
          amount,
          currency,
          description,
          methods: ['CARD', 'PAGO_MOVIL'],
        });
        log(`Token recibido: ${link.token}`);
        log(`Consi.checkout({ token: "${link.token}" })`);
        Consi.checkout({
          token: link.token,
          onSuccess: (data: unknown) => {
            log('onSuccess recibido');
            log(JSON.stringify(data));
          },
          onClose: () => log('onClose recibido (modal cerrado)'),
        });
      } else {
        const token = `mock-token-${Math.random().toString(36).slice(2, 11)}`;
        setMockToken(token);
        log(`Token simulado: ${token}`);
        log(`Consi.checkout({ token: "${token}" }) — simulado`);
        setMockOpen(true);
      }
    } catch (err) {
      log(`Error: ${err instanceof Error ? err.message : 'desconocido'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-[var(--space-sm)] p-[var(--space-sm)]">
      <div>
        <h3 className="text-[length:var(--text-base)]">Playground</h3>
        <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          <strong className="font-medium text-[var(--color-ink)]">Mocked</strong> corre en memoria
          para entender los callbacks.{' '}
          <strong className="font-medium text-[var(--color-ink)]">Live</strong> crea un link real y
          abre la pasarela de verdad.
        </p>
      </div>

      <div className="grid gap-[var(--space-xs)] sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Modo</Label>
          <div className="flex gap-[var(--space-2xs)]">
            {(['mock', 'live'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 rounded-[var(--radius-sm)] border px-3 py-1.5 text-[length:var(--text-sm)]',
                  'transition-colors duration-[var(--dur-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
                  mode === m
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
                    : 'border-[var(--color-rule)] text-[var(--color-ink-3)] hover:border-[var(--color-rule-2)] hover:text-[var(--color-ink)]',
                )}
              >
                {m === 'mock' ? 'Mocked' : 'Live'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[var(--space-2xs)]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pg-amount">Monto</Label>
            <Input
              id="pg-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="num"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pg-currency">Moneda</Label>
            <Select
              id="pg-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'USD' | 'VES' | 'USDT')}
              className="num"
            >
              <option value="USD">USD</option>
              <option value="VES">VES</option>
              <option value="USDT">USDT</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pg-desc">Descripción</Label>
        <Input
          id="pg-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between gap-[var(--space-2xs)]">
        <Button type="button" onClick={run} disabled={busy}>
          {busy ? 'Preparando…' : 'Abrir checkout'}
        </Button>
        {logs.length > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setLogs([])}>
            Limpiar consola
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Consola de eventos</Label>
        <GraphiteCard className="num h-32 overflow-y-auto p-[var(--space-2xs)] text-[length:var(--text-2xs)] leading-relaxed">
          {logs.length === 0 ? (
            <span className="text-[var(--color-on-graphite-3)]">
              Los eventos del SDK aparecerán aquí.
            </span>
          ) : (
            logs.map((l, i) => (
              <div key={i} className="whitespace-pre-wrap text-[var(--color-on-graphite-2)]">
                {l}
              </div>
            ))
          )}
        </GraphiteCard>
      </div>

      {mockOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Checkout simulado"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-scrim)] p-[var(--space-sm)]"
        >
          <Card className="w-full max-w-sm p-[var(--space-md)]">
            <div className="flex items-baseline justify-between gap-2 border-b border-[var(--color-rule)] pb-[var(--space-2xs)]">
              <h3 className="text-[length:var(--text-md)]">Checkout Consi</h3>
              <span className="label text-[var(--color-warn)]">Simulado</span>
            </div>
            <div className="py-[var(--space-md)] text-center">
              <div className="num text-[length:var(--text-2xl)] font-medium text-[var(--color-ink)]">
                {amount} {currency}
              </div>
              <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                {description}
              </p>
            </div>
            <p className="pb-[var(--space-2xs)] text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              Elige el callback que quieres provocar:
            </p>
            <div className="flex gap-[var(--space-2xs)]">
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  log('onSuccess recibido — simulado');
                  log(
                    JSON.stringify({
                      type: 'consi:paid',
                      token: mockToken,
                      status: 'PAID',
                      reference: 'MOCK-TRX-777888',
                    }),
                  );
                  setMockOpen(false);
                }}
              >
                Pago exitoso
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  log('onClose recibido — simulado');
                  setMockOpen(false);
                }}
              >
                Cerrar modal
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * 6 · Page
 * ════════════════════════════════════════════════════════════════════════ */

export default function DocsPage() {
  const [keys, setKeys] = useState<ApiKeys | null>(null);
  const [section, setSection] = useState<DocSection>('intro');
  const [lang, setLang] = useState<ApiLang>('curl');
  const [framework, setFramework] = useState<SdkFramework>('html');
  const [activeEndpoint, setActiveEndpoint] = useState<EndpointId>('payment');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    api
      .getApiKeys()
      .then(setKeys)
      .catch(() => setKeys(null));
  }, []);

  // Sections are shareable: /docs#webhooks opens on webhooks.
  useEffect(() => {
    setOrigin(window.location.origin);
    const hash = window.location.hash.slice(1) as DocSection;
    if (SECTION_IDS.includes(hash)) setSection(hash);
  }, []);

  function goTo(id: DocSection) {
    setSection(id);
    // replaceState, not location.hash — the latter yanks the scroll position.
    window.history.replaceState(null, '', `#${id}`);
    // Only pull the page up if the reader has already scrolled past the start of
    // the prose; otherwise switching sections would jump for no reason.
    const el = document.getElementById('doc-prose');
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
  }

  const apiBase = `${origin}/api`;
  const snippets: Snippets = buildSnippets({
    apiKey: keys?.apiKeyTest ?? 'TU_API_KEY',
    apiSecret: keys?.apiSecretTest ?? 'TU_API_SECRET',
    base: apiBase,
    origin,
  });
  const responses = buildResponses(origin);

  const endpoint = ENDPOINTS.find((e) => e.id === activeEndpoint) ?? ENDPOINTS[0];

  // Which tabs the panel offers depends on the section: webhooks have no cURL
  // form, and the SDK varies by framework rather than by language.
  const panel = (() => {
    if (section === 'sdk') {
      return {
        path: 'Consi.checkout()',
        req: snippets.sdk[framework],
        reqLang: toPrismLang(framework),
        res: responses.sdk,
        resLabel: 'Payload de onSuccess',
        tabs: SDK_TABS as readonly { id: string; label: string }[],
        tabValue: framework as string,
        onTab: (next: string) => setFramework(next as SdkFramework),
      };
    }
    if (section === 'webhooks') {
      const value = lang === 'curl' ? 'js' : lang;
      return {
        method: 'POST' as const,
        path: 'tu-servidor/webhooks/consi',
        req: snippets.webhook[value as keyof typeof snippets.webhook],
        reqLang: toPrismLang(value),
        res: responses.webhook,
        resLabel: 'Cuerpo del evento',
        tabs: WEBHOOK_TABS as readonly { id: string; label: string }[],
        tabValue: value as string,
        onTab: (next: string) => setLang(next as ApiLang),
      };
    }
    const id: EndpointId = section === 'endpoints' ? activeEndpoint : 'payment';
    const meta = ENDPOINTS.find((e) => e.id === id)!;
    return {
      method: meta.method,
      path: `/api${meta.path}`,
      req: snippets[id][lang],
      reqLang: toPrismLang(lang),
      res: responses[id],
      resLabel: 'Respuesta',
      resStatus: '200 OK',
      tabs: API_TABS as readonly { id: string; label: string }[],
      tabValue: lang as string,
      onTab: (next: string) => setLang(next as ApiLang),
    };
  })();

  const indexItem = (active: boolean) =>
    cn(
      'relative flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[length:var(--text-sm)]',
      'whitespace-nowrap transition-colors duration-[var(--dur-fast)]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
      active
        ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
        : 'text-[var(--color-ink-3)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]',
    );

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Documentación de la API"
        lede="Autenticación, firma HMAC, checkout, endpoints y webhooks. Los ejemplos usan tus credenciales de prueba reales."
        action={
          <Button variant="outline" onClick={() => goTo('endpoints')}>
            <Terminal size={15} /> Referencia
          </Button>
        }
      />

      {/* Índice horizontal debajo de lg — mismo patrón que el rail móvil del panel. */}
      <nav
        aria-label="Secciones"
        className="-mx-[var(--space-sm)] flex gap-1 overflow-x-auto border-y border-[var(--color-rule)] bg-[var(--color-surface)] px-[var(--space-sm)] py-1.5 lg:hidden"
      >
        {ALL_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={section === id ? 'true' : undefined}
            onClick={() => goTo(id)}
            className={cn(indexItem(section === id), 'shrink-0')}
          >
            <Icon size={15} strokeWidth={section === id ? 2.25 : 1.75} />
            {label}
          </button>
        ))}
      </nav>

      {/* Three columns only from 2xl. At 1280 the app rail already eats 244px, and
        * squeezing a side panel in on top left the reference table's description
        * column at ~130px — the panel drops under the prose instead. */}
      <div className="grid items-start gap-[var(--space-md)] min-[1024px]:grid-cols-[9.5rem_minmax(0,1fr)] min-[1400px]:grid-cols-[10rem_minmax(0,1fr)_24rem]">
        {/* ── Columna 1 · índice ─────────────────────────────────────────── */}
        <nav
          aria-label="Secciones de la documentación"
          className="hidden lg:sticky lg:top-[var(--space-md)] lg:flex lg:flex-col lg:gap-0.5"
        >
          {SECTION_GROUPS.map((g) => (
            <div key={g.group} className="flex flex-col gap-0.5 pb-[var(--space-2xs)]">
              <div className="label px-2.5 pb-1 pt-1.5">{g.group}</div>
              {g.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-current={section === id ? 'true' : undefined}
                  onClick={() => goTo(id)}
                  className={indexItem(section === id)}
                >
                  {section === id ? (
                    <span
                      className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-[var(--color-accent)]"
                      aria-hidden
                    />
                  ) : null}
                  <Icon size={15} strokeWidth={section === id ? 2.25 : 1.75} />
                  {label}
                </button>
              ))}
            </div>
          ))}

          <Link
            href="/developers"
            className="mt-[var(--space-2xs)] flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-rule)] px-2.5 py-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-rule-2)] hover:text-[var(--color-ink)]"
          >
            <Key size={15} strokeWidth={1.75} />
            Mis claves
          </Link>
        </nav>

        {/* ── Columna 2 · prosa ──────────────────────────────────────────── */}
        <div id="doc-prose" className="doc-prose min-w-0 scroll-mt-[var(--space-md)]">
          {section === 'intro' && (
            <>
              <h2>Introducción</h2>
              <p>
                La API de <strong>Consi</strong> permite a empresas en Venezuela cobrar de forma
                automatizada y multi-moneda (USD y VES), con métodos tradicionales y alternativos.
              </p>
              <p>Hay tres caminos de integración; elige el que encaje con tu sistema:</p>

              <div className="mt-[var(--space-sm)] grid gap-[var(--space-2xs)]">
                {[
                  {
                    icon: Link2,
                    title: 'Hosted Checkout',
                    desc: 'Redirige a una página de pago alojada por Consi. Cero código en tu frontend.',
                    to: 'checkout' as DocSection,
                  },
                  {
                    icon: Code2,
                    title: 'Checkout incrustado',
                    desc: 'consi.js abre la pasarela en un modal sobre tu web. El cliente no se va.',
                    to: 'sdk' as DocSection,
                  },
                  {
                    icon: Terminal,
                    title: 'Server-to-server',
                    desc: 'Creas los cobros desde tu backend y construyes tu propia experiencia.',
                    to: 'endpoints' as DocSection,
                  },
                ].map(({ icon: Icon, title, desc, to }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => goTo(to)}
                    className="flex gap-[var(--space-xs)] rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-[var(--color-surface)] p-[var(--space-xs)] text-left transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.75}
                      className="mt-0.5 shrink-0 text-[var(--color-accent)]"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-[var(--color-ink)]">{title}</span>
                      <span className="block text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                        {desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <h3>Base URL</h3>
              <p>Todas las rutas de esta referencia cuelgan de una misma base:</p>
              <div className="flex items-center gap-[var(--space-2xs)]">
                <code className="num min-w-0 flex-1 truncate rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-2.5 py-2 text-[length:var(--text-sm)] text-[var(--color-ink)]">
                  {apiBase || '/api'}
                </code>
                <CopyButton value={apiBase} label="Base URL" />
              </div>
            </>
          )}

          {section === 'auth' && (
            <>
              <h2>Autenticación</h2>
              <p>
                Toda petición viaja sobre HTTPS y se autentica con la cabecera{' '}
                <code>x-api-key</code>. Cada comercio tiene dos juegos de claves, disponibles en{' '}
                <Link href="/developers">Desarrolladores</Link>.
              </p>

              <div className="mt-[var(--space-sm)] grid gap-[var(--space-2xs)] sm:grid-cols-2">
                {[
                  {
                    env: 'Test',
                    key: 'c_test_…',
                    desc: 'Simula el ciclo completo sin mover dinero real ni tocar cuentas bancarias.',
                  },
                  {
                    env: 'Live',
                    key: 'c_live_…',
                    desc: 'Cobros reales. Cámbiala solo al pasar a producción.',
                  },
                ].map(({ env, key, desc }) => (
                  <Card key={env} className="p-[var(--space-xs)]">
                    <span className="label">{env}</span>
                    <p className="num pt-1 text-[length:var(--text-sm)] text-[var(--color-ink)]">
                      x-api-key: {key}
                    </p>
                    <p className="pt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                      {desc}
                    </p>
                  </Card>
                ))}
              </div>

              <Notice kind="warn" className="mt-[var(--space-sm)]">
                El <strong>API Secret</strong> firma peticiones: vive solo en tu servidor. Nunca en
                el frontend, nunca en un repositorio.
              </Notice>
            </>
          )}

          {section === 'hmac' && (
            <>
              <h2>Firma HMAC</h2>
              <p>
                Las peticiones que crean recursos (<code>POST</code>) llevan además una firma
                digital en la cabecera <code>x-signature</code>. Así el monto y la moneda no se
                pueden alterar en tránsito.
              </p>

              <ol className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-xs)]">
                <Step n={1} title="Concatena con tuberías">
                  <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                    En este orden exacto:
                  </p>
                  <p className="num mt-1.5 overflow-x-auto whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-2.5 py-1.5 text-[length:var(--text-sm)] text-[var(--color-accent)]">
                    apiKey|order|amount|currency
                  </p>
                </Step>
                <Step n={2} title="Usa tu API Secret como clave">
                  <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                    El del mismo ambiente que la API Key que estás enviando.
                  </p>
                </Step>
                <Step n={3} title="Calcula HMAC-SHA256 en hexadecimal">
                  <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                    El resultado va tal cual en <code>x-signature</code>.
                  </p>
                </Step>
              </ol>

              <div className="mt-[var(--space-md)]">
                <SignatureGenerator keys={keys} />
              </div>
            </>
          )}

          {section === 'checkout' && (
            <>
              <h2>Checkout</h2>
              <p>
                Consi trae una interfaz de pago ya construida donde el pagador elige entre{' '}
                <strong>Pago Móvil, transferencia, tarjeta o USDT</strong>. Puedes usarla de cuatro
                maneras.
              </p>

              <h3>1 · Flujo redirigido (Hosted)</h3>
              <p>
                Crea un link desde tu backend y redirige al cliente a la <code>url</code> que
                devuelve la API. Al liquidar, Consi lo envía a tu <code>successUrl</code>.
              </p>

              <h3>2 · Modal incrustado (Drop-in)</h3>
              <p>
                Con <code>consi.js</code> la pasarela se abre en un iframe sobre tu web, sin
                redirigir. Incrusta el script una vez e invoca{' '}
                <code>Consi.checkout(&#123; token &#125;)</code>. El detalle completo está en{' '}
                <button type="button" className="link" onClick={() => goTo('sdk')}>
                  SDK consi.js
                </button>
                .
              </p>

              <h3>3 · Consi Elements (tarjeta en tu propia UI)</h3>
              <p>
                Si quieres que el cliente rellene los campos de tarjeta dentro de tu interfaz,
                Elements monta un iframe aislado que tokeniza contra el vault de Consi — cumples
                PCI DSS sin que un número de tarjeta toque tus servidores.
              </p>

              <ol className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-sm)]">
                <Step n={1} title="Crea el contenedor">
                  <div className="mt-1.5">
                    <CodeBlock
                      code={'<div id="card-element"></div>'}
                      language="markup"
                      maxHeight={60}
                    />
                  </div>
                </Step>
                <Step n={2} title="Monta el iframe con tus estilos">
                  <div className="mt-1.5">
                    <CodeBlock
                      language="javascript"
                      maxHeight={170}
                      code={`const elements = Consi.elements({
  style: {
    background: '#1e293b',  // fondo del iframe
    color: '#ffffff',       // texto e inputs
    borderColor: '#334155', // bordes de inputs
    borderRadius: '8px'
  }
});
const card = elements.create('card');
card.mount('#card-element');`}
                    />
                  </div>
                </Step>
                <Step n={3} title="Tokeniza al pagar">
                  <div className="mt-1.5">
                    <CodeBlock
                      language="javascript"
                      maxHeight={110}
                      code={`const res = await card.tokenize();
if (res.token) {
  // Envía res.token a tu backend para crear la transacción directa
} else {
  console.error(res.error);
}`}
                    />
                  </div>
                </Step>
              </ol>

              <h3>4 · Pago Móvil automático</h3>
              <p>
                En vez de pedirle al cliente la referencia bancaria, pídele el{' '}
                <strong>teléfono</strong> desde el que transfirió. Consi busca entre los avisos
                entrantes de la banca uno que cuadre en monto exacto en VES y en los últimos 7
                dígitos del emisor.
              </p>

              <div className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-2xs)] rounded-[var(--radius-md)] border border-[var(--color-rule)] p-[var(--space-xs)]">
                <span className="label">Confirmación automática</span>
                <p className="num text-[length:var(--text-sm)] text-[var(--color-accent)]">
                  POST /api/checkout/:token/confirm-auto
                </p>
                <CodeBlock code={`{\n  "phone": "04125551234"\n}`} language="json" maxHeight={80} />
                <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                  Si la transferencia ya llegó, el pago se completa de inmediato — sin referencias
                  ni intervención manual.
                </p>
              </div>

              <Notice kind="info" className="mt-[var(--space-sm)]">
                <p className="font-medium text-[var(--color-ink)]">Teléfonos de prueba</p>
                <p className="mt-1">
                  En test no hay banco real emitiendo avisos, así que la conciliación normal nunca
                  cuadraría. Cualquier teléfono cuyos 7 dígitos finales sean ceros —{' '}
                  <span className="num">0412-000-0000</span>,{' '}
                  <span className="num">0414-000-0000</span> — se aprueba siempre.
                </p>
                <p className="mt-1">
                  ¿Quieres simular el aviso bancario real? Envía primero{' '}
                  <span className="num">POST /api/webhooks/pago-movil-bank</span> con{' '}
                  <span className="num">{'{ phone, amount, reference }'}</span> y confirma con ese
                  mismo teléfono.
                </p>
              </Notice>
            </>
          )}

          {section === 'sdk' && (
            <>
              <h2>SDK consi.js</h2>
              <p>
                Una librería de ~2 KB, sin dependencias, que abre la pasarela en un modal iframe
                sobre tu sitio. El cliente paga sin salir de tu web y tú recibes el resultado por
                callback.
              </p>

              <ol className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-sm)]">
                <Step n={1} title="Carga el SDK">
                  <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                    Una sola vez por documento, antes de <code>&lt;/body&gt;</code>.
                  </p>
                  <div className="mt-1.5">
                    <CodeBlock
                      code={`<script src="${origin}/consi.js"></script>`}
                      language="markup"
                      maxHeight={60}
                    />
                  </div>
                </Step>
                <Step n={2} title="Genera el token en tu backend">
                  <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                    Con <code>POST /payment/links</code>. La respuesta trae{' '}
                    <code>data.token</code>. El API Secret nunca baja al navegador.
                  </p>
                </Step>
                <Step n={3} title="Abre el checkout">
                  <div className="mt-1.5">
                    <CodeBlock
                      language="javascript"
                      maxHeight={130}
                      code={`Consi.checkout({
  token: 'link_xyz123',
  onSuccess: (data) => console.log('Pagado:', data.reference),
  onClose: () => console.log('Modal cerrado'),
});`}
                    />
                  </div>
                </Step>
              </ol>

              <h3>Consi.checkout(options)</h3>
              <div className="mt-[var(--space-2xs)]">
                <Table className="min-w-[26rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Opción</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Req.</TableHead>
                      <TableHead>Descripción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="num whitespace-nowrap text-[var(--color-ink)]">
                        token
                      </TableCell>
                      <TableCell className="num whitespace-nowrap text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                        string
                      </TableCell>
                      <TableCell className="text-[length:var(--text-sm)] font-medium text-[var(--color-bad)]">
                        Sí
                      </TableCell>
                      <TableCell className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                        Token del link generado en tu backend. Lanza error si falta.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="num whitespace-nowrap text-[var(--color-ink)]">
                        onSuccess
                      </TableCell>
                      <TableCell className="num whitespace-nowrap text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                        (data) =&gt; void
                      </TableCell>
                      <TableCell className="text-[length:var(--text-sm)] text-[var(--color-ink-4)]">
                        No
                      </TableCell>
                      <TableCell className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                        Corre al confirmarse el pago, con el payload de{' '}
                        <code className="num">consi:paid</code>. El modal se cierra solo ~1.2 s
                        después.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="num whitespace-nowrap text-[var(--color-ink)]">
                        onClose
                      </TableCell>
                      <TableCell className="num whitespace-nowrap text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                        () =&gt; void
                      </TableCell>
                      <TableCell className="text-[length:var(--text-sm)] text-[var(--color-ink-4)]">
                        No
                      </TableCell>
                      <TableCell className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                        Corre si el cliente cierra el modal sin pagar.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p>
                Devuelve <code>&#123; close() &#125;</code> para cerrar el modal desde tu código.
              </p>

              <h3>
                Eventos <code>postMessage</code>
              </h3>
              <p>
                El iframe habla con tu página vía <code>window.postMessage</code>. El SDK ya los
                traduce a callbacks; estos son los tipos que viajan.
              </p>
              <div className="mt-[var(--space-2xs)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>type</TableHead>
                      <TableHead>Dispara</TableHead>
                      <TableHead>Payload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="num whitespace-nowrap text-[var(--color-ok)]">
                        consi:paid
                      </TableCell>
                      <TableCell className="num text-[length:var(--text-sm)]">onSuccess</TableCell>
                      <TableCell className="num text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                        {'{ type, token, status, reference }'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="num whitespace-nowrap text-[var(--color-ink-3)]">
                        consi:close
                      </TableCell>
                      <TableCell className="num text-[length:var(--text-sm)]">onClose</TableCell>
                      <TableCell className="num text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                        {'{ type }'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="mt-[var(--space-md)]">
                <SdkPlayground origin={origin} />
              </div>

              <Notice kind="info" className="mt-[var(--space-md)]">
                <p className="font-medium text-[var(--color-ink)]">Buenas prácticas</p>
                <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
                  <li>Genera el token justo antes de abrir el checkout: los links caducan.</li>
                  <li>
                    Confirma el pago con el webhook <span className="num">transaction.completed</span>
                    , no con <span className="num">onSuccess</span>. El callback es UX; el webhook
                    es la fuente de verdad.
                  </li>
                  <li>
                    Carga <span className="num">consi.js</span> una sola vez por documento.
                  </li>
                </ul>
              </Notice>
            </>
          )}

          {section === 'endpoints' && (
            <>
              <h2>Referencia de la API</h2>
              <p>
                Elige un endpoint para ver sus parámetros aquí y el código de ejemplo — en tu
                lenguaje — en el panel de código.
              </p>

              <div className="mt-[var(--space-sm)] flex items-center gap-[var(--space-2xs)]">
                <span className="label shrink-0">Base</span>
                <code className="num min-w-0 flex-1 truncate rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-2.5 py-2 text-[length:var(--text-sm)] text-[var(--color-ink)]">
                  {apiBase || '/api'}
                </code>
                <CopyButton value={apiBase} label="Base URL" />
              </div>

              <div className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-2xs)]">
                {ENDPOINTS.map((ep) => {
                  const open = activeEndpoint === ep.id;
                  return (
                    <div
                      key={ep.id}
                      className={cn(
                        'overflow-hidden rounded-[var(--radius-md)] border transition-colors duration-[var(--dur-fast)]',
                        open
                          ? 'border-[var(--color-accent)]'
                          : 'border-[var(--color-rule)] hover:border-[var(--color-rule-2)]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveEndpoint(ep.id)}
                        aria-expanded={open}
                        className={cn(
                          'w-full p-[var(--space-xs)] text-left transition-colors duration-[var(--dur-fast)]',
                          'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus)]',
                          open
                            ? 'bg-[var(--color-accent-soft)]'
                            : 'bg-[var(--color-surface)] hover:bg-[var(--color-paper-3)]',
                        )}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <MethodTag method={ep.method} />
                          <code className="num text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
                            {ep.path}
                          </code>
                          <span className="label ml-auto flex items-center gap-1">
                            {ep.hmac ? (
                              <>
                                <Shield size={11} /> HMAC
                              </>
                            ) : (
                              <>
                                <Key size={11} /> API Key
                              </>
                            )}
                          </span>
                        </span>
                        <span className="mt-1.5 block text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                          {ep.summary}
                        </span>
                      </button>

                      {open ? (
                        <div className="flex flex-col gap-[var(--space-xs)] border-t border-[var(--color-rule)] bg-[var(--color-surface)] p-[var(--space-xs)]">
                          <div>
                            <div className="label pb-1">
                              {ep.params.some((p) => p.in === 'path')
                                ? 'Parámetros de ruta'
                                : 'Parámetros del cuerpo'}
                            </div>
                            <Table className="min-w-[26rem]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Campo</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Req.</TableHead>
                                  <TableHead>Descripción</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {ep.params.map((p) => (
                                  <TableRow key={p.name}>
                                    <TableCell className="num whitespace-nowrap align-top text-[var(--color-ink)]">
                                      {p.name}
                                    </TableCell>
                                    <TableCell className="num whitespace-nowrap align-top text-[length:var(--text-2xs)] text-[var(--color-accent)]">
                                      {p.type}
                                    </TableCell>
                                    <TableCell className="align-top text-[length:var(--text-sm)]">
                                      {p.required ? (
                                        <span className="font-medium text-[var(--color-bad)]">
                                          Sí
                                        </span>
                                      ) : (
                                        <span className="text-[var(--color-ink-4)]">No</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="align-top text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                                      {p.desc}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                            <span className="font-medium text-[var(--color-ink)]">Retorna: </span>
                            {ep.returns}
                          </p>

                          {ep.hmac ? (
                            <Notice kind="warn">
                              Firma requerida en <span className="num">x-signature</span> sobre{' '}
                              <span className="num">apiKey|order|amount|currency</span>.{' '}
                              {ep.id === 'payout'
                                ? 'Si el retiro no lleva order, deja el campo vacío: apiKey||amount|currency. '
                                : ''}
                              <button
                                type="button"
                                onClick={() => goTo('hmac')}
                                className="font-medium underline"
                              >
                                Cómo calcularla
                              </button>
                            </Notice>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {section === 'webhooks' && (
            <>
              <h2>Webhooks</h2>
              <p>
                Cada vez que una transacción cambia de estado, Consi envía un <code>POST</code>{' '}
                firmado a la URL que registraste en{' '}
                <Link href="/developers">Desarrolladores</Link>.
              </p>

              <ol className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-xs)]">
                <Step n={1} title="Registra tu URL">
                  <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                    Un endpoint HTTPS público, en la sección Desarrolladores.
                  </p>
                </Step>
                <Step n={2} title="Consi notifica">
                  <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                    Ante cada cambio de estado, con el evento y su firma.
                  </p>
                </Step>
                <Step n={3} title="Verificas y respondes">
                  <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                    Validas la firma, procesas y respondes 2xx en menos de 10 s.
                  </p>
                </Step>
              </ol>

              <h3>Catálogo de eventos</h3>
              <p>
                El nombre sigue el patrón <code>transaction.&lt;estado&gt;</code> y viaja también
                en la cabecera <code>x-consi-event</code>.
              </p>
              <div className="mt-[var(--space-2xs)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Cuándo se dispara</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {WEBHOOK_EVENTS.map((ev) => (
                      <TableRow key={ev.event}>
                        <TableCell
                          className={cn(
                            'num whitespace-nowrap align-top',
                            ev.tone === 'ok'
                              ? 'text-[var(--color-ok)]'
                              : ev.tone === 'bad'
                                ? 'text-[var(--color-bad)]'
                                : 'text-[var(--color-warn)]',
                          )}
                        >
                          {ev.event}
                        </TableCell>
                        <TableCell className="align-top text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                          {ev.when}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <h3>Cabeceras</h3>
              <div className="mt-[var(--space-2xs)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cabecera</TableHead>
                      <TableHead>Descripción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      [
                        'x-consi-event',
                        'El nombre del evento, ej. transaction.completed.',
                      ],
                      [
                        'x-webhook-signature',
                        'HMAC-SHA256 (hex) del cuerpo JSON, usando tu API Secret como clave.',
                      ],
                      ['content-type', 'application/json'],
                    ].map(([h, d]) => (
                      <TableRow key={h}>
                        <TableCell className="num whitespace-nowrap align-top text-[var(--color-ink)]">
                          {h}
                        </TableCell>
                        <TableCell className="align-top text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                          {d}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <h3>Reintentos</h3>
              <p>
                Si tu servidor no responde <code>2xx</code>, Consi reintenta con backoff hasta
                agotar los intentos. Cada intento —estado, número y último error— queda auditado en{' '}
                <Link href="/developers">Desarrolladores</Link>.
              </p>

              <Notice kind="warn" className="mt-[var(--space-sm)]">
                Verifica <span className="num">x-webhook-signature</span> antes de procesar el
                evento. Sin eso, cualquiera puede inventarse un pago completado contra tu endpoint.
              </Notice>

              <Notice kind="info" className="mt-[var(--space-2xs)]">
                <p className="font-medium text-[var(--color-ink)]">Buenas prácticas</p>
                <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
                  <li>
                    Responde <span className="num">200 OK</span> de inmediato y procesa en segundo
                    plano: evitas timeouts y reintentos.
                  </li>
                  <li>
                    Trátalos como idempotentes — la misma transacción puede notificarse más de una
                    vez. Deduplica por <span className="num">reference</span>.
                  </li>
                  <li>
                    Compara firmas con <span className="num">timingSafeEqual</span> /{' '}
                    <span className="num">hash_equals</span>, no con <span className="num">==</span>.
                  </li>
                </ul>
              </Notice>
            </>
          )}

          {section === 'testing' && (
            <>
              <h2>Pruebas y sandbox</h2>
              <p>
                Con tu clave <code>c_test_…</code> puedes recorrer el ciclo de vida completo de un
                pago —webhooks firmados incluidos— sin mover dinero real.
              </p>

              <h3>Tarjetas de prueba</h3>
              <p>
                Cualquier fecha futura y CVC de 3 dígitos son válidos; el número decide el
                resultado.
              </p>
              <div className="mt-[var(--space-2xs)]">
                <Table className="min-w-[26rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>CVC</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ['4242 4242 4242 4242', 'Aprobada', 'ok'],
                      ['4000 0000 0000 0002', 'Rechazada (declined)', 'bad'],
                      ['4000 0000 0000 9995', 'Fondos insuficientes', 'bad'],
                    ].map(([number, result, tone]) => (
                      <TableRow key={number}>
                        <TableCell className="num whitespace-nowrap text-[var(--color-ink)]">
                          {number}
                        </TableCell>
                        <TableCell className="num text-[length:var(--text-sm)]">12/29</TableCell>
                        <TableCell className="num text-[length:var(--text-sm)]">123</TableCell>
                        <TableCell
                          className={cn(
                            'text-[length:var(--text-sm)] font-medium',
                            tone === 'ok' ? 'text-[var(--color-ok)]' : 'text-[var(--color-bad)]',
                          )}
                        >
                          {result}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <h3>Pago Móvil</h3>
              <p>
                Las transferencias son simuladas: verás los datos del comercio destino e
                introduces cualquier referencia de 6 a 10 dígitos (ej. <code>239485</code>) para
                disparar la confirmación asíncrona y el webhook{' '}
                <code>transaction.completed</code>. Para el flujo sin referencia, mira los
                teléfonos de prueba en{' '}
                <button type="button" className="link" onClick={() => goTo('checkout')}>
                  Checkout
                </button>
                .
              </p>

              <h3>USDT</h3>
              <p>
                En sandbox la dirección de depósito es ficticia y la confirmación on-chain se
                simula a los pocos segundos, sin transacción real.
              </p>

              <Notice kind="info" className="mt-[var(--space-sm)]">
                <p className="font-medium text-[var(--color-ink)]">Prueba de punta a punta</p>
                <p className="mt-1">
                  Crea un link con <span className="num">POST /payment/links</span>, ábrelo con el{' '}
                  <button type="button" className="link" onClick={() => goTo('sdk')}>
                    SDK
                  </button>
                  , paga con <span className="num">4242…</span> y confirma que llega el{' '}
                  <button type="button" className="link" onClick={() => goTo('webhooks')}>
                    webhook
                  </button>{' '}
                  firmado a tu servidor.
                </p>
              </Notice>
            </>
          )}
        </div>

        {/* ── Columna 3 · petición / respuesta ───────────────────────────── */}
        <div className="min-w-0 min-[1024px]:col-start-2 min-[1400px]:col-start-3 min-[1400px]:sticky min-[1400px]:top-[var(--space-md)]">
          <RequestPanel {...panel} />
          {section === 'endpoints' ? (
            <p className="label pt-[var(--space-2xs)]">Mostrando · {endpoint.title}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
