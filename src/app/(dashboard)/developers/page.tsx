'use client';

import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { ApiKeys, WebhookDelivery } from '@/lib/types';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8 rounded-md hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={`Copiar ${label}`}
    >
      {copied ? <Check size={14} className="text-[var(--color-ok)]" /> : <Copy size={14} />}
    </Button>
  );
}

/** Same chip recipe as StatusBadge, over webhook delivery states. */
function DeliveryBadge({ status }: { status: WebhookDelivery['status'] }) {
  const { label, tone } = {
    DELIVERED: { label: 'Entregado', tone: 'bg-[var(--color-ok-soft)] text-[var(--color-ok)]' },
    FAILED: { label: 'Fallido', tone: 'bg-[var(--color-bad-soft)] text-[var(--color-bad)]' },
    PENDING: { label: 'Pendiente', tone: 'bg-[var(--color-warn-soft)] text-[var(--color-warn)]' },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] ${tone}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

/** A named snippet on a graphite ground — the docs family's repeating unit. */
function SnippetCard({ title, note, code }: { title: string; note: string; code: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-[var(--color-surface)] p-[var(--space-sm)]">
      <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">{title}</p>
      <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">{note}</p>
      <pre className="mt-2 overflow-x-auto whitespace-pre rounded-[var(--radius-sm)] bg-[var(--color-graphite)] p-2.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] leading-relaxed text-[var(--color-on-graphite)]">
        {code}
      </pre>
    </div>
  );
}

function SecretRow({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const display = secret && !revealed ? '•'.repeat(Math.min(value.length, 32)) : value;
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={display} className="num" />
        {secret ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? `Ocultar ${label}` : `Mostrar ${label}`}
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        ) : null}
        <CopyButton value={value} label={label} />
      </div>
    </div>
  );
}

function SignatureGenerator({ keys }: { keys: ApiKeys | null }) {
  const [apiKeyInput, setApiKeyInput] = useState(keys?.apiKeyTest || '');
  const [secretInput, setSecretInput] = useState(keys?.apiSecretTest || '');
  const [orderInput, setOrderInput] = useState('orden-123');
  const [amountInput, setAmountInput] = useState('100.00');
  const [currencyInput, setCurrencyInput] = useState('USD');
  const [signatureOutput, setSignatureOutput] = useState('');

  useEffect(() => {
    if (keys) {
      setApiKeyInput(keys.apiKeyTest);
      setSecretInput(keys.apiSecretTest);
    }
  }, [keys]);

  useEffect(() => {
    const calculateSignature = async () => {
      if (!apiKeyInput || !secretInput) {
        setSignatureOutput('Ingresa tu API Key y Secret en los campos');
        return;
      }
      try {
        const payload = [apiKeyInput, orderInput, amountInput, currencyInput].join('|');
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secretInput);
        const messageData = encoder.encode(payload);
        
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        
        const signatureBuffer = await window.crypto.subtle.sign(
          'HMAC',
          cryptoKey,
          messageData
        );
        
        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setSignatureOutput(hashHex);
      } catch (err) {
        setSignatureOutput('Error al calcular firma');
      }
    };
    calculateSignature();
  }, [apiKeyInput, secretInput, orderInput, amountInput, currencyInput]);

  return (
    <div className="flex flex-col gap-[var(--space-sm)] rounded-[var(--radius-md)] border border-[var(--color-rule)] p-[var(--space-sm)]">
      <div>
        <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
          Generador de firma HMAC
        </p>
        <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          Escribe tus credenciales y los campos de la orden para ver cómo se arma la firma que
          va en las cabeceras HTTP. Todo se calcula en tu navegador.
        </p>
      </div>

      <div className="grid gap-[var(--space-xs)] md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hmac-key">API Key</Label>
          <Input
            id="hmac-key"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="num"
            placeholder="apiKeyTest_…"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hmac-secret">API Secret</Label>
          <Input
            id="hmac-secret"
            type="password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            className="num"
            placeholder="apiSecretTest_…"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hmac-order">Order ID</Label>
          <Input
            id="hmac-order"
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value)}
            className="num"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hmac-amount">Monto</Label>
            <Input
              id="hmac-amount"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="num"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hmac-cur">Moneda</Label>
            <Select
              id="hmac-cur"
              value={currencyInput}
              onChange={(e) => setCurrencyInput(e.target.value)}
              className="num"
            >
              <option value="USD">USD</option>
              <option value="VES">VES</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-rule)] pt-[var(--space-xs)]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="label">Cadena a firmar</span>
          <span className="label normal-case">apiKey|order|amount|currency</span>
        </div>
        <pre className="mt-1.5 overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--color-graphite)] p-2.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] text-[var(--color-on-graphite)]">
          {`${apiKeyInput || 'API_KEY'}|${orderInput}|${amountInput}|${currencyInput}`}
        </pre>
      </div>

      <div>
        <Label htmlFor="hmac-out">Firma HMAC-SHA256 · x-signature</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="hmac-out"
            readOnly
            value={signatureOutput}
            className="num text-[var(--color-accent)]"
          />
          <CopyButton value={signatureOutput} label="firma calculada" />
        </div>
      </div>
    </div>
  );
}

