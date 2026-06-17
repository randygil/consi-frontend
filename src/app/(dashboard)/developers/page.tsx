'use client';

import { Copy, Eye, EyeOff, RefreshCw, BookOpen, Key, Terminal, Shield, Sparkles, Smartphone, CreditCard, HelpCircle, Code2, Link2, Check, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      className="size-8 rounded-md hover:bg-[var(--blue-50)] hover:text-[var(--blue-700)] transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={`Copiar ${label}`}
    >
      {copied ? <Check size={14} className="text-[var(--success-600)]" /> : <Copy size={14} />}
    </Button>
  );
}

function SecretRow({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const display = secret && !revealed ? '•'.repeat(Math.min(value.length, 32)) : value;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={display} className="font-mono text-xs bg-[var(--ink-50)] border-[var(--border)] focus:ring-1 focus:ring-[var(--blue-400)]" />
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
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--ink-50)] space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-strong)]">
        <Sparkles size={16} className="text-[var(--blue-500)]" />
        <span>Generador de Firma HMAC Interactivo</span>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Ingresa tus credenciales y los campos del dinero de tu orden para ver exactamente cómo se genera la firma digital para las cabeceras HTTP.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">API Key</label>
          <Input value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} className="font-mono text-xs bg-white" placeholder="apiKeyTest_..." />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">API Secret</label>
          <Input type="password" value={secretInput} onChange={(e) => setSecretInput(e.target.value)} className="font-mono text-xs bg-white" placeholder="apiSecretTest_..." />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Order ID</label>
          <Input value={orderInput} onChange={(e) => setOrderInput(e.target.value)} className="font-mono text-xs bg-white" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Amount</label>
            <Input value={amountInput} onChange={(e) => setAmountInput(e.target.value)} className="font-mono text-xs bg-white" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Currency</label>
            <select value={currencyInput} onChange={(e) => setCurrencyInput(e.target.value)} className="w-full h-[38px] rounded-md border border-[var(--border)] px-3 text-xs bg-white font-mono">
              <option value="USD">USD</option>
              <option value="VES">VES</option>
            </select>
          </div>
        </div>
      </div>
      <div className="pt-2 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Cadena a Firmar (Concatenada)</span>
          <span className="font-mono text-[10px] text-[var(--blue-600)]">apiKey|order|amount|currency</span>
        </div>
        <pre className="mt-1 p-2 rounded-md bg-white border border-[var(--border)] font-mono text-[11px] overflow-x-auto text-[var(--text-strong)]">
          {`${apiKeyInput || 'API_KEY'}|${orderInput}|${amountInput}|${currencyInput}`}
        </pre>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Firma HMAC-SHA256 Resultante (x-signature)</span>
        </div>
        <div className="mt-1 flex gap-2">
          <Input readOnly value={signatureOutput} className="font-mono text-xs bg-white border-[var(--border)] text-[var(--blue-700)] font-semibold" />
          <CopyButton value={signatureOutput} label="firma calculada" />
        </div>
      </div>
    </div>
  );
}

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKeys | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [mainTab, setMainTab] = useState<'keys' | 'docs'>('keys');

  // Documentation states
  const [docSection, setDocSection] = useState<'intro' | 'auth' | 'hmac' | 'checkout' | 'endpoints' | 'webhooks' | 'testing'>('intro');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-strong)] flex items-center gap-2">
            <Code2 className="text-[var(--blue-500)]" />
            <span>Desarrolladores & Integración</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Accede a tus credenciales de API y consulta la guía interactiva para conectar Consi.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[var(--ink-100)] p-1 rounded-xl w-fit">
          <button
            onClick={() => setMainTab('keys')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              mainTab === 'keys'
                ? 'bg-white shadow-[var(--shadow-xs)] text-[var(--blue-700)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-strong)]'
            }`}
          >
            <Key size={14} />
            <span>Claves y Webhooks</span>
          </button>
          <button
            onClick={() => setMainTab('docs')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              mainTab === 'docs'
                ? 'bg-white shadow-[var(--shadow-xs)] text-[var(--blue-700)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-strong)]'
            }`}
          >
            <BookOpen size={14} />
            <span>Documentación de API</span>
          </button>
        </div>
      </div>

      {status ? (
        <div className="p-3 rounded-lg bg-[var(--success-100)] text-[var(--success-600)] text-xs font-bold">
          {status}
        </div>
      ) : null}

      {/* VIEW: KEYS AND WEBHOOKS */}
      {mainTab === 'keys' && (
        <div className="space-y-6">
          <Card className="border-[var(--border)] shadow-[var(--shadow-sm)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
                <Key size={16} className="text-[var(--blue-500)]" />
                <span>Credenciales de API</span>
              </CardTitle>
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
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => regenerate('TEST')} className="text-xs">
                      <RefreshCw size={14} className="mr-1.5" /> Regenerar Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => regenerate('LIVE')} className="text-xs">
                      <RefreshCw size={14} className="mr-1.5" /> Regenerar Live
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">Cargando credenciales…</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-[var(--border)] shadow-[var(--shadow-sm)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
                <Terminal size={16} className="text-[var(--blue-500)]" />
                <span>Configuración de Webhook</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveWebhook} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="webhook" className="text-xs font-bold text-[var(--text-strong)]">URL del Webhook de tu Servidor</Label>
                  <Input
                    id="webhook"
                    type="url"
                    placeholder="https://tu-servidor.com/webhooks/consi"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="max-w-xl font-mono text-sm border-[var(--border)]"
                  />
                  <p className="text-xs text-[var(--text-subtle)]">
                    Consi enviará peticiones HTTP POST firmadas con eventos del estado de las transacciones (ej. <code className="bg-[var(--ink-100)] px-1 rounded">transaction.completed</code>) a este endpoint.
                  </p>
                </div>
                <Button type="submit" className="text-xs font-bold px-4 py-2">Guardar Endpoint</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-[var(--border)] shadow-[var(--shadow-sm)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
                <ArrowRight size={16} className="text-[var(--blue-500)]" />
                <span>Historial de Entregas de Webhook</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table className="border border-[var(--border)] rounded-xl overflow-hidden">
                <TableHeader className="bg-[var(--ink-50)]">
                  <TableRow>
                    <TableHead className="font-bold text-[var(--text-strong)]">Evento</TableHead>
                    <TableHead className="font-bold text-[var(--text-strong)]">Estado</TableHead>
                    <TableHead className="font-bold text-[var(--text-strong)]">Intentos</TableHead>
                    <TableHead className="font-bold text-[var(--text-strong)]">Último error</TableHead>
                    <TableHead className="font-bold text-[var(--text-strong)]">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-[var(--text-subtle)] font-medium">
                        Sin notificaciones enviadas aún
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveries.map((d) => (
                      <TableRow key={d.id} className="hover:bg-[var(--ink-50)] transition-colors">
                        <TableCell className="font-mono text-xs font-semibold">{d.event}</TableCell>
                        <TableCell>
                          <span
                            className={
                              d.status === 'DELIVERED'
                                ? 'inline-flex items-center rounded-full bg-[var(--success-100)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--success-600)]'
                                : d.status === 'FAILED'
                                  ? 'inline-flex items-center rounded-full bg-[var(--danger-100)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--danger-600)]'
                                  : 'inline-flex items-center rounded-full bg-[var(--warning-100)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--warning-600)]'
                            }
                          >
                            {d.status === 'DELIVERED' ? 'Completado' : d.status === 'FAILED' ? 'Fallido' : 'Pendiente'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-[var(--text-strong)]">{d.attempts}/{d.maxAttempts}</TableCell>
                        <TableCell className="max-w-xs truncate text-[var(--text-muted)] text-xs font-mono">
                          {d.lastError ?? '—'}
                        </TableCell>
                        <TableCell className="text-[var(--text-subtle)] text-xs">{formatDate(d.createdAt)}</TableCell>
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
          
          {/* COLUMN 1: SIDEBAR NAV (Col 1-3) */}
          <div className="lg:col-span-3 space-y-1 bg-white p-3 rounded-xl border border-[var(--border)] shadow-[var(--shadow-xs)] sticky top-6">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] px-3 mb-2">Integración Básica</div>
            <button
              onClick={() => setDocSection('intro')}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                docSection === 'intro' ? 'bg-[var(--blue-50)] text-[var(--blue-700)] font-bold' : 'text-[var(--text-body)] hover:bg-[var(--ink-50)]'
              }`}
            >
              <HelpCircle size={14} /> Introducción
            </button>
            <button
              onClick={() => setDocSection('auth')}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                docSection === 'auth' ? 'bg-[var(--blue-50)] text-[var(--blue-700)] font-bold' : 'text-[var(--text-body)] hover:bg-[var(--ink-50)]'
              }`}
            >
              <Shield size={14} /> Autenticación
            </button>
            <button
              onClick={() => setDocSection('hmac')}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                docSection === 'hmac' ? 'bg-[var(--blue-50)] text-[var(--blue-700)] font-bold' : 'text-[var(--text-body)] hover:bg-[var(--ink-50)]'
              }`}
            >
              <Terminal size={14} /> Firma HMAC
            </button>
            <button
              onClick={() => setDocSection('checkout')}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                docSection === 'checkout' ? 'bg-[var(--blue-50)] text-[var(--blue-700)] font-bold' : 'text-[var(--text-body)] hover:bg-[var(--ink-50)]'
              }`}
            >
              <Link2 size={14} /> Checkout (Hosted/Drop-in)
            </button>

            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] px-3 mt-4 mb-2">Referencia de API</div>
            <button
              onClick={() => setDocSection('endpoints')}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                docSection === 'endpoints' ? 'bg-[var(--blue-50)] text-[var(--blue-700)] font-bold' : 'text-[var(--text-body)] hover:bg-[var(--ink-50)]'
              }`}
            >
              <Code2 size={14} /> Endpoints Públicos
            </button>
            <button
              onClick={() => setDocSection('webhooks')}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                docSection === 'webhooks' ? 'bg-[var(--blue-50)] text-[var(--blue-700)] font-bold' : 'text-[var(--text-body)] hover:bg-[var(--ink-50)]'
              }`}
            >
              <ArrowRight size={14} /> Webhooks
            </button>
            <button
              onClick={() => setDocSection('testing')}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                docSection === 'testing' ? 'bg-[var(--blue-50)] text-[var(--blue-700)] font-bold' : 'text-[var(--text-body)] hover:bg-[var(--ink-50)]'
              }`}
            >
              <Sparkles size={14} /> Pruebas y Sandbox
            </button>
          </div>

          {/* COLUMN 2: GUIDES (Col 4-8) */}
          <div className="lg:col-span-5 space-y-6 text-sm text-[var(--text-body)] leading-relaxed">
            
            {/* SECTION: INTRO */}
            {docSection === 'intro' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--text-strong)]">Introducción</h2>
                <p>
                  Bienvenido a la API de <strong>Consi</strong>. Nuestra plataforma permite a empresas en Venezuela integrar cobros automatizados de forma rápida, segura y multi-moneda (USD y VES) empleando métodos tradicionales y alternativos.
                </p>
                <p>
                  Ofrecemos tres flujos principales de integración según las necesidades de tu sistema:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Hosted Checkout (Links de pago):</strong> Redirecciona a tu cliente a una página alojada de Consi para pagar. Es el camino más rápido, sin código en frontend.</li>
                  <li><strong>Embedded Checkout (Modal):</strong> Usa nuestra librería JavaScript <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-xs">consi.js</code> para abrir una ventana modal directamente en tu aplicación, manteniendo la experiencia in-app.</li>
                  <li><strong>Server-to-Server API (Directa):</strong> Crea cobros directamente desde tu backend, permitiendo construir tus propias experiencias y canalizar la confirmación mediante webhooks.</li>
                </ul>
              </div>
            )}

            {/* SECTION: AUTH */}
            {docSection === 'auth' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--text-strong)]">Autenticación</h2>
                <p>
                  La comunicación con la API pública de Consi se realiza bajo HTTPS y se autentica mediante la cabecera HTTP <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-xs">x-api-key</code>.
                </p>
                <p>
                  Cada comercio dispone de dos juegos de llaves accesibles desde la pestaña <strong>Claves y Webhooks</strong>:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--ink-50)]">
                    <span className="font-bold text-[var(--text-strong)] block text-xs">Ambiente de Pruebas (Test):</span>
                    <span className="text-xs font-mono">x-api-key: c_test_...</span>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Usa esta clave para hacer simulaciones sin alterar dinero real ni cuentas bancarias.</p>
                  </div>
                  <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--ink-50)]">
                    <span className="font-bold text-[var(--text-strong)] block text-xs">Ambiente de Producción (Live):</span>
                    <span className="text-xs font-mono">x-api-key: c_live_...</span>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Usa esta clave en tu producción real para recibir cobros reales.</p>
                  </div>
                </div>
                <div className="p-3 bg-[var(--warning-100)] border border-[var(--warning-600)] text-[var(--warning-600)] rounded-lg text-xs font-semibold">
                  ⚠️ NUNCA expongas tus API Secrets (claves privadas) en código de frontend o repositorios públicos.
                </div>
              </div>
            )}

            {/* SECTION: HMAC SIGNATURE */}
            {docSection === 'hmac' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--text-strong)]">Firma HMAC y Seguridad</h2>
                <p>
                  Para garantizar la integridad y evitar que los campos sensibles (como el monto o la moneda) sean alterados en tránsito, Consi requiere una firma digital en las peticiones que creen recursos (<code className="bg-[var(--ink-100)] px-1 rounded font-mono text-xs">POST</code>).
                </p>
                <p>
                  Esta firma debe enviarse en la cabecera <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-xs">x-signature</code>.
                </p>
                <div className="space-y-2">
                  <h3 className="font-bold text-[var(--text-strong)]">Cómo Calcular la Firma:</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-xs">
                    <li>Concatena los valores requeridos en el orden exacto separados por tuberías (<code className="bg-[var(--ink-100)] px-1 rounded">|</code>): <br />
                      <code className="bg-[var(--ink-100)] p-1 rounded block mt-1 font-mono text-[11px] text-[var(--blue-700)]">apiKey|order|amount|currency</code>
                    </li>
                    <li>Utiliza tu clave secreta de API (<code className="bg-[var(--ink-100)] px-1 rounded">apiSecret</code>) correspondiente como clave de firma.</li>
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
                <h2 className="text-xl font-bold text-[var(--text-strong)]">Hosted Checkout & Embedded Iframe</h2>
                <p>
                  Consi ofrece una interfaz interactiva de pagos ya construida que le permite al pagador elegir entre <strong>Pago Móvil, Transferencias, Tarjetas o USDT (criptomonedas)</strong>.
                </p>
                
                <h3 className="font-bold text-[var(--text-strong)] mt-2">1. Flujo Redireccionado (Hosted)</h3>
                <p>
                  Consiste en crear un enlace de pago desde tu backend y redireccionar al usuario a la propiedad <code className="bg-[var(--ink-100)] px-1 rounded">url</code> devuelta en la respuesta de la API. Cuando se confirma la liquidación, el usuario es redirigido a la URL especificada en <code className="bg-[var(--ink-100)] px-1 rounded">successUrl</code>.
                </p>

                <h3 className="font-bold text-[var(--text-strong)] mt-2">2. Checkout Incrustado (Drop-in Modal)</h3>
                <p>
                  Mediante nuestra librería, puedes desplegar la ventana de cobro Consi en un modal iframe directamente sobre tu web sin redirigir al cliente.
                </p>
                <div className="p-3 border border-[var(--border)] rounded-lg space-y-1">
                  <span className="font-bold text-[var(--text-strong)] block text-xs">Pasos de uso:</span>
                  <ol className="list-decimal pl-4 text-xs space-y-1">
                    <li>Incrusta la etiqueta script de consi.js una sola vez.</li>
                    <li>Invoca <code className="font-mono bg-[var(--ink-100)] px-1 rounded text-xs">Consi.checkout(...)</code> indicando el token del pago y el callback de éxito.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* SECTION: ENDPOINTS REFERENCE */}
            {docSection === 'endpoints' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--text-strong)]">Referencia de la API Pública</h2>
                <p>
                  A continuación se documentan los endpoints públicos expuestos para comercios. El servidor escucha en el puerto <code className="font-mono bg-[var(--ink-100)] px-1 rounded text-xs">http://localhost:4000/api</code>.
                </p>

                {/* Sub-nav of endpoints to click and highlight code */}
                <div className="space-y-3">
                  <div className="p-3 border border-[var(--border)] rounded-lg hover:border-[var(--blue-400)] transition-colors cursor-pointer" onClick={() => setDocSection('endpoints')}>
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-md uppercase font-mono mr-2">POST</span>
                    <code className="font-mono text-xs font-bold text-[var(--text-strong)]">/payment</code>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Crea una transacción directa de pago PENDING en el sistema. Requiere firma HMAC.</p>
                  </div>
                  
                  <div className="p-3 border border-[var(--border)] rounded-lg hover:border-[var(--blue-400)] transition-colors cursor-pointer" onClick={() => setDocSection('endpoints')}>
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-md uppercase font-mono mr-2">POST</span>
                    <code className="font-mono text-xs font-bold text-[var(--text-strong)]">/payment/links</code>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Crea programáticamente un link de pago público (Stripe Checkout) y retorna la URL. Requiere firma HMAC.</p>
                  </div>

                  <div className="p-3 border border-[var(--border)] rounded-lg hover:border-[var(--blue-400)] transition-colors cursor-pointer" onClick={() => setDocSection('endpoints')}>
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-md uppercase font-mono mr-2">GET</span>
                    <code className="font-mono text-xs font-bold text-[var(--text-strong)]">/payment/:reference</code>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Recupera los detalles y estado del pago usando la referencia única de Consi. Sin firma HMAC.</p>
                  </div>

                  <div className="p-3 border border-[var(--border)] rounded-lg hover:border-[var(--blue-400)] transition-colors cursor-pointer" onClick={() => setDocSection('endpoints')}>
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-md uppercase font-mono mr-2">GET</span>
                    <code className="font-mono text-xs font-bold text-[var(--text-strong)]">/payment/order/:orderId</code>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Recupera los detalles y estado del pago usando tu ID de orden de comercio. Sin firma HMAC.</p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION: WEBHOOKS */}
            {docSection === 'webhooks' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--text-strong)]">Webhooks y Notificaciones</h2>
                <p>
                  Los webhooks permiten recibir actualizaciones del estado de un pago de forma asíncrona. Cuando el pago se completa (o falla), Consi realiza una llamada POST HTTP a la URL de webhook configurada.
                </p>
                <div className="space-y-2">
                  <h3 className="font-bold text-[var(--text-strong)]">Cabeceras enviadas:</h3>
                  <ul className="list-disc pl-5 text-xs space-y-1 font-mono">
                    <li><strong>x-consi-event:</strong> El nombre del evento (ej: <code className="bg-slate-100 px-1 rounded">transaction.completed</code>)</li>
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
                <h2 className="text-xl font-bold text-[var(--text-strong)]">Pruebas en Sandbox</h2>
                <p>
                  Durante las pruebas con la clave de prueba (<code className="bg-[var(--ink-100)] px-1 rounded">c_test_...</code>), puedes forzar el estado de tus transacciones usando las siguientes credenciales simuladas en la interfaz de pago:
                </p>
                
                <h3 className="font-bold text-[var(--text-strong)] text-xs uppercase tracking-wider text-[var(--text-subtle)]">1. Tarjetas de Prueba (CARD)</h3>
                <Table className="border border-[var(--border)] text-xs rounded-lg overflow-hidden">
                  <TableHeader className="bg-[var(--ink-50)]">
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
                      <TableCell className="text-[var(--success-600)] font-bold">Aprobado inmediato</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <h3 className="font-bold text-[var(--text-strong)] text-xs uppercase tracking-wider text-[var(--text-subtle)] mt-2">2. Pago Móvil de Prueba (PAGO_MOVIL)</h3>
                <p className="text-xs">
                  Para el pago móvil en el ambiente sandbox, las transferencias son simuladas. El sistema te mostrará los datos de destino del comercio. Al realizar el pago ficticio, introduce cualquier referencia de banco de 6 a 10 dígitos (ej. <code className="bg-[var(--ink-100)] px-1 rounded font-mono">239485</code>) para simular la confirmación asíncrona.
                </p>
              </div>
            )}

          </div>

          {/* COLUMN 3: CODE SNIPPET TERMINAL (Col 9-12) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-[var(--ink-950)] bg-[var(--ink-900)] text-[var(--ink-100)] shadow-[var(--shadow-md)] overflow-hidden font-mono text-[11px]">
              
              {/* Terminal Header */}
              <div className="bg-[var(--ink-950)] px-4 py-3 flex items-center justify-between border-b border-[var(--ink-900)]">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#ff5f56]" />
                  <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
                  <span className="size-2.5 rounded-full bg-[#27c93f]" />
                  <span className="ml-2 text-xs font-semibold text-[var(--text-subtle)]">Petición HTTP</span>
                </div>
                
                {/* Language tabs */}
                <div className="flex bg-[var(--ink-900)] p-0.5 rounded-md border border-[var(--border)]/10 text-[9px] font-bold">
                  {(['curl', 'js', 'python', 'php'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLang(lang)}
                      className={`px-1.5 py-0.5 rounded ${
                        codeLang === lang ? 'bg-[var(--blue-600)] text-white' : 'text-[var(--text-subtle)] hover:text-white'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Snippet Code Area */}
              <div className="p-4 overflow-x-auto max-h-[360px] bg-[var(--ink-950)] relative group">
                <pre className="text-left text-green-400 whitespace-pre leading-relaxed font-mono">
                  {docSection === 'intro' || docSection === 'auth' || docSection === 'hmac' || docSection === 'checkout'
                    ? codeBlocks.payment.req
                    : docSection === 'endpoints'
                    ? codeBlocks.payment.req
                    : docSection === 'webhooks'
                    ? codeBlocks.webhooks.req
                    : codeBlocks.payment.req
                  }
                </pre>
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton
                    value={
                      docSection === 'intro' || docSection === 'auth' || docSection === 'hmac' || docSection === 'checkout'
                        ? codeBlocks.payment.req
                        : docSection === 'endpoints'
                        ? codeBlocks.payment.req
                        : docSection === 'webhooks'
                        ? codeBlocks.webhooks.req
                        : codeBlocks.payment.req
                    }
                    label="código"
                  />
                </div>
              </div>

              {/* Endpoint response header */}
              <div className="bg-[var(--ink-950)] px-4 py-2 border-t border-[var(--ink-900)] flex items-center justify-between text-xs font-semibold text-[var(--text-subtle)]">
                <span>Respuesta HTTP 200 OK</span>
              </div>

              {/* JSON Response Area */}
              <div className="p-4 bg-[var(--ink-950)] overflow-x-auto max-h-[220px] border-t border-[var(--ink-900)] text-blue-300">
                <pre className="text-left whitespace-pre font-mono leading-relaxed">
                  {docSection === 'intro' || docSection === 'auth' || docSection === 'hmac' || docSection === 'checkout'
                    ? codeBlocks.payment.res
                    : docSection === 'endpoints'
                    ? codeBlocks.payment.res
                    : docSection === 'webhooks'
                    ? codeBlocks.webhooks.res
                    : codeBlocks.payment.res
                  }
                </pre>
              </div>

            </div>

            {/* Programmatic Payment Link Snippet (Conditional helper card) */}
            {docSection === 'endpoints' && (
              <div className="rounded-xl border border-[var(--border)] p-4 bg-white space-y-2">
                <span className="text-xs font-bold text-[var(--text-strong)] block">Creación de Enlaces (Hosted Links)</span>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Puedes alternar los snippets para probar el endpoint de creación de links de pago haciendo clic abajo:
                </p>
                <div className="rounded-lg border border-[var(--border)] p-2 bg-[var(--ink-50)] text-[10px] font-mono whitespace-pre overflow-x-auto">
                  {codeBlocks.paymentLink.req}
                </div>
              </div>
            )}

            {/* Retrieve Status snippet (Conditional helper card) */}
            {(docSection === 'endpoints' || docSection === 'intro') && (
              <div className="rounded-xl border border-[var(--border)] p-4 bg-white space-y-2">
                <span className="text-xs font-bold text-[var(--text-strong)] block">Consulta de Transacción</span>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Puedes consultar el estado en tiempo real mediante la referencia única o el orderId de tu tienda:
                </p>
                <div className="rounded-lg border border-[var(--border)] p-2 bg-[var(--ink-50)] text-[10px] font-mono whitespace-pre overflow-x-auto">
                  {codeBlocks.retrieve.req}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
