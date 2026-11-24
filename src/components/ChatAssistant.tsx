import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useTranslation } from "../lib/i18n";

type ChatMessage = { role: "user" | "assistant"; content: string };

function chatLabels(language: string) {
  return language === "es" ? {
    trigger: "¿Preguntas sobre su proyecto?",
    title: "Asistente de MTD",
    subtitle: "Ayuda con su proyecto de rótulos y gráficos",
    welcome: "¡Hola! Puedo responder una o dos preguntas y enviar los detalles de su proyecto a Barry. ¿Qué necesita?",
    placeholder: "Escriba su pregunta…",
    send: "Enviar mensaje",
    inquiry: "Enviar detalles a Barry",
    close: "Cerrar chat",
    note: "Barry revisa personalmente los presupuestos y detalles del proyecto.",
    error: "No puedo responder ahora. Puede enviarnos su consulta.",
    name: "Su nombre",
    email: "Correo electrónico",
    phone: "Teléfono (opcional)",
    details: "Detalles del proyecto",
    submit: "Enviar solicitud",
    sending: "Enviando…",
    back: "Volver al chat",
    success: "¡Recibido! MTD revisará su consulta y se comunicará con usted.",
    privacy: "Enviaremos su información y las notas del proyecto al equipo de MTD.",
  } : {
    trigger: "Questions about your project?",
    title: "MTD Project Assistant",
    subtitle: "Let's talk signs, wraps and graphics",
    welcome: "Hi! I can answer a quick question or two, then get your project details to Barry. What are you looking to have made?",
    placeholder: "Ask a question…",
    send: "Send message",
    inquiry: "Send details to Barry",
    close: "Close chat",
    note: "Barry personally reviews quotes and project details.",
    error: "I can't respond right now. You can still send your project inquiry.",
    name: "Your name",
    email: "Email address",
    phone: "Phone (optional)",
    details: "Project details",
    submit: "Send project inquiry",
    sending: "Sending…",
    back: "Back to chat",
    success: "Received! MTD will review your inquiry and get back to you.",
    privacy: "We'll send your contact information and project notes to the MTD team.",
  };
}