type DocSection = 'intro' | 'auth' | 'hmac' | 'checkout' | 'endpoints' | 'webhooks' | 'testing';

const DOC_GROUPS: { title: string; items: { id: DocSection; label: string }[] }[] = [
  {
    title: 'Integración',
    items: [
      { id: 'intro', label: 'Introducción' },
      { id: 'auth', label: 'Autenticación' },
      { id: 'hmac', label: 'Firma HMAC' },
      { id: 'checkout', label: 'Checkout' },
    ],
  },
  {
    title: 'Referencia',
    items: [
      { id: 'endpoints', label: 'Endpoints' },
      { id: 'webhooks', label: 'Webhooks' },
      { id: 'testing', label: 'Pruebas y sandbox' },
    ],
  },
];

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKeys | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [mainTab, setMainTab] = useState<'keys' | 'docs'>('keys');

  // Documentation states
  const [docSection, setDocSection] = useState<DocSection>('intro');
  const [codeLang, setCodeLang] = useState<'curl' | 'js' | 'python' | 'php'>('curl');

  const load = () =>
    api.getApiKeys().then((k) => {
      setKeys(k);
      setWebhookUrl(k.webhookUrl ?? '');
    });

  useEffect(() => {
    load();
    api.getWebhookDeliveries().then(setDeliveries).catch(() => setDeliveries([]));
  }, []);

  async function regenerate(environment: 'TEST' | 'LIVE') {
    const updated = await api.regenerateApiKey(environment);
    setKeys((prev) => (prev ? { ...prev, ...updated } : prev));
    setStatus(`Clave ${environment} regenerada`);
    setTimeout(() => setStatus(null), 3000);
  }

  async function saveWebhook(e: React.FormEvent) {
    e.preventDefault();
    await api.updateWebhook(webhookUrl);
    setStatus('Webhook URL actualizada');
    setTimeout(() => setStatus(null), 3000);
  }

  // Multi-language Snippets dictionary
  const snippets = {
    payment: {
      curl: `curl -X POST http://localhost:4000/api/payment \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: \${keys?.apiKeyTest || 'TU_API_KEY'}" \\
  -H "x-signature: CALCULATED_HMAC_SIGNATURE" \\
  -d '{
    "order": "orden_101",
    "amount": "150.00",
    "currency": "USD",
    "customerName": "Juan Pérez",
    "description": "Pago de Factura #101"
  }'`,
      js: `const crypto = require('crypto');
const apiKey = '\${keys?.apiKeyTest || 'TU_API_KEY'}';
const secret = '\${keys?.apiSecretTest || 'TU_API_SECRET'}';
const order = 'orden_101';
const amount = '150.00';
const currency = 'USD';

const payload = [apiKey, order, amount, currency].join('|');
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

fetch('http://localhost:4000/api/payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'x-signature': signature
  },
  body: JSON.stringify({
    order, amount, currency,
    customerName: 'Juan Pérez',
    description: 'Pago de Factura #101'
  })
})
.then(res => res.json())
.then(console.log);`,
      python: `import hmac
import hashlib
import requests

api_key = "\${keys?.apiKeyTest || 'TU_API_KEY'}"
secret = "\${keys?.apiSecretTest || 'TU_API_SECRET'}"
order = "orden_101"
amount = "150.00"
currency = "USD"

payload = f"{api_key}|{order}|{amount}|{currency}".encode('utf-8')
signature = hmac.new(secret.encode('utf-8'), payload, hashlib.sha256).hexdigest()

headers = {
    "Content-Type": "application/json",
    "x-api-key": api_key,
    "x-signature": signature
}

body = {
    "order": order,
    "amount": amount,
    "currency": currency,
    "customerName": "Juan Pérez",
    "description": "Pago de Factura #101"
}

response = requests.post("http://localhost:4000/api/payment", json=body, headers=headers)
print(response.json())`,
      php: `<?php
$apiKey = '\${keys?.apiKeyTest || 'TU_API_KEY'}';
$secret = '\${keys?.apiSecretTest || 'TU_API_SECRET'}';
$order = 'orden_101';
$amount = '150.00';
$currency = 'USD';

$payload = implode('|', [$apiKey, $order, $amount, $currency]);
$signature = hash_hmac('sha256', $payload, $secret);

$ch = curl_init('http://localhost:4000/api/payment');
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
    'customerName' => 'Juan Pérez',
    'description' => 'Pago de Factura #101'
]));

$response = curl_exec($ch);
echo $response;
?>`
    },
    paymentLink: {
      curl: `curl -X POST http://localhost:4000/api/payment/links \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: \${keys?.apiKeyTest || 'TU_API_KEY'}" \\
  -H "x-signature: CALCULATED_HMAC_SIGNATURE" \\
  -d '{
    "order": "orden_102",
    "amount": "250.00",
    "currency": "VES",
    "description": "Enlace para suscripción mensual",
    "methods": ["CARD", "PAGO_MOVIL"],
    "successUrl": "https://mi-tienda.com/success"
  }'`,
      js: `const crypto = require('crypto');
const apiKey = '\${keys?.apiKeyTest || 'TU_API_KEY'}';
const secret = '\${keys?.apiSecretTest || 'TU_API_SECRET'}';
const order = 'orden_102';
const amount = '250.00';
const currency = 'VES';

const payload = [apiKey, order, amount, currency].join('|');
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

fetch('http://localhost:4000/api/payment/links', {
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
      python: `import hmac
import hashlib
import requests

api_key = "\${keys?.apiKeyTest || 'TU_API_KEY'}"
secret = "\${keys?.apiSecretTest || 'TU_API_SECRET'}"
order = "orden_102"
amount = "250.00"
currency = "VES"

payload = f"{api_key}|{order}|{amount}|{currency}".encode('utf-8')
signature = hmac.new(secret.encode('utf-8'), payload, hashlib.sha256).hexdigest()

headers = {
    "Content-Type": "application/json",
    "x-api-key": api_key,
    "x-signature": signature
}

body = {
    "order": order,
    "amount": amount,
    "currency": currency,
    "description": "Enlace para suscripción mensual",
    "methods": ["CARD", "PAGO_MOVIL"],
    "successUrl": "https://mi-tienda.com/success"
}

response = requests.post("http://localhost:4000/api/payment/links", json=body, headers=headers)
print(response.json())`,
      php: `<?php
$apiKey = '\${keys?.apiKeyTest || 'TU_API_KEY'}';
$secret = '\${keys?.apiSecretTest || 'TU_API_SECRET'}';
$order = 'orden_102';
$amount = '250.00';
$currency = 'VES';

$payload = implode('|', [$apiKey, $order, $amount, $currency]);
$signature = hash_hmac('sha256', $payload, $secret);

$ch = curl_init('http://localhost:4000/api/payment/links');
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
?>`
    },
    retrieve: {
      curl: `curl -X GET http://localhost:4000/api/payment/CONSI-TRX-ABCD1234 \\
  -H "x-api-key: \${keys?.apiKeyTest || 'TU_API_KEY'}"`,
      js: `const apiKey = '\${keys?.apiKeyTest || 'TU_API_KEY'}';
const reference = 'CONSI-TRX-ABCD1234';

fetch(\`http://localhost:4000/api/payment/\${reference}\`, {
  method: 'GET',
  headers: {
    'x-api-key': apiKey
  }
})
.then(res => res.json())
.then(console.log);`,
      python: `import requests

api_key = "\${keys?.apiKeyTest || 'TU_API_KEY'}"
reference = "CONSI-TRX-ABCD1234"

headers = {
    "x-api-key": api_key
}

response = requests.get(f"http://localhost:4000/api/payment/{reference}", headers=headers)
print(response.json())`,
      php: `<?php
$apiKey = '\${keys?.apiKeyTest || 'TU_API_KEY'}';
$reference = 'CONSI-TRX-ABCD1234';

$ch = curl_init("http://localhost:4000/api/payment/" . $reference);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'x-api-key: ' . $apiKey
]);

$response = curl_exec($ch);
echo $response;
?>`
    },
    retrieveOrder: {
      curl: `curl -X GET http://localhost:4000/api/payment/order/orden_101 \\
  -H "x-api-key: \${keys?.apiKeyTest || 'TU_API_KEY'}"`,
      js: `const apiKey = '\${keys?.apiKeyTest || 'TU_API_KEY'}';
const orderId = 'orden_101';

fetch(\`http://localhost:4000/api/payment/order/\${orderId}\`, {
  method: 'GET',
  headers: {
    'x-api-key': apiKey
  }
})
.then(res => res.json())
.then(console.log);`,
      python: `import requests

api_key = "\${keys?.apiKeyTest || 'TU_API_KEY'}"
order_id = "orden_101"

headers = {
    "x-api-key": api_key
}

response = requests.get(f"http://localhost:4000/api/payment/order/{order_id}", headers=headers)
print(response.json())`,
      php: `<?php
$apiKey = '\${keys?.apiKeyTest || 'TU_API_KEY'}';
$orderId = 'orden_101';

$ch = curl_init("http://localhost:4000/api/payment/order/" . $orderId);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'x-api-key: ' . $apiKey
]);

$response = curl_exec($ch);
echo $response;
?>`
    },
    webhookVerify: {
      curl: `# N/A - Las firmas de webhook se verifican en el servidor de destino`,
      js: `const crypto = require('crypto');

// En tu endpoint de Express / Next.js de Webhooks:
const secret = '\${keys?.apiSecretTest || 'TU_API_SECRET'}';
const signature = req.headers['x-webhook-signature'];
const payload = JSON.stringify(req.body);

const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

const valid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSignature)
);

if (valid) {
  console.log('Webhook verificado:', req.body.event);
  // Responder con 200 OK
} else {
  console.error('Firma inválida');
}`,
      python: `import hmac
import hashlib

secret = "\${keys?.apiSecretTest || 'TU_API_SECRET'}"
signature = request.headers.get("x-webhook-signature")
payload_bytes = request.data  # Datos crudos JSON recibidos

expected = hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()

if hmac.compare_digest(signature, expected):
    print("Firma válida, procesar webhook")
else:
    print("Firma inválida, denegar")`,
      php: `<?php
$secret = '\${keys?.apiSecretTest || 'TU_API_SECRET'}';
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'];
$payload = file_get_contents('php://input');

$expected = hash_hmac('sha256', $payload, $secret);

if (hash_equals($expected, $signature)) {
    echo "Firma válida. Evento recibido.";
} else {
    http_response_code(400);
    echo "Firma inválida";
}
?>`
    }
  };

  const codeBlocks = {
    payment: {
      req: snippets.payment[codeLang],
      res: `{
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
}`
    },
    paymentLink: {
      req: snippets.paymentLink[codeLang],
      res: `{
  "success": true,
  "data": {
    "token": "link_xyz123",
    "url": "http://localhost:3000/c/link_xyz123",
    "amount": "250.00",
    "currency": "VES",
    "description": "Enlace para suscripción mensual",
    "methods": ["CARD", "PAGO_MOVIL"],
    "status": "ACTIVE",
    "order": "orden_102",
    "createdAt": "2026-06-16T18:35:00.000Z"
  }
}`
    },
    retrieve: {
      req: snippets.retrieve[codeLang],
      res: `{
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
}`
    },
    retrieveOrder: {
      req: snippets.retrieveOrder[codeLang],
      res: `{
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
}`
    },
    webhooks: {
      req: snippets.webhookVerify[codeLang],
      res: `{
  "event": "transaction.completed",
  "reference": "CONSI-TRX-ABCD1234",
  "order": "orden_101",
  "type": "PAYIN",
  "status": "COMPLETED",
  "currency": "USD",
  "amount": "150.00",
  "fee": "3.50",
  "net": "146.50",
  "providerRef": "BCM-PI-ABCD1234",
  "createdAt": "2026-06-16T18:30:00.000Z"
}`
    }
  };

  return (
    <div className="space-y-6">
      <PageHead
        title="Desarrolladores"
        lede="Tus credenciales de API y la guía de integración de Consi."
        action={
          <div
            role="group"
            aria-label="Vista"
            className="flex rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-0.5"
          >
            {(
              [
                { id: 'keys', label: 'Claves' },
                { id: 'docs', label: 'Documentación' },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setMainTab(id)}
                aria-pressed={mainTab === id}
                className={`rounded-[var(--radius-xs)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] transition-colors duration-[var(--dur-fast)] ${
                  mainTab === id
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                    : 'text-[var(--color-ink-4)] hover:text-[var(--color-ink)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {status ? <Notice kind="ok">{status}</Notice> : null}

      {/* VIEW: KEYS AND WEBHOOKS */}
      {mainTab === 'keys' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Credenciales de API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {keys ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SecretRow label="API Key (Test)" value={keys.apiKeyTest} />
                    <SecretRow label="API Secret (Test)" value={keys.apiSecretTest} secret />
                    <SecretRow label="API Key (Live)" value={keys.apiKeyLive} />
                    <SecretRow label="API Secret (Live)" value={keys.apiSecretLive} secret />
                  </div>
                  {/* Wraps rather than overhanging the card at 320px. */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => regenerate('TEST')} className="text-xs">
                      <RefreshCw size={14} className="mr-1.5" /> Regenerar Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => regenerate('LIVE')} className="text-xs">
                      <RefreshCw size={14} className="mr-1.5" /> Regenerar Live
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--color-ink-3)]">Cargando credenciales…</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Configuración de Webhook</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveWebhook} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="webhook" className="text-xs font-bold text-[var(--color-ink)]">URL del Webhook de tu Servidor</Label>
                  <Input
                    id="webhook"
                    type="url"
                    placeholder="https://tu-servidor.com/webhooks/consi"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="max-w-xl font-mono text-sm border-[var(--color-rule)]"
                  />
                  <p className="text-xs text-[var(--color-ink-4)]">
                    Consi enviará peticiones HTTP POST firmadas con eventos del estado de las transacciones (ej. <code className="bg-[var(--color-paper-3)] px-1 rounded">transaction.completed</code>) a este endpoint.
                  </p>
                </div>
                <Button type="submit" className="text-xs font-bold px-4 py-2">Guardar Endpoint</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Historial de Entregas de Webhook</CardTitle>
            </CardHeader>
            <CardContent>
              <Table className="border border-[var(--color-rule)] rounded-xl overflow-hidden">
                <TableHeader className="bg-[var(--color-paper-3)]">
                  <TableRow>
                    <TableHead className="font-bold text-[var(--color-ink)]">Evento</TableHead>
                    <TableHead className="font-bold text-[var(--color-ink)]">Estado</TableHead>
                    <TableHead className="font-bold text-[var(--color-ink)]">Intentos</TableHead>
                    <TableHead className="font-bold text-[var(--color-ink)]">Último error</TableHead>
                    <TableHead className="font-bold text-[var(--color-ink)]">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-[var(--color-ink-4)] font-medium">
                        Sin notificaciones enviadas aún
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveries.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="num text-[length:var(--text-xs)] text-[var(--color-ink)]">
                          {d.event}
                        </TableCell>
                        <TableCell>
                          <DeliveryBadge status={d.status} />
                        </TableCell>
                        <TableCell className="num text-[length:var(--text-xs)]">
                          {d.attempts}/{d.maxAttempts}
                        </TableCell>
                        <TableCell className="num max-w-xs truncate text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                          {d.lastError ?? '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                          {formatDate(d.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW: STRIPE-LIKE DEVELOPER DOCUMENTATION */}
      {mainTab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN 1: SECTION INDEX (Col 1-3) */}
          <nav
            aria-label="Secciones de la documentación"
            className="flex flex-col gap-0.5 lg:col-span-3 lg:sticky lg:top-[var(--space-md)]"
          >
            {DOC_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-0.5">
                <div className="label px-2 pb-1 pt-2.5 first:pt-0">{group.title}</div>
                {group.items.map(({ id, label }) => {
                  const active = docSection === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setDocSection(id)}
                      aria-current={active ? 'true' : undefined}
                      className={`flex items-center rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-[length:var(--text-sm)] transition-colors duration-[var(--dur-fast)] ${
                        active
                          ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
                          : 'text-[var(--color-ink-3)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* COLUMN 2: GUIDES (Col 4-8) */}
          <div className="lg:col-span-5 space-y-6 text-sm text-[var(--color-ink-2)] leading-relaxed">
            
            {/* SECTION: INTRO */}
            {docSection === 'intro' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--color-ink)]">Introducción</h2>
                <p>
                  Bienvenido a la API de <strong>Consi</strong>. Nuestra plataforma permite a empresas en Venezuela integrar cobros automatizados de forma rápida, segura y multi-moneda (USD y VES) empleando métodos tradicionales y alternativos.
                </p>
                <p>
                  Ofrecemos tres flujos principales de integración según las necesidades de tu sistema:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Hosted Checkout (Links de pago):</strong> Redirecciona a tu cliente a una página alojada de Consi para pagar. Es el camino más rápido, sin código en frontend.</li>
                  <li><strong>Embedded Checkout (Modal):</strong> Usa nuestra librería JavaScript <code className="rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] px-1 font-[family-name:var(--font-mono)] text-[length:var(--text-xs)] text-[var(--color-ink)]">consi.js</code> para abrir una ventana modal directamente en tu aplicación, manteniendo la experiencia in-app.</li>
                  <li><strong>Server-to-Server API (Directa):</strong> Crea cobros directamente desde tu backend, permitiendo construir tus propias experiencias y canalizar la confirmación mediante webhooks.</li>
                </ul>
              </div>
            )}

            {/* SECTION: AUTH */}
            {docSection === 'auth' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--color-ink)]">Autenticación</h2>
                <p>
                  La comunicación con la API pública de Consi se realiza bajo HTTPS y se autentica mediante la cabecera HTTP <code className="rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] px-1 font-[family-name:var(--font-mono)] text-[length:var(--text-xs)] text-[var(--color-ink)]">x-api-key</code>.
                </p>
                <p>
                  Cada comercio dispone de dos juegos de llaves accesibles desde la pestaña <strong>Claves y Webhooks</strong>:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="p-3 border border-[var(--color-rule)] rounded-lg bg-[var(--color-paper-3)]">
                    <span className="font-bold text-[var(--color-ink)] block text-xs">Ambiente de Pruebas (Test):</span>
                    <span className="text-xs font-mono">x-api-key: c_test_...</span>
                    <p className="text-xs text-[var(--color-ink-3)] mt-1">Usa esta clave para hacer simulaciones sin alterar dinero real ni cuentas bancarias.</p>
                  </div>
                  <div className="p-3 border border-[var(--color-rule)] rounded-lg bg-[var(--color-paper-3)]">
                    <span className="font-bold text-[var(--color-ink)] block text-xs">Ambiente de Producción (Live):</span>
                    <span className="text-xs font-mono">x-api-key: c_live_...</span>
                    <p className="text-xs text-[var(--color-ink-3)] mt-1">Usa esta clave en tu producción real para recibir cobros reales.</p>
                  </div>
                </div>
                <Notice kind="warn">
                  Nunca expongas un API Secret en código de frontend ni en un repositorio
                  público. Fírmalo siempre desde tu servidor.
                </Notice>
              </div>
            )}

            {/* SECTION: HMAC SIGNATURE */}
            {docSection === 'hmac' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--color-ink)]">Firma HMAC y Seguridad</h2>
                <p>
                  Para garantizar la integridad y evitar que los campos sensibles (como el monto o la moneda) sean alterados en tránsito, Consi requiere una firma digital en las peticiones que creen recursos (<code className="rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] px-1 font-[family-name:var(--font-mono)] text-[length:var(--text-xs)] text-[var(--color-ink)]">POST</code>).
                </p>
                <p>
                  Esta firma debe enviarse en la cabecera <code className="rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] px-1 font-[family-name:var(--font-mono)] text-[length:var(--text-xs)] text-[var(--color-ink)]">x-signature</code>.
                </p>
                <div className="space-y-2">
                  <h3 className="font-bold text-[var(--color-ink)]">Cómo Calcular la Firma:</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-xs">
                    <li>Concatena los valores requeridos en el orden exacto separados por tuberías (<code className="bg-[var(--color-paper-3)] px-1 rounded">|</code>): <br />
                      <code className="mt-1 block rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] p-1 font-[family-name:var(--font-mono)] text-[length:var(--text-xs)] text-[var(--color-accent)]">apiKey|order|amount|currency</code>
                    </li>
                    <li>Utiliza tu clave secreta de API (<code className="bg-[var(--color-paper-3)] px-1 rounded">apiSecret</code>) correspondiente como clave de firma.</li>
                    <li>Calcula el hash <strong>HMAC-SHA256</strong> sobre la cadena del paso 1 y codifícalo como cadena hexadecimal (hex).</li>
                  </ol>
                </div>
                
                {/* INTERACTIVE COMPONENT */}
                <SignatureGenerator keys={keys} />
              </div>
            )}

            {/* SECTION: CHECKOUT EMBED */}
            {docSection === 'checkout' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--color-ink)]">Hosted Checkout & Embedded Iframe</h2>
                <p>
                  Consi ofrece una interfaz interactiva de pagos ya construida que le permite al pagador elegir entre <strong>Pago Móvil, Transferencias, Tarjetas o USDT (criptomonedas)</strong>.
                </p>
                
                <h3 className="font-bold text-[var(--color-ink)] mt-2">1. Flujo Redireccionado (Hosted)</h3>
                <p>
                  Consiste en crear un enlace de pago desde tu backend y redireccionar al usuario a la propiedad <code className="bg-[var(--color-paper-3)] px-1 rounded">url</code> devuelta en la respuesta de la API. Cuando se confirma la liquidación, el usuario es redirigido a la URL especificada en <code className="bg-[var(--color-paper-3)] px-1 rounded">successUrl</code>.
                </p>

                <h3 className="font-bold text-[var(--color-ink)] mt-2">2. Checkout Incrustado (Drop-in Modal)</h3>
                <p>
                  Mediante nuestra librería, puedes desplegar la ventana de cobro Consi en un modal iframe directamente sobre tu web sin redirigir al cliente.
                </p>
                <div className="p-3 border border-[var(--color-rule)] rounded-lg space-y-1">
                  <span className="font-bold text-[var(--color-ink)] block text-xs">Pasos de uso:</span>
                  <ol className="list-decimal pl-4 text-xs space-y-1">
                    <li>Incrusta la etiqueta script de consi.js una sola vez.</li>
                    <li>Invoca <code className="font-mono bg-[var(--color-paper-3)] px-1 rounded text-xs">Consi.checkout(...)</code> indicando el token del pago y el callback de éxito.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* SECTION: ENDPOINTS REFERENCE */}
            {docSection === 'endpoints' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--color-ink)]">Referencia de la API Pública</h2>
                <p>
                  A continuación se documentan los endpoints públicos expuestos para comercios. El servidor escucha en el puerto <code className="font-mono bg-[var(--color-paper-3)] px-1 rounded text-xs">http://localhost:4000/api</code>.
                </p>

                {/* Sub-nav of endpoints to click and highlight code */}
                <div className="space-y-3">
                  <div className="p-3 border border-[var(--color-rule)] rounded-lg hover:border-[var(--color-accent)] transition-colors cursor-pointer" onClick={() => setDocSection('endpoints')}>
                    <span className="mr-2 inline-block rounded-[var(--radius-xs)] bg-[var(--color-ok-soft)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-ok)]">POST</span>
                    <code className="font-mono text-xs font-bold text-[var(--color-ink)]">/payment</code>
                    <p className="text-xs text-[var(--color-ink-3)] mt-1">Crea una transacción directa de pago PENDING en el sistema. Requiere firma HMAC.</p>
                  </div>
                  
                  <div className="p-3 border border-[var(--color-rule)] rounded-lg hover:border-[var(--color-accent)] transition-colors cursor-pointer" onClick={() => setDocSection('endpoints')}>
                    <span className="mr-2 inline-block rounded-[var(--radius-xs)] bg-[var(--color-ok-soft)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-ok)]">POST</span>
                    <code className="font-mono text-xs font-bold text-[var(--color-ink)]">/payment/links</code>
                    <p className="text-xs text-[var(--color-ink-3)] mt-1">Crea programáticamente un link de pago público (Stripe Checkout) y retorna la URL. Requiere firma HMAC.</p>
                  </div>

                  <div className="p-3 border border-[var(--color-rule)] rounded-lg hover:border-[var(--color-accent)] transition-colors cursor-pointer" onClick={() => setDocSection('endpoints')}>
                    <span className="mr-2 inline-block rounded-[var(--radius-xs)] bg-[var(--color-accent-soft)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-accent)]">GET</span>
                    <code className="font-mono text-xs font-bold text-[var(--color-ink)]">/payment/:reference</code>
                    <p className="text-xs text-[var(--color-ink-3)] mt-1">Recupera los detalles y estado del pago usando la referencia única de Consi. Sin firma HMAC.</p>
                  </div>

                  <div className="p-3 border border-[var(--color-rule)] rounded-lg hover:border-[var(--color-accent)] transition-colors cursor-pointer" onClick={() => setDocSection('endpoints')}>
                    <span className="mr-2 inline-block rounded-[var(--radius-xs)] bg-[var(--color-accent-soft)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-accent)]">GET</span>
                    <code className="font-mono text-xs font-bold text-[var(--color-ink)]">/payment/order/:orderId</code>
                    <p className="text-xs text-[var(--color-ink-3)] mt-1">Recupera los detalles y estado del pago usando tu ID de orden de comercio. Sin firma HMAC.</p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION: WEBHOOKS */}
            {docSection === 'webhooks' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--color-ink)]">Webhooks y Notificaciones</h2>
                <p>
                  Los webhooks permiten recibir actualizaciones del estado de un pago de forma asíncrona. Cuando el pago se completa (o falla), Consi realiza una llamada POST HTTP a la URL de webhook configurada.
                </p>
                <div className="space-y-2">
                  <h3 className="font-bold text-[var(--color-ink)]">Cabeceras enviadas:</h3>
                  <ul className="list-disc pl-5 text-xs space-y-1 font-mono">
                    <li><strong>x-consi-event:</strong> El nombre del evento (ej: <code className="rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] px-1 font-[family-name:var(--font-mono)] text-[length:var(--text-xs)]">transaction.completed</code>)</li>
                    <li><strong>x-webhook-signature:</strong> La firma HMAC-SHA256 generada sobre el cuerpo JSON plano utilizando tu API Secret como clave de firma.</li>
                  </ul>
                </div>
                <p>
                  Para mitigar ataques de replay e inyección, tu servidor <strong>debe verificar siempre la firma x-webhook-signature</strong> utilizando el código expuesto a la derecha antes de marcar el pedido como completado.
                </p>
              </div>
            )}

            {/* SECTION: TESTING / SANDBOX */}
            {docSection === 'testing' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--color-ink)]">Pruebas en Sandbox</h2>
                <p>
                  Durante las pruebas con la clave de prueba (<code className="bg-[var(--color-paper-3)] px-1 rounded">c_test_...</code>), puedes forzar el estado de tus transacciones usando las siguientes credenciales simuladas en la interfaz de pago:
                </p>
                
                <h3 className="font-bold text-[var(--color-ink)] text-xs uppercase tracking-wider text-[var(--color-ink-4)]">1. Tarjetas de Prueba (CARD)</h3>
                <Table className="border border-[var(--color-rule)] text-xs rounded-lg overflow-hidden">
                  <TableHeader className="bg-[var(--color-paper-3)]">
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>CVC</TableHead>
                      <TableHead>Resultado esperado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono">4242 •••• •••• 4242</TableCell>
                      <TableCell className="font-mono">12/29</TableCell>
                      <TableCell className="font-mono">123</TableCell>
                      <TableCell className="text-[var(--color-ok)] font-bold">Aprobado inmediato</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <h3 className="font-bold text-[var(--color-ink)] text-xs uppercase tracking-wider text-[var(--color-ink-4)] mt-2">2. Pago Móvil de Prueba (PAGO_MOVIL)</h3>
                <p className="text-xs">
                  Para el pago móvil en el ambiente sandbox, las transferencias son simuladas. El sistema te mostrará los datos de destino del comercio. Al realizar el pago ficticio, introduce cualquier referencia de banco de 6 a 10 dígitos (ej. <code className="rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] px-1 font-[family-name:var(--font-mono)] text-[length:var(--text-xs)] text-[var(--color-ink)]">239485</code>) para simular la confirmación asíncrona.
                </p>
              </div>
            )}

          </div>

          {/* COLUMN 3: REQUEST / RESPONSE (Col 9-12) */}
          <div className="lg:col-span-4 flex flex-col gap-[var(--space-sm)] lg:sticky lg:top-[var(--space-md)]">
            {(() => {
              const block = docSection === 'webhooks' ? codeBlocks.webhooks : codeBlocks.payment;
              return (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-graphite-rule)] bg-[var(--color-graphite)]">
                  {/* No fake window chrome — a real label row instead. */}
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--color-graphite-rule)] px-3 py-2">
                    <span className="font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-on-graphite-3)]">
                      Petición
                    </span>
                    <div className="flex gap-0.5">
                      {(['curl', 'js', 'python', 'php'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setCodeLang(lang)}
                          aria-pressed={codeLang === lang}
                          className={`rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] transition-colors duration-[var(--dur-fast)] ${
                            codeLang === lang
                              ? 'bg-[var(--color-graphite-2)] text-[var(--color-accent-on-graphite)]'
                              : 'text-[var(--color-on-graphite-3)] hover:text-[var(--color-on-graphite)]'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="group relative max-h-[360px] overflow-auto p-3">
                    <pre className="whitespace-pre text-left font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] leading-relaxed text-[var(--color-on-graphite)]">
                      {block.req}
                    </pre>
                    <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <CopyButton value={block.req} label="código" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-y border-[var(--color-graphite-rule)] px-3 py-2">
                    <span className="font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-on-graphite-3)]">
                      Respuesta
                    </span>
                    <span className="rounded-[var(--radius-xs)] bg-[var(--color-graphite-2)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] tracking-[var(--tracking-mono-label)] text-[var(--color-accent-on-graphite)]">
                      200 OK
                    </span>
                  </div>

                  <div className="max-h-[220px] overflow-auto p-3">
                    <pre className="whitespace-pre text-left font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] leading-relaxed text-[var(--color-tok-str)]">
                      {block.res}
                    </pre>
                  </div>
                </div>
              );
            })()}

            {docSection === 'endpoints' ? (
              <SnippetCard
                title="Crear un link de pago"
                note="Genera un link alojado desde tu backend y compártelo con el cliente."
                code={codeBlocks.paymentLink.req}
              />
            ) : null}

            {docSection === 'endpoints' || docSection === 'intro' ? (
              <SnippetCard
                title="Consultar una transacción"
                note="Consulta el estado en tiempo real por referencia o por tu orderId."
                code={codeBlocks.retrieve.req}
              />
            ) : null}
          </div>

        </div>
      )}

    </div>
  );
}
