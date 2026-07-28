import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import { useTranslation } from "../lib/i18n";

export default function Contact() {
  const { language, t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "sending" | "received" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    setErrorMessage("");

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
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.received) throw new Error(result.error ?? t("messageError"));
      setStatus("received");
      form.reset();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("messageError"));
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="bg-ink px-5 sm:px-8 py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="font-display font-semibold uppercase leading-[0.95] display-tight text-4xl sm:text-5xl">
            <span className="block text-bone">{t("readyWhen")}</span>
            <span className="block text-orange">{t("youAre")}</span>
          </h2>
          <span className="block mt-4 h-px w-20 bg-orange" />

          <ul className="mt-10 space-y-4 text-bone/85 text-base">
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-orange shrink-0" />
              <a href="tel:5013291111" className="hover:text-orange transition-colors">
                501.329.1111
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-orange shrink-0" />
              <a
                href="mailto:mtdsigns@gmail.com"
                className="hover:text-orange transition-colors"
              >
                mtdsigns@gmail.com
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={18} className="text-orange shrink-0 mt-0.5" />
              <span>
                166 Hwy 310
                <br />
                Enola, AR 72047
              </span>
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        >
          {status === "received" ? (
            <div className="border border-orange/40 bg-charcoal2 px-6 py-8">
              <p className="font-display uppercase text-xl text-bone">
                {t("messageSent")}
              </p>
              <p className="mt-2 text-bone/70 text-sm">
                {t("inTouch")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4" aria-busy={status === "sending"}>
              <input
                name="name"
                autoComplete="name"
                required
                type="text"
                placeholder={t("name")}
                className="bg-transparent border border-line focus:border-orange px-4 py-3 text-sm text-bone placeholder:text-bone/40 outline-none transition-colors"
              />
              <input
                name="email"
                autoComplete="email"
                required
                type="email"
                placeholder={t("email")}
                className="bg-transparent border border-line focus:border-orange px-4 py-3 text-sm text-bone placeholder:text-bone/40 outline-none transition-colors"
              />
              <input
                name="phone"
                autoComplete="tel"
                type="tel"
                placeholder={t("phone")}
                className="bg-transparent border border-line focus:border-orange px-4 py-3 text-sm text-bone placeholder:text-bone/40 outline-none transition-colors"
              />
              <textarea
                name="projectDetails"
                placeholder={t("projectDetails")}
                rows={4}
                className="bg-transparent border border-line focus:border-orange px-4 py-3 text-sm text-bone placeholder:text-bone/40 outline-none transition-colors sm:row-span-2"
              />
              <label className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              {status === "error" && (
                <p role="alert" className="sm:col-span-2 border border-orange/50 bg-charcoal2 px-4 py-3 text-sm text-bone">
                  {errorMessage || t("messageError")}
                </p>
              )}
              <button
                type="submit"
                disabled={status === "sending"}
                className="sm:col-span-2 inline-flex items-center justify-center gap-2 bg-orange hover:bg-orange-dim text-ink font-body font-bold text-sm tracking-wide px-6 py-3.5 transition-colors w-fit disabled:cursor-wait disabled:opacity-60"
              >
                {status === "sending" ? t("sendingMessage") : t("sendMessage")} <ArrowRight size={16} />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
