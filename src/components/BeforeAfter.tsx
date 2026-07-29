import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import beforeTruck from "../assets/before-truck.jpg";
import afterTruck from "../assets/after-truck.jpg";
import { useTranslation } from "../lib/i18n";

export default function BeforeAfter() {
  const { t } = useTranslation();
  return (
    <section className="bg-ink">
      <div className="relative grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative aspect-[128/57] min-w-0 overflow-hidden bg-charcoal2"
        >
          <img
            src={beforeTruck}
            alt={t("beforeTruckAlt")}
            className="block h-full w-full object-contain grayscale-[30%]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="relative aspect-[128/57] min-w-0 overflow-hidden bg-charcoal2"
        >
          <img
            src={afterTruck}
            alt={t("afterTruckAlt")}
            className="block h-full w-full object-contain"
          />
        </motion.div>

        {/* Center arrow, marking the transformation */}
        <div className="absolute left-1/2 top-1/2 z-10 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-4 border-ink bg-blue md:flex">
          <ArrowRight size={28} className="text-bone" />
        </div>
      </div>

      <div className="bg-ink px-4 py-6 text-center sm:px-8 sm:text-left lg:px-12">
        <p className="font-display font-semibold uppercase text-xl sm:text-2xl">
          <span className="text-bone">{t("sameTruck")} </span>
          <span className="text-orange">{t("differentBusiness")}</span>
        </p>
      </div>
    </section>
  );
}
