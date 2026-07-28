import { motion } from "framer-motion";
import problemSketch from "../assets/problem-sketch.jpg";
import problemShop from "../assets/problem-shop.jpg";
import problemInstall from "../assets/problem-install.jpg";
import { useTranslation } from "../lib/i18n";

export default function ProblemSolving() {
  const { t } = useTranslation();
  return (
    <section className="bg-ink px-5 sm:px-8 py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="font-display font-semibold uppercase leading-[0.98] display-tight text-3xl sm:text-4xl">
            <span className="block text-bone">{t("notJust")}</span>
            <span className="block text-orange">
              {t("problemSolving")}
            </span>
          </h2>
          <p className="mt-5 text-bone/70 text-base leading-relaxed max-w-md">
            {t("problemCopy")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="grid grid-cols-3 gap-3"
        >
          {[problemSketch, problemShop, problemInstall].map((src, i) => (
            <div key={i} className="relative aspect-[3/4] overflow-hidden group">
              <img
                src={src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover grayscale transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
