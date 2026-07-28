import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import beforeTruck from "../assets/before-truck.jpg";
import afterTruck from "../assets/after-truck.jpg";
import { useTranslation } from "../lib/i18n";

export default function BeforeAfter() {
  const { t } = useTranslation();
  return (
    <section className="bg-ink">
      <div className="relative grid grid-cols-2">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative h-[280px] sm:h-[420px] overflow-hidden"
        >
          <img
            src={beforeTruck}
            alt={t("beforeTruckAlt")}
            className="h-full w-full object-cover grayscale-[30%]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="relative h-[280px] sm:h-[420px] overflow-hidden"
        >
          <img
            src={afterTruck}
            alt={t("afterTruckAlt")}
            className="h-full w-full object-cover"
          />
        </motion.div>

        {/* Center arrow, marking the transformation */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:flex h-16 w-16 items-center justify-center bg-orange">
          <ArrowRight size={28} className="text-ink" />
        </div>
      </div>

      <div className="bg-ink px-5 sm:px-8 py-6 text-center sm:text-left sm:px-12">
        <p className="font-display font-semibold uppercase text-xl sm:text-2xl">
          <span className="text-bone">{t("sameTruck")} </span>
          <span className="text-orange">{t("differentBusiness")}</span>
        </p>
      </div>
    </section>
  );
}
