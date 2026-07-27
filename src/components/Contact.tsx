import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, ArrowRight } from "lucide-react";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // NOTE: no backend wired up yet. Swap this for a real endpoint
    // (Formspree, an API route, etc.) before launch.
    setSubmitted(true);
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
            <span className="block text-bone">Ready When</span>
            <span className="block text-orange">You Are.</span>
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
                href="mailto:info@mtdsigns.com"
                className="hover:text-orange transition-colors"
              >
                info@mtdsigns.com
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
          {submitted ? (
            <div className="border border-orange/40 bg-charcoal2 px-6 py-8">
              <p className="font-display uppercase text-xl text-bone">
                Message sent.
              </p>
              <p className="mt-2 text-bone/70 text-sm">
                We&rsquo;ll be in touch shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
              <input
                required
                type="text"
                placeholder="Name"
                className="bg-transparent border border-line focus:border-orange px-4 py-3 text-sm text-bone placeholder:text-bone/40 outline-none transition-colors"
              />
              <input
                required
                type="email"
                placeholder="Email"
                className="bg-transparent border border-line focus:border-orange px-4 py-3 text-sm text-bone placeholder:text-bone/40 outline-none transition-colors"
              />
              <input
                type="tel"
                placeholder="Phone"
                className="bg-transparent border border-line focus:border-orange px-4 py-3 text-sm text-bone placeholder:text-bone/40 outline-none transition-colors"
              />
              <textarea
                placeholder="Project Details"
                rows={4}
                className="bg-transparent border border-line focus:border-orange px-4 py-3 text-sm text-bone placeholder:text-bone/40 outline-none transition-colors sm:row-span-2"
              />
              <button
                type="submit"
                className="sm:col-span-2 inline-flex items-center justify-center gap-2 bg-orange hover:bg-orange-dim text-ink font-body font-bold text-sm tracking-wide px-6 py-3.5 transition-colors w-fit"
              >
                SEND MESSAGE <ArrowRight size={16} />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
