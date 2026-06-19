"use client";

import {
  Copy,
  BookOpen,
  Terminal,
  Shield,
  Sparkles,
  Smartphone,
  CreditCard,
  HelpCircle,
  Code2,
  Link2,
  Check,
  ArrowRight,
  Banknote,
  Key,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeBlock, toPrismLang } from "@/components/ui/code-block";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
import type { ApiKeys } from "@/lib/types";

// ponytail: tiny dup of CopyButton beats a new shared module
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
      {copied ? (
        <Check size={14} className="text-[var(--success-600)]" />
      ) : (
        <Copy size={14} />
      )}
    </Button>
  );
}

function SignatureGenerator({ keys }: { keys: ApiKeys | null }) {
  const [apiKeyInput, setApiKeyInput] = useState(keys?.apiKeyTest || "");
  const [secretInput, setSecretInput] = useState(keys?.apiSecretTest || "");
  const [orderInput, setOrderInput] = useState("orden-123");
  const [amountInput, setAmountInput] = useState("100.00");
  const [currencyInput, setCurrencyInput] = useState("USD");
  const [signatureOutput, setSignatureOutput] = useState("");

  useEffect(() => {
    if (keys) {
      setApiKeyInput(keys.apiKeyTest);
      setSecretInput(keys.apiSecretTest);
    }
  }, [keys]);

  useEffect(() => {
    const calculateSignature = async () => {
      if (!apiKeyInput || !secretInput) {
        setSignatureOutput("Ingresa tu API Key y Secret en los campos");
        return;
      }
      try {
        const payload = [
          apiKeyInput,
          orderInput,
          amountInput,
          currencyInput,
        ].join("|");
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secretInput);
        const messageData = encoder.encode(payload);

        const cryptoKey = await window.crypto.subtle.importKey(
          "raw",
          keyData,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );

        const signatureBuffer = await window.crypto.subtle.sign(
          "HMAC",
          cryptoKey,
          messageData,
        );

        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        setSignatureOutput(hashHex);
      } catch (err) {
        setSignatureOutput("Error al calcular firma");
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
        Ingresa tus credenciales y los campos del dinero de tu orden para ver
        exactamente cómo se genera la firma digital para las cabeceras HTTP.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            API Key
          </label>
          <Input
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="font-mono text-xs bg-white"
            placeholder="apiKeyTest_..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            API Secret
          </label>
          <Input
            type="password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            className="font-mono text-xs bg-white"
            placeholder="apiSecretTest_..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Order ID
          </label>
          <Input
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value)}
            className="font-mono text-xs bg-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Amount
            </label>
            <Input
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="font-mono text-xs bg-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Currency
            </label>
            <select
              value={currencyInput}
              onChange={(e) => setCurrencyInput(e.target.value)}
              className="w-full h-[38px] rounded-md border border-[var(--border)] px-3 text-xs bg-white font-mono"
            >
              <option value="USD">USD</option>
              <option value="VES">VES</option>
            </select>
          </div>
        </div>
      </div>
      <div className="pt-2 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase text-[var(--text-muted)]">
            Cadena a Firmar (Concatenada)
          </span>
          <span className="font-mono text-[10px] text-[var(--blue-600)]">
            apiKey|order|amount|currency
          </span>
        </div>
        <pre className="mt-1 p-2 rounded-md bg-white border border-[var(--border)] font-mono text-[11px] overflow-x-auto text-[var(--text-strong)]">
          {`${apiKeyInput || "API_KEY"}|${orderInput}|${amountInput}|${currencyInput}`}
        </pre>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase text-[var(--text-muted)]">
            Firma HMAC-SHA256 Resultante (x-signature)
          </span>
        </div>
        <div className="mt-1 flex gap-2">
          <Input
            readOnly
            value={signatureOutput}
            className="font-mono text-xs bg-white border-[var(--border)] text-[var(--blue-700)] font-semibold"
          />
          <CopyButton value={signatureOutput} label="firma calculada" />
        </div>
      </div>
    </div>
  );
}

