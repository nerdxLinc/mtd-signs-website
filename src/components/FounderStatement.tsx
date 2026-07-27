import { motion } from "framer-motion";
import barrySignature from "../assets/barry-signature.png";
import leonaKemperDentistSign from "../assets/leona-kemper-dentist-sign.jpg";

export default function FounderStatement() {
  return (
    <section id="story" className="relative bg-ink overflow-hidden">
      <div className="grid lg:grid-cols-2">
        {/* Text side */}
        <div className="relative px-5 sm:px-8 lg:pl-16 lg:pr-12 py-20 lg:py-28 overflow-hidden">
          {/* faint oversized year, cropped by frame */}
          <span
            aria-hidden
            className="pointer-events-none select-none absolute -right-4 top-1/2 -translate-y-1/2 font-display font-bold text-[13rem] leading-none text-bone/[0.04]"
          >
            1994
          </span>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative max-w-md"
          >
            <p className="text-orange font-body font-bold text-xs tracking-[0.2em] mb-4">
              SINCE 1994
            </p>
            <h2 className="font-display font-semibold uppercase leading-[0.95] display-tight text-4xl sm:text-5xl">
              <span className="block text-bone">Thirty years.</span>
              <span className="block text-bone">One mission.</span>
              <span className="block text-bone">Make you</span>
              <span className="block text-orange">unforgettable.</span>
            </h2>

            <p className="mt-7 text-bone/75 text-base leading-relaxed max-w-sm">
              Signs, wraps, environments and graphics that build credibility,
              attract attention and sell for you every single day.
            </p>

            <div className="mt-8">
              <img
                src={barrySignature}
                alt="Barry Branscum signature"
                className="w-48 max-w-full mix-blend-screen invert opacity-90"
              />
              <p className="mt-2 font-body text-[11px] font-bold tracking-[0.16em] text-orange">
                Barry Branscum, Owner, Designer
              </p>
            </div>
          </motion.div>
        </div>

        {/* Photo side */}
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative min-h-[320px] lg:min-h-0"
        >
          <img
            src={leonaKemperDentistSign}
            alt="Barry Branscum applying dimensional letters to the Leona Kemper dental sign"
            className="absolute inset-0 h-full w-full object-cover grayscale"
          />
        </motion.div>
      </div>
    </section>
  );
}