export default function ChatAssistant() {
  const { language } = useTranslation();
  const t = chatLabels(language);
  const [open, setOpen] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [inquiryStatus, setInquiryStatus] = useState<"idle" | "sending" | "received">("idle");
  const [inquiryDetails, setInquiryDetails] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !showInquiry) inputRef.current?.focus();
  }, [open, showInquiry]);

  useEffect(() => {
    if (open && !showInquiry) conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, open, showInquiry]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;
    const updated: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(updated);
    setDraft("");
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated.slice(-12) }),
      });
      const data: { reply?: string; error?: string } = await response.json();
      if (!response.ok || !data.reply) throw new Error(data.error || t.error);
      setMessages((current) => [...current, { role: "assistant", content: data.reply! }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setPending(false);
    }
  }

  function openInquiry() {
    setInquiryStatus("idle");
    setError("");
    const customerMessages = messages.filter((message) => message.role === "user").map((message) => `• ${message.content}`).join("\n");
    setInquiryDetails(customerMessages.slice(0, 4800));
    setShowInquiry(true);
  }

  async function submitInquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inquiryStatus === "sending") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setInquiryStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          projectDetails: data.get("projectDetails"),
          website: data.get("website"),
          language,
        }),
      });
      const result: { received?: boolean; error?: string } = await response.json();
      if (!response.ok || !result.received) throw new Error(result.error || t.error);
      setInquiryStatus("received");
    } catch (cause) {
      setInquiryStatus("idle");
      setError(cause instanceof Error ? cause.message : t.error);
    }
  }

  return (
    <aside className="fixed bottom-[5.25rem] right-3 z-[60] sm:bottom-6 sm:right-6" aria-label={t.title}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-12 items-center gap-2 border border-orange bg-orange px-4 py-3 font-body text-xs font-bold uppercase tracking-wide text-ink shadow-[0_12px_35px_rgba(0,0,0,0.45)] transition-colors hover:bg-bone sm:text-sm"
          aria-label={t.trigger}
        >
          <MessageCircle size={19} aria-hidden="true" />
          <span>{t.trigger}</span>
        </button>
      ) : (
        <section className="flex h-[min(590px,calc(100dvh-7rem))] w-[min(370px,calc(100vw-1.5rem))] flex-col overflow-hidden border border-line bg-ink text-bone shadow-[0_18px_60px_rgba(0,0,0,0.7)]" aria-label={t.title}>
          <header className="flex items-start justify-between gap-3 border-b border-line bg-charcoal2 px-4 py-4">
            <div>
              <div className="font-display text-base font-bold uppercase tracking-wide text-bone">{t.title}</div>
              <p className="mt-1 text-xs text-bone/60">{t.subtitle}</p>
            </div>
            <button type="button" aria-label={t.close} onClick={() => setOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center text-bone/75 hover:text-orange"><X size={19} /></button>
          </header>

          {showInquiry ? (
            <div className="flex-1 overflow-y-auto p-4">
              {inquiryStatus === "received" ? (
                <div role="status" className="border border-blue/50 bg-charcoal2 p-5 text-sm leading-relaxed">{t.success}</div>
              ) : (
                <form onSubmit={submitInquiry} className="flex flex-col gap-3">
                  <button type="button" onClick={() => { setShowInquiry(false); setError(""); }} className="self-start text-xs font-semibold text-blue hover:text-bone">← {t.back}</button>
                  <input name="name" autoComplete="name" required aria-label={t.name} placeholder={t.name} maxLength={120} className="border border-line bg-charcoal2 px-3 py-3 text-sm text-bone outline-none" />
                  <input name="email" type="email" autoComplete="email" required aria-label={t.email} placeholder={t.email} maxLength={254} className="border border-line bg-charcoal2 px-3 py-3 text-sm text-bone outline-none" />
                  <input name="phone" type="tel" autoComplete="tel" aria-label={t.phone} placeholder={t.phone} maxLength={50} className="border border-line bg-charcoal2 px-3 py-3 text-sm text-bone outline-none" />
                  <textarea name="projectDetails" aria-label={t.details} placeholder={t.details} value={inquiryDetails} onChange={(event) => setInquiryDetails(event.target.value)} maxLength={5000} rows={6} className="min-h-28 resize-y border border-line bg-charcoal2 px-3 py-3 text-sm leading-relaxed text-bone outline-none" />
                  <label className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
                  <p className="text-xs leading-relaxed text-bone/65">{t.privacy}</p>
                  {error && <p role="alert" className="text-xs text-orange">{error}</p>}
                  <button type="submit" disabled={inquiryStatus === "sending"} className="flex items-center justify-center gap-2 bg-orange px-3 py-3 text-sm font-bold text-ink disabled:opacity-60">
                    {inquiryStatus === "sending" ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    {inquiryStatus === "sending" ? t.sending : t.submit}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-relevant="additions text">
                <p className="max-w-[94%] border-l-2 border-blue bg-charcoal2 p-3 text-sm leading-relaxed text-bone/90">{t.welcome}</p>
                {messages.map((message, index) => (
                  <p key={index} className={`max-w-[94%] whitespace-pre-wrap break-words p-3 text-sm leading-relaxed ${message.role === "user" ? "ml-auto bg-blue text-white" : "border-l-2 border-blue bg-charcoal2 text-bone/90"}`}>
                    {message.content}
                  </p>
                ))}
                {pending && <p role="status" className="text-xs text-bone/60"><Loader2 size={14} className="inline animate-spin" /> {t.sending}</p>}
                {error && <p role="alert" className="text-xs leading-relaxed text-orange">{error}</p>}
                <div ref={conversationEndRef} />
              </div>
              <div className="border-t border-line bg-charcoal2 p-3">
                <p className="mb-3 text-[11px] leading-relaxed text-bone/60">{t.note}</p>
                <form onSubmit={sendMessage} className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    aria-label={t.placeholder}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
                    onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
                    maxLength={1000}
                    placeholder={t.placeholder}
                    className="min-h-10 max-h-24 flex-1 resize-y border border-line bg-ink p-2.5 text-sm text-bone outline-none placeholder:text-bone/45"
                  />
                  <button type="submit" disabled={!draft.trim() || pending} aria-label={t.send} className="flex h-10 w-10 shrink-0 items-center justify-center bg-orange text-ink hover:bg-bone disabled:opacity-50"><Send size={17} /></button>
                </form>
                <button type="button" onClick={openInquiry} className="mt-3 flex w-full items-center justify-center gap-2 border border-blue px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-bone hover:bg-blue">
                  {t.inquiry} <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </aside>
  );
}