function SdkInteractiveSimulator() {
  const [currency, setCurrency] = useState<"USD" | "VES">("USD");
  const [amount, setAmount] = useState("100.00");
  const [description, setDescription] = useState("Prueba de Integración SDK");
  const [simMode, setSimMode] = useState<"live" | "mock">("mock");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockToken, setMockToken] = useState("sdk-mock-token-123");

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev]);
  };

  // Código que reproduce exactamente lo que ejecuta este playground, en vivo.
  const generatedCode = `// 1) Backend: crea un link de pago y obtén el token
const link = await fetch('http://localhost:4000/api/payment/links', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
  body: JSON.stringify({
    amount: '${amount}',
    currency: '${currency}',
    description: '${description}',
    methods: ['CARD', 'PAGO_MOVIL'],
  }),
}).then((r) => r.json());

// 2) Frontend: abre el checkout incrustado con ese token
Consi.checkout({
  token: link.data.token,
  onSuccess: (data) => console.log('✅ Pagado:', data.reference),
  onClose: () => console.log('ℹ️ Modal cerrado'),
});`;

  const handleTestSDK = async () => {
    setLoading(true);
    addLog(`Iniciando prueba en modo: ${simMode.toUpperCase()}`);

    addLog("Cargando script del SDK consi.js...");
    try {
      if (!(window as any).Consi) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = window.location.origin + "/consi.js";
          script.async = true;
          script.onload = () => {
            addLog("Script consi.js cargado exitosamente");
            resolve();
          };
          script.onerror = () => {
            addLog("Error al cargar consi.js script");
            reject(new Error("Failed to load consi.js"));
          };
          document.body.appendChild(script);
        });
      } else {
        addLog("SDK de Consi.js ya disponible en window");
      }

      if (simMode === "live") {
        addLog("Creando link de pago temporal mediante API backend...");
        const link = await api.createPaymentLink({
          amount,
          currency: currency as any,
          description,
          methods: ["CARD", "PAGO_MOVIL"],
        });
        addLog(`Link creado con token: ${link.token}`);
        addLog(`Ejecutando Consi.checkout({ token: "${link.token}" })`);

        (window as any).Consi.checkout({
          token: link.token,
          onSuccess: (data: any) => {
            addLog(`✅ Callback onSuccess recibido con éxito!`);
            addLog(`Detalles del pago: ${JSON.stringify(data)}`);
          },
          onClose: () => {
            addLog(`ℹ️ Callback onClose recibido (modal cerrado).`);
          },
        });
      } else {
        // Mock mode
        const token = `mock-token-${Math.random().toString(36).substring(2, 11)}`;
        setMockToken(token);
        addLog(`Simulando creación de token temporal: ${token}`);
        addLog(`Ejecutando Consi.checkout({ token: "${token}" }) (Simulado)`);
        setShowMockModal(true);
      }
    } catch (err: any) {
      addLog(`❌ Error durante la prueba: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--ink-50)] space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[var(--text-strong)] flex items-center gap-1.5">
          <Sparkles size={16} className="text-[var(--blue-500)]" />
          <span>Simulador del SDK Consi.js</span>
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--blue-500)] text-white border border-[var(--blue-200)] shadow-sm">
          Interactivo
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Modo de Simulación
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSimMode("mock")}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg border transition-all ${
                simMode === "mock"
                  ? "bg-white border-[var(--blue-500)] text-[var(--blue-700)] shadow-sm"
                  : "bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:bg-white"
              }`}
            >
              Mocked (En memoria)
            </button>
            <button
              type="button"
              onClick={() => setSimMode("live")}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg border transition-all ${
                simMode === "live"
                  ? "bg-white border-[var(--blue-500)] text-[var(--blue-700)] shadow-sm"
                  : "bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:bg-white"
              }`}
            >
              Live (Checkout real)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Monto
            </label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-xs bg-white h-[38px] border-[var(--border)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Moneda
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "USD" | "VES")}
              className="w-full h-[38px] rounded-md border border-[var(--border)] px-3 text-xs bg-white"
            >
              <option value="USD">USD</option>
              <option value="VES">VES</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Descripción de Pago
        </label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-xs bg-white h-[38px] border-[var(--border)]"
        />
      </div>

      <Button
        type="button"
        onClick={handleTestSDK}
        disabled={loading}
        className="w-full text-xs font-bold py-2.5 flex items-center justify-center gap-1.5"
      >
        {loading ? "Preparando..." : "Probar SDK / Iniciar Checkout"}
      </Button>

      {/* Live-generated code that mirrors the form inputs */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Código equivalente (en vivo)
        </span>
        <CodeBlock code={generatedCode} language="javascript" maxHeight={260} />
      </div>

      {/* Logs output console */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Consola de Eventos del SDK
          </span>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="text-[9px] font-bold text-[var(--text-subtle)] hover:text-[var(--text-strong)]"
          >
            Limpiar
          </button>
        </div>
        <div className="h-32 rounded-lg bg-[var(--ink-950)] p-3 overflow-y-auto font-mono text-[10px] text-green-400 space-y-1 border border-[var(--border)]/10">
          {logs.length === 0 && (
            <span className="text-[var(--text-subtle)] italic">
              Los eventos del SDK aparecerán aquí al iniciar la prueba...
            </span>
          )}
          {logs.map((log, idx) => (
            <div key={idx} className="whitespace-pre-wrap leading-relaxed">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Fully mocked checkout modal simulation */}
      {showMockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-white p-6 shadow-2xl border border-[var(--ink-100)] space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-extrabold text-[var(--text-strong)]">
                Demo Checkout Consi (Mock)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--warning-100)] text-[var(--warning-700)]">
                SIMULADO
              </span>
            </div>

            <div className="rounded-lg bg-[var(--ink-50)] p-4 text-center">
              <div className="font-mono text-2xl font-bold text-[var(--text-strong)]">
                {amount} {currency}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {description}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[var(--text-muted)] text-center">
                Elige el resultado del callback para la integración:
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    addLog(
                      `✅ Callback onSuccess recibido con éxito! (Simulado)`,
                    );
                    addLog(
                      `Detalles del pago: ${JSON.stringify({ type: "consi:paid", token: mockToken, status: "PAID", reference: "MOCK-TRX-777888" })}`,
                    );
                    setShowMockModal(false);
                  }}
                  className="flex-1 text-[11px] bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                  Simular Éxito
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    addLog(
                      `ℹ️ Callback onClose recibido (modal cerrado). (Simulado)`,
                    );
                    setShowMockModal(false);
                  }}
                  variant="outline"
                  className="flex-1 text-[11px] font-bold"
                >
                  Simular Cierre
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SDK_FRAMEWORK_EXAMPLES = {
  html: {
    label: "HTML",
    code: `<!-- 1. Carga el SDK una sola vez -->
<script src="http://localhost:3000/consi.js"></script>

<button id="pay">Pagar con Consi</button>

<script>
  document.getElementById('pay').addEventListener('click', () => {
    // El token lo generas en tu backend (POST /api/payment/links)
    Consi.checkout({
      token: 'demo-link-token',
      onSuccess: (data) => {
        console.log('Pago confirmado:', data.reference);
        window.location.href = '/gracias';
      },
      onClose: () => console.log('El cliente cerró el modal'),
    });
  });
</script>`,
  },
  react: {
    label: "React",
    code: `import { useEffect, useCallback } from 'react';

// Carga el script de Consi.js una vez por app
function useConsi() {
  useEffect(() => {
    if (document.getElementById('consi-sdk')) return;
    const s = document.createElement('script');
    s.id = 'consi-sdk';
    s.src = 'http://localhost:3000/consi.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);
}

export function PayButton({ token }: { token: string }) {
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
  },
  vue: {
    label: "Vue",
    code: `<script setup>
import { onMounted } from 'vue';

const props = defineProps({ token: String });

onMounted(() => {
  if (document.getElementById('consi-sdk')) return;
  const s = document.createElement('script');
  s.id = 'consi-sdk';
  s.src = 'http://localhost:3000/consi.js';
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
} as const;

function SdkFrameworkExamples() {
  const [fw, setFw] = useState<keyof typeof SDK_FRAMEWORK_EXAMPLES>("html");
  const current = SDK_FRAMEWORK_EXAMPLES[fw];

  return (
    <div className="rounded-xl border border-[var(--ink-950)] bg-[var(--ink-900)] overflow-hidden">
      <div className="bg-[var(--ink-950)] px-3 py-2 flex items-center border-b border-[var(--ink-900)]">
        <div className="flex bg-[var(--ink-900)] p-0.5 rounded-md text-[10px] font-bold">
          {(
            Object.keys(SDK_FRAMEWORK_EXAMPLES) as Array<
              keyof typeof SDK_FRAMEWORK_EXAMPLES
            >
          ).map((k) => (
            <button
              key={k}
              onClick={() => setFw(k)}
              className={`px-2.5 py-1 rounded transition-colors ${
                fw === k
                  ? "bg-[var(--blue-600)] text-white"
                  : "text-[var(--text-subtle)] hover:text-white"
              }`}
            >
              {SDK_FRAMEWORK_EXAMPLES[k].label}
            </button>
          ))}
        </div>
      </div>
      <CodeBlock
        code={current.code}
        language={toPrismLang(fw)}
        maxHeight={340}
        className="rounded-none border-0"
      />
    </div>
  );
}

type EndpointId =
  | "payment"
  | "paymentLink"
  | "payout"
  | "retrieve"
  | "retrieveOrder";

interface EndpointParam {
  name: string;
  type: string;
  required: boolean;
  in?: "body" | "path";
  desc: string;
}

interface EndpointMeta {
  id: EndpointId;
  method: "GET" | "POST";
  path: string;
  title: string;
  summary: string;
  hmac: boolean;
  returns: string;
  params: EndpointParam[];
}

/** Single source of truth for the public API reference (mirrors PublicPaymentController). */
const ENDPOINTS: EndpointMeta[] = [
  {
    id: "payment",
    method: "POST",
    path: "/payment",
    title: "Crear pago directo",
    summary:
      "Crea una transacción de cobro PENDING server-to-server. Ideal para construir tu propia experiencia de pago.",
    hmac: true,
    returns:
      "El objeto Transaction recién creado con su reference única y estado PENDING.",
    params: [
      {
        name: "order",
        type: "string",
        required: true,
        desc: "Tu identificador único de la orden. Forma parte de la firma HMAC y previene cobros duplicados.",
      },
      {
        name: "amount",
        type: "string",
        required: true,
        desc: "Monto con hasta 2 decimales, enviado como string para preservar precisión. Debe ser mayor a 0.",
      },
      {
        name: "currency",
        type: "enum USD | VES",
        required: true,
        desc: "Moneda del cobro.",
      },
      {
        name: "customerName",
        type: "string",
        required: false,
        desc: "Nombre del pagador (máx. 120 caracteres).",
      },
      {
        name: "description",
        type: "string",
        required: false,
        desc: "Concepto del cobro (máx. 255 caracteres).",
      },
      {
        name: "cardToken",
        type: "string",
        required: false,
        desc: "Token de tarjeta previamente tokenizada para un cobro inmediato.",
      },
    ],
  },
  {
    id: "paymentLink",
    method: "POST",
    path: "/payment/links",
    title: "Crear link de pago",
    summary:
      "Genera programáticamente un enlace de pago alojado (Hosted Checkout) y devuelve su URL y token.",
    hmac: true,
    returns:
      "Un objeto con el token, la url del checkout alojado y el detalle del cobro.",
    params: [
      {
        name: "order",
        type: "string",
        required: true,
        desc: "Tu identificador único de la orden. Forma parte de la firma HMAC.",
      },
      {
        name: "amount",
        type: "string",
        required: true,
        desc: "Monto con hasta 2 decimales, como string. Debe ser mayor a 0.",
      },
      {
        name: "currency",
        type: "enum USD | VES",
        required: true,
        desc: "Moneda del cobro.",
      },
      {
        name: "description",
        type: "string",
        required: false,
        desc: "Concepto mostrado al cliente en el checkout.",
      },
      {
        name: "methods",
        type: "array<PaymentMethod>",
        required: false,
        desc: "Métodos habilitados: PAGO_MOVIL, C2P, TRANSFER, CARD, USDT, ZELLE. Por defecto todos los disponibles. Ver la sección Métodos de pago del panel para el detalle de cada uno.",
      },
      {
        name: "successUrl",
        type: "string (url)",
        required: false,
        desc: "URL a la que se redirige al cliente tras un pago exitoso.",
      },
    ],
  },
  {
    id: "payout",
    method: "POST",
    path: "/payment/payout",
    title: "Crear payout (retiro)",
    summary:
      "Envía fondos desde tu saldo. Para pagar a tu cliente final indica su destino como objeto (destination, con los campos que pide la pasarela); para liquidar tu propio saldo indica una cuenta registrada (bankAccountId). Consi resuelve la pasarela y el modo de retiro internamente.",
    hmac: true,
    returns:
      "El objeto Transaction de tipo PAYOUT con su reference y estado PENDING.",
    params: [
      {
        name: "amount",
        type: "string",
        required: true,
        desc: "Monto a retirar, con hasta 2 decimales. Debe ser mayor a 0.",
      },
      {
        name: "currency",
        type: "enum USD | VES",
        required: true,
        desc: "Moneda del retiro.",
      },
      {
        name: "bankAccountId",
        type: "string",
        required: false,
        desc: "Liquidación a tu cuenta bancaria registrada. Úsalo para retiros del comercio. Excluyente con destination.",
      },
      {
        name: "destination",
        type: "object",
        required: false,
        desc: "Destino del cliente final como objeto (ej. { document, phone, bank } para Pago Móvil). Sus campos los define la pasarela que resuelve Consi; si falta uno requerido la API responde 400. Excluyente con bankAccountId.",
      },
      {
        name: "description",
        type: "string",
        required: false,
        desc: "Concepto del retiro (máx. 255 caracteres).",
      },
      {
        name: "order",
        type: "string",
        required: false,
        desc: "Identificador opcional. Si lo envías, forma parte de la firma HMAC.",
      },
    ],
  },
  {
    id: "retrieve",
    method: "GET",
    path: "/payment/:reference",
    title: "Consultar por referencia",
    summary:
      "Recupera los detalles y el estado actual de un pago usando la referencia única de Consi.",
    hmac: false,
    returns: "El objeto Transaction correspondiente a la referencia.",
    params: [
      {
        name: "reference",
        type: "string",
        required: true,
        in: "path",
        desc: "Referencia única generada por Consi, ej. CONSI-TRX-ABCD1234.",
      },
    ],
  },
  {
    id: "retrieveOrder",
    method: "GET",
    path: "/payment/order/:orderId",
    title: "Consultar por orden",
    summary:
      "Recupera el estado de un pago usando tu propio ID de orden de comercio.",
    hmac: false,
    returns: "El objeto Transaction asociado a tu orderId.",
    params: [
      {
        name: "orderId",
        type: "string",
        required: true,
        in: "path",
        desc: "El identificador de orden que tú asignaste al crear el cobro.",
      },
    ],
  },
];

const METHOD_BADGE: Record<"GET" | "POST", string> = {
  GET: "bg-[var(--blue-100)] text-[var(--blue-700)]",
  POST: "bg-[var(--success-100)] text-[var(--success-600)]",
};

/** Outbound webhook event catalog (mirrors merchant-notification.service.ts). */
const WEBHOOK_EVENTS: {
  event: string;
  when: string;
  tone: "success" | "warning" | "danger";
}[] = [
  {
    event: "transaction.completed",
    when: "El pago se liquidó correctamente. Esta es la señal para entregar el producto o servicio.",
    tone: "success",
  },
  {
    event: "transaction.pending",
    when: "El pago fue creado y está a la espera de confirmación del banco o del cliente.",
    tone: "warning",
  },
  {
    event: "transaction.failed",
    when: "El pago fue rechazado, expiró o no pudo completarse.",
    tone: "danger",
  },
];

export default function DocsPage() {
  const [keys, setKeys] = useState<ApiKeys | null>(null);

  // Documentation states
  const [docSection, setDocSection] = useState<
    | "intro"
    | "auth"
    | "hmac"
    | "checkout"
    | "sdk"
    | "endpoints"
    | "webhooks"
    | "testing"
  >("intro");
  const [codeLang, setCodeLang] = useState<"curl" | "js" | "python" | "php">(
    "curl",
  );
  // Endpoint currently selected in the API reference (drives the code panel on the right).
  const [activeEndpoint, setActiveEndpoint] = useState<EndpointId>("payment");

  useEffect(() => {
    api
      .getApiKeys()
      .then(setKeys)
      .catch(() => setKeys(null));
  }, []);

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
?>`,
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
?>`,
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
?>`,
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
?>`,
    },
    payout: {
      curl: `curl -X POST http://localhost:4000/api/payment/payout \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: \${keys?.apiKeyTest || 'TU_API_KEY'}" \\
  -H "x-signature: CALCULATED_HMAC_SIGNATURE" \\
  -d '{
    "order": "payout_501",
    "amount": "500.00",
    "currency": "VES",
    "destination": { "document": "V-12345678", "phone": "0414-1234567", "bank": "0105" },
    "description": "Retiro a Pago Móvil del cliente"
  }'`,
      js: `const crypto = require('crypto');
const apiKey = '\${keys?.apiKeyTest || 'TU_API_KEY'}';
const secret = '\${keys?.apiSecretTest || 'TU_API_SECRET'}';
const order = 'payout_501';
const amount = '500.00';
const currency = 'VES';

// La firma se calcula sobre apiKey|order|amount|currency
const payload = [apiKey, order, amount, currency].join('|');
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

fetch('http://localhost:4000/api/payment/payout', {
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
      python: `import hmac
import hashlib
import requests

api_key = "\${keys?.apiKeyTest || 'TU_API_KEY'}"
secret = "\${keys?.apiSecretTest || 'TU_API_SECRET'}"
order = "payout_501"
amount = "500.00"
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
    # Destino del cliente final: objeto con los campos que pide la pasarela
    # (aquí Pago Móvil). Para liquidar tu propio saldo usa "bankAccountId".
    "destination": {"document": "V-12345678", "phone": "0414-1234567", "bank": "0105"},
    "description": "Retiro a Pago Móvil del cliente"
}

response = requests.post("http://localhost:4000/api/payment/payout", json=body, headers=headers)
print(response.json())`,
      php: `<?php
$apiKey = '\${keys?.apiKeyTest || 'TU_API_KEY'}';
$secret = '\${keys?.apiSecretTest || 'TU_API_SECRET'}';
$order = 'payout_501';
$amount = '500.00';
$currency = 'VES';

$payload = implode('|', [$apiKey, $order, $amount, $currency]);
$signature = hash_hmac('sha256', $payload, $secret);

$ch = curl_init('http://localhost:4000/api/payment/payout');
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
?>`,
    },
    sdk: {
      curl: `<!-- Integración HTML y JS nativo -->
<script src="http://localhost:3000/consi.js"></script>
<button id="consi-btn">Pagar con Consi</button>
<script>
  document.getElementById('consi-btn').addEventListener('click', () => {
    Consi.checkout({
      token: 'demo-link-token',
      onSuccess: (data) => console.log('Éxito:', data),
      onClose: () => console.log('Checkout cerrado')
    });
  });
</script>`,
      js: `// Ejemplo en componente React (Next.js)
import { useEffect } from 'react';

export function CheckoutButton({ token }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'http://localhost:3000/consi.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const pay = () => {
    window.Consi?.checkout({
      token,
      onSuccess: (data) => alert('Pago completado: ' + data.reference),
      onClose: () => console.log('Modal cerrado')
    });
  };

  return <button onClick={pay}>Pagar ahora</button>;
}`,
      python: `# Backend Python (Django / Flask)
# Crea el link de pago y retorna el token al frontend
import requests
api_key = "TU_API_KEY"
headers = { "x-api-key": api_key, "Content-Type": "application/json" }
payload = { "amount": "100.00", "currency": "USD", "methods": ["CARD", "PAGO_MOVIL"] }
res = requests.post("http://localhost:4000/api/payment/links", json=payload, headers=headers)
token = res.json()["data"]["token"]
# Pasa este 'token' a tu frontend para usarlo con Consi.checkout({ token })`,
      php: `<?php
// Backend PHP
// Crea el link de pago y retorna el token al frontend
$ch = curl_init('http://localhost:4000/api/payment/links');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: TU_API_KEY'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'amount' => '100.00',
    'currency' => 'USD',
    'methods' => ['CARD', 'PAGO_MOVIL']
]));
$res = json_decode(curl_exec($ch), true);
$token = $res['data']['token'];
// Pasa este $token a tu frontend: Consi.checkout({ token })
?>`,
    },
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
}`,
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
}`,
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
}`,
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
}`,
    },
    payout: {
      req: snippets.payout[codeLang],
      res: `{
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
  "providerRef": "CONSI-PI-ABCD1234",
  "createdAt": "2026-06-16T18:30:00.000Z"
}`,
    },
    sdk: {
      req: snippets.sdk[codeLang],
      res: `{
  "type": "consi:paid",
  "token": "link_xyz123",
  "status": "PAID",
  "reference": "CONSI-TRX-123456"
}`,
    },
  };

  // Snippet activo de la terminal derecha según la sección, el endpoint elegido y su lenguaje Prism.
  const endpointMeta =
    ENDPOINTS.find((e) => e.id === activeEndpoint) ?? ENDPOINTS[0];
  const activeReq =
    docSection === "webhooks"
      ? codeBlocks.webhooks.req
      : docSection === "sdk"
        ? codeBlocks.sdk.req
        : docSection === "endpoints"
          ? codeBlocks[activeEndpoint].req
          : codeBlocks.payment.req;
  const activeRes =
    docSection === "webhooks"
      ? codeBlocks.webhooks.res
      : docSection === "sdk"
        ? codeBlocks.sdk.res
        : docSection === "endpoints"
          ? codeBlocks[activeEndpoint].res
          : codeBlocks.payment.res;
  const reqLang =
    docSection === "sdk" && codeLang === "curl"
      ? "markup"
      : docSection === "sdk" && codeLang === "js"
        ? "jsx"
        : toPrismLang(codeLang);

  // Encabezado de la terminal: método + ruta del endpoint activo en la sección de referencia.
  const terminalLabel =
    docSection === "endpoints"
      ? `${endpointMeta.method} /api${endpointMeta.path}`
      : docSection === "webhooks"
        ? "POST tu-servidor/webhooks"
        : docSection === "sdk"
          ? "Consi.checkout()"
          : "Petición HTTP";
  const terminalMethodTone =
    docSection === "endpoints"
      ? endpointMeta.method === "GET"
        ? "text-[var(--blue-400)]"
        : "text-[var(--success-600)]"
      : "text-[var(--text-subtle)]";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-strong)] flex items-center gap-2">
          <BookOpen className="text-[var(--blue-500)]" />
          <span>Documentación de API</span>
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Guía interactiva para integrar Consi: autenticación, firma HMAC,
          checkout, endpoints y webhooks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMN 1: SIDEBAR NAV (Col 1-3) */}
        <div className="lg:col-span-3 space-y-1 bg-white p-3 rounded-xl border border-[var(--border)] shadow-[var(--shadow-xs)] sticky top-6">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] px-3 mb-2">
            Integración Básica
          </div>
          <button
            onClick={() => setDocSection("intro")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              docSection === "intro"
                ? "bg-[var(--blue-50)] text-[var(--blue-700)] font-bold"
                : "text-[var(--text-body)] hover:bg-[var(--ink-50)]"
            }`}
          >
            <HelpCircle size={14} /> Introducción
          </button>
          <button
            onClick={() => setDocSection("auth")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              docSection === "auth"
                ? "bg-[var(--blue-50)] text-[var(--blue-700)] font-bold"
                : "text-[var(--text-body)] hover:bg-[var(--ink-50)]"
            }`}
          >
            <Shield size={14} /> Autenticación
          </button>
          <button
            onClick={() => setDocSection("hmac")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              docSection === "hmac"
                ? "bg-[var(--blue-50)] text-[var(--blue-700)] font-bold"
                : "text-[var(--text-body)] hover:bg-[var(--ink-50)]"
            }`}
          >
            <Terminal size={14} /> Firma HMAC
          </button>
          <button
            onClick={() => setDocSection("checkout")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              docSection === "checkout"
                ? "bg-[var(--blue-50)] text-[var(--blue-700)] font-bold"
                : "text-[var(--text-body)] hover:bg-[var(--ink-50)]"
            }`}
          >
            <Link2 size={14} /> Checkout (Hosted/Drop-in)
          </button>
          <button
            onClick={() => setDocSection("sdk")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              docSection === "sdk"
                ? "bg-[var(--blue-50)] text-[var(--blue-700)] font-bold"
                : "text-[var(--text-body)] hover:bg-[var(--ink-50)]"
            }`}
          >
            <Code2 size={14} /> SDK de Consi.js
          </button>

          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] px-3 mt-4 mb-2">
            Referencia de API
          </div>
          <button
            onClick={() => setDocSection("endpoints")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              docSection === "endpoints"
                ? "bg-[var(--blue-50)] text-[var(--blue-700)] font-bold"
                : "text-[var(--text-body)] hover:bg-[var(--ink-50)]"
            }`}
          >
            <Code2 size={14} /> Endpoints Públicos
          </button>

          <button
            onClick={() => setDocSection("webhooks")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              docSection === "webhooks"
                ? "bg-[var(--blue-50)] text-[var(--blue-700)] font-bold"
                : "text-[var(--text-body)] hover:bg-[var(--ink-50)]"
            }`}
          >
            <ArrowRight size={14} /> Webhooks
          </button>
          <button
            onClick={() => setDocSection("testing")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              docSection === "testing"
                ? "bg-[var(--blue-50)] text-[var(--blue-700)] font-bold"
                : "text-[var(--text-body)] hover:bg-[var(--ink-50)]"
            }`}
          >
            <Sparkles size={14} /> Pruebas y Sandbox
          </button>
        </div>

        {/* COLUMN 2: GUIDES (Col 4-8) */}
        <div className="lg:col-span-5 space-y-6 text-sm text-[var(--text-body)] leading-relaxed">
          {/* SECTION: INTRO */}
          {docSection === "intro" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--text-strong)]">
                Introducción
              </h2>
              <p>
                Bienvenido a la API de <strong>Consi</strong>. Nuestra
                plataforma permite a empresas en Venezuela integrar cobros
                automatizados de forma rápida, segura y multi-moneda (USD y VES)
                empleando métodos tradicionales y alternativos.
              </p>
              <p>
                Ofrecemos tres flujos principales de integración según las
                necesidades de tu sistema:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Hosted Checkout (Links de pago):</strong> Redirecciona
                  a tu cliente a una página alojada de Consi para pagar. Es el
                  camino más rápido, sin código en frontend.
                </li>
                <li>
                  <strong>Embedded Checkout (Modal):</strong> Usa nuestra
                  librería JavaScript{" "}
                  <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-xs">
                    consi.js
                  </code>{" "}
                  para abrir una ventana modal directamente en tu aplicación,
                  manteniendo la experiencia in-app.
                </li>
                <li>
                  <strong>Server-to-Server API (Directa):</strong> Crea cobros
                  directamente desde tu backend, permitiendo construir tus
                  propias experiencias y canalizar la confirmación mediante
                  webhooks.
                </li>
              </ul>
            </div>
          )}

          {/* SECTION: AUTH */}
          {docSection === "auth" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--text-strong)]">
                Autenticación
              </h2>
              <p>
                La comunicación con la API pública de Consi se realiza bajo
                HTTPS y se autentica mediante la cabecera HTTP{" "}
                <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-xs">
                  x-api-key
                </code>
                .
              </p>
              <p>
                Cada comercio dispone de dos juegos de llaves accesibles desde
                la sección <strong>Desarrolladores</strong>:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--ink-50)]">
                  <span className="font-bold text-[var(--text-strong)] block text-xs">
                    Ambiente de Pruebas (Test):
                  </span>
                  <span className="text-xs font-mono">
                    x-api-key: c_test_...
                  </span>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Usa esta clave para hacer simulaciones sin alterar dinero
                    real ni cuentas bancarias.
                  </p>
                </div>
                <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--ink-50)]">
                  <span className="font-bold text-[var(--text-strong)] block text-xs">
                    Ambiente de Producción (Live):
                  </span>
                  <span className="text-xs font-mono">
                    x-api-key: c_live_...
                  </span>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Usa esta clave en tu producción real para recibir cobros
                    reales.
                  </p>
                </div>
              </div>
              <div className="p-3 bg-[var(--warning-100)] border border-[var(--warning-600)] text-[var(--warning-600)] rounded-lg text-xs font-semibold">
                ⚠️ NUNCA expongas tus API Secrets (claves privadas) en código de
                frontend o repositorios públicos.
              </div>
            </div>
          )}

          {/* SECTION: HMAC SIGNATURE */}
          {docSection === "hmac" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--text-strong)]">
                Firma HMAC y Seguridad
              </h2>
              <p>
                Para garantizar la integridad y evitar que los campos sensibles
                (como el monto o la moneda) sean alterados en tránsito, Consi
                requiere una firma digital en las peticiones que creen recursos
                (
                <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-xs">
                  POST
                </code>
                ).
              </p>
              <p>
                Esta firma debe enviarse en la cabecera{" "}
                <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-xs">
                  x-signature
                </code>
                .
              </p>
              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-strong)]">
                  Cómo Calcular la Firma:
                </h3>
                <ol className="list-decimal pl-5 space-y-2 text-xs">
                  <li>
                    Concatena los valores requeridos en el orden exacto
                    separados por tuberías (
                    <code className="bg-[var(--ink-100)] px-1 rounded">|</code>
                    ): <br />
                    <code className="bg-[var(--ink-100)] p-1 rounded block mt-1 font-mono text-[11px] text-[var(--blue-700)]">
                      apiKey|order|amount|currency
                    </code>
                  </li>
                  <li>
                    Utiliza tu clave secreta de API (
                    <code className="bg-[var(--ink-100)] px-1 rounded">
                      apiSecret
                    </code>
                    ) correspondiente como clave de firma.
                  </li>
                  <li>
                    Calcula el hash <strong>HMAC-SHA256</strong> sobre la cadena
                    del paso 1 y codifícalo como cadena hexadecimal (hex).
                  </li>
                </ol>
              </div>

              {/* INTERACTIVE COMPONENT */}
              <SignatureGenerator keys={keys} />
            </div>
          )}

          {/* SECTION: CHECKOUT EMBED */}
          {docSection === "checkout" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--text-strong)]">
                Hosted Checkout & Embedded Iframe
              </h2>
              <p>
                Consi ofrece una interfaz interactiva de pagos ya construida que
                le permite al pagador elegir entre{" "}
                <strong>
                  Pago Móvil, Transferencias, Tarjetas o USDT (criptomonedas)
                </strong>
                .
              </p>

              <h3 className="font-bold text-[var(--text-strong)] mt-2">
                1. Flujo Redireccionado (Hosted)
              </h3>
              <p>
                Consiste en crear un enlace de pago desde tu backend y
                redireccionar al usuario a la propiedad{" "}
                <code className="bg-[var(--ink-100)] px-1 rounded">url</code>{" "}
                devuelta en la respuesta de la API. Cuando se confirma la
                liquidación, el usuario es redirigido a la URL especificada en{" "}
                <code className="bg-[var(--ink-100)] px-1 rounded">
                  successUrl
                </code>
                .
              </p>

              <h3 className="font-bold text-[var(--text-strong)] mt-2">
                2. Checkout Incrustado (Drop-in Modal)
              </h3>
              <p>
                Mediante nuestra librería, puedes desplegar la ventana de cobro
                Consi en un modal iframe directamente sobre tu web sin redirigir
                al cliente.
              </p>
              <div className="p-3 border border-[var(--border)] rounded-lg space-y-1">
                <span className="font-bold text-[var(--text-strong)] block text-xs">
                  Pasos de uso:
                </span>
                <ol className="list-decimal pl-4 text-xs space-y-1">
                  <li>Incrusta la etiqueta script de consi.js una sola vez.</li>
                  <li>
                    Invoca{" "}
                    <code className="font-mono bg-[var(--ink-100)] px-1 rounded text-xs">
                      Consi.checkout(...)
                    </code>{" "}
                    indicando el token del pago y el callback de éxito.
                  </li>
                </ol>
              </div>

              <h3 className="font-bold text-[var(--text-strong)] mt-4">
                3. Consi Elements (Pasarela de Tarjetas Custom UI)
              </h3>
              <p>
                Si deseas una experiencia totalmente integrada donde el usuario
                rellena los campos de tarjeta directamente en tu interfaz sin
                salir de la página de pago, utiliza{" "}
                <strong>Consi Elements</strong>. Elements utiliza un iframe
                seguro aislado para tokenizar los datos sensibles de la tarjeta
                directamente contra el vault de Consi (cumpliendo con PCI DSS
                sin manejar números de tarjeta en tus servidores).
              </p>
              <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--ink-50)] text-xs space-y-2">
                <span className="font-bold text-[var(--text-strong)] block">
                  Integración en 3 pasos:
                </span>
                <p>
                  <strong>Paso 1:</strong> Crea el contenedor DOM en tu página:
                </p>
                <CodeBlock
                  code={`<div id="card-element"></div>`}
                  language="markup"
                  maxHeight={60}
                />
                <p className="mt-2">
                  <strong>Paso 2:</strong> Inicializa y monta el iframe de
                  tarjeta con estilos personalizados:
                </p>
                <CodeBlock
                  code={`const elements = Consi.elements({
  style: {
    background: '#1e293b', // Color de fondo del iframe
    color: '#ffffff',      // Color de texto e inputs
    borderColor: '#334155', // Bordes de inputs
    borderRadius: '8px'    // Radio de borde de inputs
  }
});
const card = elements.create('card');
card.mount('#card-element');`}
                  language="javascript"
                  maxHeight={150}
                />
                <p className="mt-2">
                  <strong>Paso 3:</strong> Tokeniza los datos cuando el usuario
                  haga clic en pagar:
                </p>
                <CodeBlock
                  code={`const res = await card.tokenize();
if (res.token) {
  // Envía res.token a tu backend para crear la transacción directa
} else {
  console.error(res.error);
}`}
                  language="javascript"
                  maxHeight={100}
                />
              </div>

              <h3 className="font-bold text-[var(--text-strong)] mt-4">
                4. Pago Móvil Automático (Verificación por Teléfono)
              </h3>
              <p>
                Consi provee un motor de conciliación automática para Pago
                Móvil. En vez de solicitar al cliente ingresar un código de
                referencia bancaria tras realizar el pago, puedes simplemente
                solicitarle el <strong>número de teléfono</strong> desde el cual
                transfirió.
              </p>
              <p>
                Al enviar la confirmación con el teléfono, Consi busca
                automáticamente en los pagos entrantes reportados por la banca
                uno que coincida con el monto exacto en VES y cuyo número emisor
                coincida con los últimos 7 dígitos ingresados.
              </p>
              <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--ink-50)] text-xs space-y-1">
                <span className="font-bold text-[var(--text-strong)] block">
                  Endpoint de Confirmación Automática:
                </span>
                <span className="font-mono text-[var(--blue-700)] block font-bold mb-1">
                  POST /api/checkout/:token/confirm-auto
                </span>
                <CodeBlock
                  code={`// Petición JSON:
{
  "phone": "04125551234"
}`}
                  language="json"
                  maxHeight={70}
                />
                <p className="text-[var(--text-muted)] mt-1">
                  Esto resolverá y completará el pago de inmediato si la
                  transferencia bancaria ya fue recibida, sin intervención
                  manual de referencias.
                </p>
              </div>

              <div className="p-3 border border-[var(--success)] rounded-lg bg-[var(--success-bg,var(--ink-50))] text-xs space-y-1">
                <span className="font-bold text-[var(--text-strong)] block">
                  📱 Teléfonos de prueba (modo test)
                </span>
                <p className="text-[var(--text-muted)]">
                  En entorno de pruebas no hay un banco real enviando los avisos
                  de Pago Móvil, por lo que la conciliación normal no
                  encontraría coincidencias. Usa un{" "}
                  <strong>teléfono de prueba</strong> cuyos 7 dígitos finales
                  sean ceros y el pago se aprobará siempre de forma automática:
                </p>
                <ul className="list-disc pl-4 text-[var(--text-muted)]">
                  <li>
                    <span className="font-mono text-[var(--text-strong)]">
                      0412-000-0000
                    </span>{" "}
                    → aprueba siempre
                  </li>
                  <li>
                    <span className="font-mono text-[var(--text-strong)]">
                      0414-000-0000
                    </span>{" "}
                    → aprueba siempre
                  </li>
                  <li>
                    Cualquier número terminado en{" "}
                    <span className="font-mono text-[var(--text-strong)]">
                      0000000
                    </span>
                  </li>
                </ul>
                <p className="text-[var(--text-muted)]">
                  Para simular un aviso bancario real (en vez del modo test),
                  envía primero{" "}
                  <span className="font-mono text-[var(--text-strong)]">
                    POST /api/webhooks/pago-movil-bank
                  </span>{" "}
                  con{" "}
                  <span className="font-mono">{`{ phone, amount, reference }`}</span>{" "}
                  y luego confirma con ese mismo teléfono.
                </p>
              </div>
            </div>
          )}

          {/* SECTION: SDK INTEGRATION */}
          {docSection === "sdk" && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-[var(--text-strong)]">
                SDK de Consi.js
              </h2>
              <p>
                <strong>Consi.js</strong> es una biblioteca ligera (~2 KB), sin
                dependencias externas, que abre la pasarela de pago de Consi en
                un <strong>modal incrustado (iframe)</strong> directamente sobre
                tu sitio. Tus clientes pagan sin abandonar tu web y tú recibes
                el resultado mediante callbacks.
              </p>

              {/* Feature highlights */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    icon: <Sparkles size={14} />,
                    title: "Cero dependencias",
                    desc: "Un solo <script>, sin npm install.",
                  },
                  {
                    icon: <Smartphone size={14} />,
                    title: "Responsive",
                    desc: "Modal centrado y adaptable a móvil.",
                  },
                  {
                    icon: <CreditCard size={14} />,
                    title: "Multi-método",
                    desc: "Tarjeta, Pago Móvil, USDT y más.",
                  },
                  {
                    icon: <Shield size={14} />,
                    title: "Seguro",
                    desc: "El token vive en backend; nada sensible en el cliente.",
                  },
                ].map((f) => (
                  <div
                    key={f.title}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--ink-50)]"
                  >
                    <div className="flex items-center gap-1.5 text-[var(--blue-600)] font-bold text-xs">
                      {f.icon}
                      <span className="text-[var(--text-strong)]">
                        {f.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      {f.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quickstart */}
              <h3 className="font-bold text-[var(--text-strong)] pt-1">
                Inicio rápido en 3 pasos
              </h3>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="shrink-0 size-6 rounded-full bg-[var(--blue-600)] text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-[var(--text-strong)] text-sm">
                      Carga el SDK
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Incluye el script una sola vez, idealmente antes de cerrar{" "}
                      <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-[11px]">
                        {"</body>"}
                      </code>
                      .
                    </p>
                    <CodeBlock
                      code={
                        '<script src="http://localhost:3000/consi.js"></script>'
                      }
                      language="markup"
                      maxHeight={120}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="shrink-0 size-6 rounded-full bg-[var(--blue-600)] text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-[var(--text-strong)] text-sm">
                      Genera un token en tu backend
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Crea un link de pago con{" "}
                      <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-[11px]">
                        POST /api/payment/links
                      </code>
                      . La respuesta incluye{" "}
                      <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-[11px]">
                        data.token
                      </code>
                      . Nunca expongas tu API Secret en el frontend.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="shrink-0 size-6 rounded-full bg-[var(--blue-600)] text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-[var(--text-strong)] text-sm">
                      Abre el checkout
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Invoca{" "}
                      <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-[11px]">
                        Consi.checkout()
                      </code>{" "}
                      con el token y tus callbacks.
                    </p>
                    <CodeBlock
                      language="javascript"
                      maxHeight={160}
                      code={`Consi.checkout({
  token: 'link_xyz123',
  onSuccess: (data) => console.log('Pagado:', data.reference),
  onClose: () => console.log('Modal cerrado'),
});`}
                    />
                  </div>
                </div>
              </div>

              {/* API reference: options */}
              <h3 className="font-bold text-[var(--text-strong)] pt-1">
                Referencia:{" "}
                <code className="font-mono text-[var(--blue-700)]">
                  Consi.checkout(options)
                </code>
              </h3>
              <Table className="border border-[var(--border)] text-xs rounded-lg overflow-hidden">
                <TableHeader className="bg-[var(--ink-50)]">
                  <TableRow>
                    <TableHead>Opción</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Requerido</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono font-semibold">
                      token
                    </TableCell>
                    <TableCell className="font-mono">string</TableCell>
                    <TableCell>
                      <span className="text-[var(--danger-600)] font-bold">
                        Sí
                      </span>
                    </TableCell>
                    <TableCell className="text-[var(--text-muted)]">
                      Token del link de pago generado en tu backend. Lanza un
                      error si falta.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-semibold">
                      onSuccess
                    </TableCell>
                    <TableCell className="font-mono">
                      {"(data) => void"}
                    </TableCell>
                    <TableCell className="text-[var(--text-subtle)]">
                      No
                    </TableCell>
                    <TableCell className="text-[var(--text-muted)]">
                      Se ejecuta al confirmarse el pago. Recibe el payload del
                      evento{" "}
                      <code className="bg-[var(--ink-100)] px-1 rounded font-mono">
                        consi:paid
                      </code>
                      . El modal se cierra solo ~1.2s después.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-semibold">
                      onClose
                    </TableCell>
                    <TableCell className="font-mono">{"() => void"}</TableCell>
                    <TableCell className="text-[var(--text-subtle)]">
                      No
                    </TableCell>
                    <TableCell className="text-[var(--text-muted)]">
                      Se ejecuta si el cliente cierra el modal (clic fuera o
                      botón cerrar) sin completar el pago.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-xs text-[var(--text-muted)]">
                <strong>Valor de retorno:</strong>{" "}
                <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-[11px]">
                  {"{ close() }"}
                </code>{" "}
                — un objeto con el método{" "}
                <code className="font-mono">close()</code> para cerrar el modal
                programáticamente desde tu código.
              </p>

              {/* Events table */}
              <h3 className="font-bold text-[var(--text-strong)] pt-1">
                Eventos (
                <code className="font-mono text-[var(--blue-700)]">
                  postMessage
                </code>
                )
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                El iframe se comunica con tu página vía{" "}
                <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-[11px]">
                  window.postMessage
                </code>
                . El SDK ya los traduce a callbacks, pero estos son los tipos
                que viajan:
              </p>
              <Table className="border border-[var(--border)] text-xs rounded-lg overflow-hidden">
                <TableHeader className="bg-[var(--ink-50)]">
                  <TableRow>
                    <TableHead>type</TableHead>
                    <TableHead>Dispara</TableHead>
                    <TableHead>Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono font-semibold text-[var(--success-600)]">
                      consi:paid
                    </TableCell>
                    <TableCell className="font-mono">onSuccess</TableCell>
                    <TableCell className="font-mono text-[10px] text-[var(--text-muted)]">
                      {"{ type, token, status, reference }"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-semibold text-[var(--text-muted)]">
                      consi:close
                    </TableCell>
                    <TableCell className="font-mono">onClose</TableCell>
                    <TableCell className="font-mono text-[10px] text-[var(--text-muted)]">
                      {"{ type }"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Interactive playground */}
              <h3 className="font-bold text-[var(--text-strong)] pt-1">
                Playground interactivo
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Prueba el SDK sin escribir una línea. En modo{" "}
                <strong>Mocked</strong> todo corre en memoria (ideal para
                entender el flujo de callbacks); en modo <strong>Live</strong>{" "}
                se crea un link real y se abre la pasarela modal verdadera.
              </p>
              <SdkInteractiveSimulator />

              {/* Framework examples */}
              <h3 className="font-bold text-[var(--text-strong)] pt-1">
                Ejemplos por framework
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Copia y pega según tu stack. El{" "}
                <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-[11px]">
                  token
                </code>{" "}
                siempre proviene de tu backend.
              </p>
              <SdkFrameworkExamples />

              {/* Best practices */}
              <div className="p-3 bg-[var(--blue-50)] border border-[var(--blue-200)] rounded-lg text-xs space-y-1.5">
                <p className="font-bold text-[var(--blue-700)] flex items-center gap-1.5">
                  <Sparkles size={14} /> Buenas prácticas
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[var(--text-body)]">
                  <li>
                    Genera el token <strong>justo antes</strong> de abrir el
                    checkout; los links tienen vigencia limitada.
                  </li>
                  <li>
                    Confirma el pago en tu backend vía <strong>webhook</strong>{" "}
                    (
                    <code className="bg-white px-1 rounded font-mono">
                      transaction.completed
                    </code>
                    ), no solo con{" "}
                    <code className="bg-white px-1 rounded font-mono">
                      onSuccess
                    </code>
                    : el callback es UX, el webhook es la fuente de verdad.
                  </li>
                  <li>
                    Carga{" "}
                    <code className="bg-white px-1 rounded font-mono">
                      consi.js
                    </code>{" "}
                    una sola vez por documento.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION: ENDPOINTS REFERENCE */}
          {docSection === "endpoints" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--text-strong)]">
                Referencia de la API Pública
              </h2>
              <p>
                Todos los endpoints públicos comparten una misma base.
                Selecciona uno para ver sus parámetros y el código de ejemplo
                —en tu lenguaje— en el panel de la derecha.
              </p>

              {/* Base URL pill */}
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--ink-50)] px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                  Base URL
                </span>
                <code className="font-mono text-xs font-semibold text-[var(--blue-700)] flex-1">
                  http://localhost:4000/api
                </code>
                <CopyButton
                  value="http://localhost:4000/api"
                  label="Base URL"
                />
              </div>

              {/* Selectable endpoint list — clicking drives the code panel + expands details */}
              <div className="space-y-2.5">
                {ENDPOINTS.map((ep) => {
                  const isActive = activeEndpoint === ep.id;
                  return (
                    <div
                      key={ep.id}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        isActive
                          ? "border-[var(--blue-500)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--blue-200)]"
                          : "border-[var(--border)] hover:border-[var(--blue-400)]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveEndpoint(ep.id)}
                        aria-expanded={isActive}
                        className={`w-full text-left p-3 cursor-pointer transition-colors ${
                          isActive
                            ? "bg-[var(--blue-50)]"
                            : "bg-white hover:bg-[var(--ink-50)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded-md uppercase font-mono ${METHOD_BADGE[ep.method]}`}
                          >
                            {ep.method}
                          </span>
                          <code className="font-mono text-xs font-bold text-[var(--text-strong)]">
                            {ep.path}
                          </code>
                          {ep.hmac ? (
                            <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[var(--warning-700)] bg-[var(--warning-100)] px-1.5 py-0.5 rounded">
                              <Shield size={9} /> HMAC
                            </span>
                          ) : (
                            <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[var(--text-subtle)] bg-[var(--ink-100)] px-1.5 py-0.5 rounded">
                              <Key size={9} /> API Key
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1.5">
                          {ep.summary}
                        </p>
                      </button>

                      {/* Expanded detail: parameter table + returns */}
                      {isActive && (
                        <div className="border-t border-[var(--blue-200)] bg-white p-3 space-y-3">
                          {ep.id === "payout" && (
                            <div className="space-y-3 border-b border-[var(--border)] pb-3.5 mb-1 text-xs text-[var(--text-body)]">
                              <p>
                                Consi permite a los comercios automatizar el retiro de fondos
                                desde su saldo utilizando nuestro endpoint público de retiros.
                                Indica el destino del cliente final como objeto{" "}
                                (<code>destination</code>) o, para liquidar tu propio saldo, una
                                cuenta registrada (<code>bankAccountId</code>). Consi elige la
                                pasarela y el modo de retiro internamente.
                              </p>
                              <div className="p-3 bg-[var(--blue-50)] border border-[var(--blue-200)] text-[var(--blue-700)] rounded-lg font-semibold">
                                ℹ️ Recuerda que este endpoint requiere firma HMAC-SHA256 en la
                                cabecera <strong>x-signature</strong> calculada con la fórmula{" "}
                                <code className="bg-white/80 px-1 rounded font-mono text-[10px]">
                                  apiKey|order|amount|currency
                                </code>
                                . Si el retiro no incluye order, utiliza un valor vacío en su
                                lugar:{" "}
                                <code className="bg-white/80 px-1 rounded font-mono text-[10px]">
                                  apiKey||amount|currency
                                </code>
                                .
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                              {ep.params.some((p) => p.in === "path")
                                ? "Parámetros de ruta"
                                : "Parámetros del cuerpo"}
                            </span>
                            <Table className="border border-[var(--border)] text-xs rounded-lg overflow-hidden mt-1.5">
                              <TableHeader className="bg-[var(--ink-50)]">
                                <TableRow>
                                  <TableHead className="font-bold">
                                    Campo
                                  </TableHead>
                                  <TableHead className="font-bold">
                                    Tipo
                                  </TableHead>
                                  <TableHead className="font-bold">
                                    Req.
                                  </TableHead>
                                  <TableHead className="font-bold">
                                    Descripción
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {ep.params.map((p) => (
                                  <TableRow key={p.name}>
                                    <TableCell className="font-mono font-semibold text-[var(--text-strong)] whitespace-nowrap">
                                      {p.name}
                                    </TableCell>
                                    <TableCell className="font-mono text-[10px] text-[var(--blue-700)] whitespace-nowrap">
                                      {p.type}
                                    </TableCell>
                                    <TableCell>
                                      {p.required ? (
                                        <span className="text-[var(--danger-600)] font-bold">
                                          Sí
                                        </span>
                                      ) : (
                                        <span className="text-[var(--text-subtle)]">
                                          No
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-[var(--text-muted)]">
                                      {p.desc}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex items-start gap-1.5 text-xs text-[var(--text-muted)]">
                            <ArrowRight
                              size={13}
                              className="text-[var(--success-600)] mt-0.5 shrink-0"
                            />
                            <span>
                              <strong className="text-[var(--text-strong)]">
                                Retorna:
                              </strong>{" "}
                              {ep.returns}
                            </span>
                          </div>
                          {ep.hmac && (
                            <div className="flex items-start gap-1.5 text-[11px] text-[var(--warning-700)] bg-[var(--warning-100)] rounded-lg p-2">
                              <Shield size={13} className="mt-0.5 shrink-0" />
                              <span>
                                Firma requerida en{" "}
                                <code className="bg-white/60 px-1 rounded font-mono">
                                  x-signature
                                </code>{" "}
                                sobre{" "}
                                <code className="bg-white/60 px-1 rounded font-mono">
                                  apiKey|order|amount|currency
                                </code>
                                . Consulta la sección{" "}
                                <button
                                  type="button"
                                  onClick={() => setDocSection("hmac")}
                                  className="font-bold underline hover:text-[var(--warning-600)]"
                                >
                                  Firma HMAC
                                </button>
                                .
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}



          {/* SECTION: WEBHOOKS */}
          {docSection === "webhooks" && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-[var(--text-strong)]">
                Webhooks y Notificaciones
              </h2>
              <p>
                Los webhooks permiten recibir actualizaciones del estado de un
                pago de forma asíncrona. Cada vez que una transacción cambia de
                estado, Consi envía una petición{" "}
                <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-xs">
                  POST
                </code>{" "}
                firmada a la URL que configuraste en{" "}
                <strong>Desarrolladores</strong>.
              </p>

              {/* Flow steps */}
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    n: "1",
                    t: "Configura tu URL",
                    d: "Registra tu endpoint HTTPS público en la sección Desarrolladores.",
                  },
                  {
                    n: "2",
                    t: "Consi notifica",
                    d: "Ante cada cambio de estado enviamos un POST con el evento y su firma.",
                  },
                  {
                    n: "3",
                    t: "Verifica y responde",
                    d: "Validas la firma, procesas el evento y respondes 2xx en menos de 10s.",
                  },
                ].map((s) => (
                  <div
                    key={s.n}
                    className="flex gap-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--ink-50)]"
                  >
                    <span className="shrink-0 size-6 rounded-full bg-[var(--blue-600)] text-white text-xs font-bold flex items-center justify-center">
                      {s.n}
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--text-strong)] text-sm">
                        {s.t}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Event catalog */}
              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-strong)]">
                  Catálogo de eventos
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  El nombre del evento sigue el patrón{" "}
                  <code className="bg-[var(--ink-100)] px-1 rounded font-mono">
                    transaction.&lt;estado&gt;
                  </code>{" "}
                  y viaja también en la cabecera{" "}
                  <code className="bg-[var(--ink-100)] px-1 rounded font-mono">
                    x-consi-event
                  </code>
                  .
                </p>
                <Table className="border border-[var(--border)] text-xs rounded-lg overflow-hidden">
                  <TableHeader className="bg-[var(--ink-50)]">
                    <TableRow>
                      <TableHead className="font-bold">Evento</TableHead>
                      <TableHead className="font-bold">
                        Cuándo se dispara
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {WEBHOOK_EVENTS.map((ev) => (
                      <TableRow key={ev.event}>
                        <TableCell className="whitespace-nowrap align-top">
                          <span
                            className={
                              ev.tone === "success"
                                ? "font-mono font-semibold text-[var(--success-600)]"
                                : ev.tone === "danger"
                                  ? "font-mono font-semibold text-[var(--danger-600)]"
                                  : "font-mono font-semibold text-[var(--warning-700)]"
                            }
                          >
                            {ev.event}
                          </span>
                        </TableCell>
                        <TableCell className="text-[var(--text-muted)]">
                          {ev.when}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Headers */}
              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-strong)]">
                  Cabeceras enviadas
                </h3>
                <Table className="border border-[var(--border)] text-xs rounded-lg overflow-hidden">
                  <TableHeader className="bg-[var(--ink-50)]">
                    <TableRow>
                      <TableHead className="font-bold">Cabecera</TableHead>
                      <TableHead className="font-bold">Descripción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono font-semibold whitespace-nowrap">
                        x-consi-event
                      </TableCell>
                      <TableCell className="text-[var(--text-muted)]">
                        El nombre del evento, ej.{" "}
                        <code className="bg-[var(--ink-100)] px-1 rounded font-mono">
                          transaction.completed
                        </code>
                        .
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono font-semibold whitespace-nowrap">
                        x-webhook-signature
                      </TableCell>
                      <TableCell className="text-[var(--text-muted)]">
                        Firma HMAC-SHA256 (hex) calculada sobre el cuerpo JSON
                        usando tu API Secret como clave.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono font-semibold whitespace-nowrap">
                        content-type
                      </TableCell>
                      <TableCell className="text-[var(--text-muted)]">
                        <code className="bg-[var(--ink-100)] px-1 rounded font-mono">
                          application/json
                        </code>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Retry policy */}
              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-strong)]">
                  Reintentos y entregas
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Si tu servidor no responde con un código{" "}
                  <code className="bg-[var(--ink-100)] px-1 rounded font-mono">
                    2xx
                  </code>
                  , Consi reintenta la entrega con backoff hasta agotar el
                  número máximo de intentos. Puedes auditar cada intento
                  —estado, número de intento y último error— en la tabla{" "}
                  <strong>Historial de Entregas de Webhook</strong> de la
                  sección Desarrolladores.
                </p>
              </div>

              <p className="text-xs">
                Para mitigar ataques de replay e inyección, tu servidor{" "}
                <strong>
                  debe verificar siempre la firma{" "}
                  <code className="bg-[var(--ink-100)] px-1 rounded font-mono">
                    x-webhook-signature
                  </code>
                </strong>{" "}
                con el código del panel derecho antes de procesar el evento.
              </p>

              {/* Best practices */}
              <div className="p-3 bg-[var(--blue-50)] border border-[var(--blue-200)] rounded-lg text-xs space-y-1.5">
                <p className="font-bold text-[var(--blue-700)] flex items-center gap-1.5">
                  <Sparkles size={14} /> Buenas prácticas
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[var(--text-body)]">
                  <li>
                    Responde{" "}
                    <code className="bg-white px-1 rounded font-mono">
                      200 OK
                    </code>{" "}
                    de inmediato y procesa el evento en segundo plano: evitas
                    timeouts y reintentos innecesarios.
                  </li>
                  <li>
                    Trata los webhooks como <strong>idempotentes</strong>: la
                    misma transacción puede notificarse más de una vez.
                    Deduplica por{" "}
                    <code className="bg-white px-1 rounded font-mono">
                      reference
                    </code>
                    .
                  </li>
                  <li>
                    El webhook es la <strong>fuente de verdad</strong> del pago,
                    no el callback{" "}
                    <code className="bg-white px-1 rounded font-mono">
                      onSuccess
                    </code>{" "}
                    del frontend.
                  </li>
                  <li>
                    Usa{" "}
                    <code className="bg-white px-1 rounded font-mono">
                      timingSafeEqual
                    </code>{" "}
                    /{" "}
                    <code className="bg-white px-1 rounded font-mono">
                      hash_equals
                    </code>{" "}
                    al comparar firmas para evitar timing attacks.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION: TESTING / SANDBOX */}
          {docSection === "testing" && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-[var(--text-strong)]">
                Pruebas y Sandbox
              </h2>
              <p>
                Consi ofrece un entorno de pruebas completamente aislado. Con tu
                clave de prueba (
                <code className="bg-[var(--ink-100)] px-1 rounded font-mono text-xs">
                  c_test_...
                </code>
                ) puedes simular el ciclo de vida completo de un pago —incluidos
                webhooks firmados— sin mover dinero real.
              </p>

              {/* Test vs Live callout */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--ink-50)]">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--blue-700)] bg-[var(--blue-100)] px-1.5 py-0.5 rounded">
                    Test
                  </span>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                    <code className="font-mono">c_test_...</code> — datos
                    simulados, sin cargos reales. Ideal para integrar.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--ink-50)]">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--success-600)] bg-[var(--success-100)] px-1.5 py-0.5 rounded">
                    Live
                  </span>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                    <code className="font-mono">c_live_...</code> — cobros
                    reales. Cámbiala solo al pasar a producción.
                  </p>
                </div>
              </div>

              <h3 className="font-bold text-[var(--text-strong)] text-xs uppercase tracking-wider text-[var(--text-subtle)]">
                1. Tarjetas de prueba (CARD)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Usa estos números en el checkout de prueba para forzar cada
                resultado. Cualquier fecha futura y CVC de 3 dígitos son válidos
                salvo que se indique lo contrario.
              </p>
              <Table className="border border-[var(--border)] text-xs rounded-lg overflow-hidden">
                <TableHeader className="bg-[var(--ink-50)]">
                  <TableRow>
                    <TableHead className="font-bold">Número</TableHead>
                    <TableHead className="font-bold">Fecha</TableHead>
                    <TableHead className="font-bold">CVC</TableHead>
                    <TableHead className="font-bold">
                      Resultado esperado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono whitespace-nowrap">
                      4242 4242 4242 4242
                    </TableCell>
                    <TableCell className="font-mono">12/29</TableCell>
                    <TableCell className="font-mono">123</TableCell>
                    <TableCell className="text-[var(--success-600)] font-bold">
                      Aprobado inmediato
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono whitespace-nowrap">
                      4000 0000 0000 0002
                    </TableCell>
                    <TableCell className="font-mono">12/29</TableCell>
                    <TableCell className="font-mono">123</TableCell>
                    <TableCell className="text-[var(--danger-600)] font-bold">
                      Rechazada (declined)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono whitespace-nowrap">
                      4000 0000 0000 9995
                    </TableCell>
                    <TableCell className="font-mono">12/29</TableCell>
                    <TableCell className="font-mono">123</TableCell>
                    <TableCell className="text-[var(--danger-600)] font-bold">
                      Fondos insuficientes
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <h3 className="font-bold text-[var(--text-strong)] text-xs uppercase tracking-wider text-[var(--text-subtle)] mt-2">
                2. Pago Móvil de prueba (PAGO_MOVIL)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Las transferencias son simuladas. El sistema te mostrará los
                datos del comercio destino; introduce cualquier referencia
                bancaria de 6 a 10 dígitos (ej.{" "}
                <code className="bg-[var(--ink-100)] px-1 rounded font-mono">
                  239485
                </code>
                ) para disparar la confirmación asíncrona y el webhook{" "}
                <code className="bg-[var(--ink-100)] px-1 rounded font-mono">
                  transaction.completed
                </code>
                .
              </p>

              <h3 className="font-bold text-[var(--text-strong)] text-xs uppercase tracking-wider text-[var(--text-subtle)] mt-2">
                3. USDT (cripto)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                En sandbox, la dirección de depósito es ficticia y la
                confirmación on-chain se simula automáticamente a los pocos
                segundos de "enviar" el pago, sin necesidad de una transacción
                real.
              </p>

              <div className="p-3 bg-[var(--blue-50)] border border-[var(--blue-200)] rounded-lg text-xs space-y-1.5">
                <p className="font-bold text-[var(--blue-700)] flex items-center gap-1.5">
                  <Sparkles size={14} /> Tip
                </p>
                <p className="text-[var(--text-body)]">
                  Prueba el flujo de extremo a extremo: crea un link con{" "}
                  <code className="bg-white px-1 rounded font-mono">
                    POST /payment/links
                  </code>
                  , ábrelo con el{" "}
                  <button
                    type="button"
                    onClick={() => setDocSection("sdk")}
                    className="font-bold underline text-[var(--blue-700)] hover:text-[var(--blue-600)]"
                  >
                    SDK de Consi.js
                  </button>
                  , paga con la tarjeta{" "}
                  <code className="bg-white px-1 rounded font-mono">4242…</code>{" "}
                  y confirma que recibes el{" "}
                  <button
                    type="button"
                    onClick={() => setDocSection("webhooks")}
                    className="font-bold underline text-[var(--blue-700)] hover:text-[var(--blue-600)]"
                  >
                    webhook
                  </button>{" "}
                  firmado en tu servidor.
                </p>
              </div>
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
                <span
                  className={`ml-2 text-xs font-bold tracking-tight ${terminalMethodTone}`}
                >
                  {terminalLabel}
                </span>
              </div>

              {/* Language tabs */}
              <div className="flex bg-[var(--ink-900)] p-0.5 rounded-md border border-[var(--border)]/10 text-[9px] font-bold">
                {(["curl", "js", "python", "php"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLang(lang)}
                    className={`px-1.5 py-0.5 rounded ${
                      codeLang === lang
                        ? "bg-[var(--blue-600)] text-white"
                        : "text-[var(--text-subtle)] hover:text-white"
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Snippet Code Area */}
            <CodeBlock
              code={activeReq}
              language={reqLang}
              maxHeight={360}
              className="rounded-none border-0"
            />

            {/* Endpoint response header */}
            <div className="bg-[var(--ink-950)] px-4 py-2 border-t border-[var(--ink-900)] flex items-center justify-between text-xs font-semibold text-[var(--text-subtle)]">
              <span>Respuesta HTTP 200 OK</span>
            </div>

            {/* JSON Response Area */}
            <CodeBlock
              code={activeRes}
              language="json"
              maxHeight={220}
              showCopy={false}
              className="rounded-none border-0 border-t border-[var(--ink-900)]"
            />
          </div>

          {/* Endpoints: quick switcher mirroring the left list (keeps the panel in sync) */}
          {docSection === "endpoints" && (
            <div className="rounded-xl border border-[var(--border)] p-3 bg-white space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] block">
                Cambiar de endpoint
              </span>
              <div className="space-y-1">
                {ENDPOINTS.map((ep) => (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => setActiveEndpoint(ep.id)}
                    className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      activeEndpoint === ep.id
                        ? "bg-[var(--blue-50)]"
                        : "hover:bg-[var(--ink-50)]"
                    }`}
                  >
                    <span
                      className={`inline-block px-1 py-0.5 text-[9px] font-bold rounded uppercase font-mono ${METHOD_BADGE[ep.method]}`}
                    >
                      {ep.method}
                    </span>
                    <code
                      className={`font-mono text-[11px] ${activeEndpoint === ep.id ? "font-bold text-[var(--blue-700)]" : "text-[var(--text-body)]"}`}
                    >
                      {ep.path}
                    </code>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Intro: a quick "retrieve status" teaser */}
          {docSection === "intro" && (
            <div className="rounded-xl border border-[var(--border)] p-4 bg-white space-y-2">
              <span className="text-xs font-bold text-[var(--text-strong)] block">
                Consulta de Transacción
              </span>
              <p className="text-[11px] text-[var(--text-muted)]">
                Consulta el estado en tiempo real mediante la referencia única o
                el orderId de tu tienda:
              </p>
              <CodeBlock
                code={codeBlocks.retrieve.req}
                language={toPrismLang(codeLang)}
                maxHeight={180}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
