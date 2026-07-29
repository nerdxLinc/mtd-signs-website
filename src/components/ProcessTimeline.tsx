import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    title: "Listen.",
    body: "We learn your business and your goals.",
  },
  {
    n: "02",
    title: "Design.",
    body: "We create concepts that communicate exactly what you want to say.",
  },
  {
    n: "03",
    title: "Build.",
    body: "We produce with precision and materials built to last.",
  },
  {
    n: "04",
    title: "Install.",
    body: "We handle the details so you get a flawless finished result.",
  },
];

export default function ProcessTimeline() {
  return (
    <section id="process" className="bg-charcoal px-5 sm:px-8 py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4 mb-14">
          <h2 className="font-display font-semibold uppercase text-2xl sm:text-3xl text-bone">
            How We Work
          </h2>
          <span className="h-px w-16 bg-blue" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              className={`relative px-0 sm:px-8 py-6 sm:py-0 ${
                i > 0 ? "sm:border-l sm:border-line" : ""
              }`}
            >
              <p className="font-display font-bold text-4xl sm:text-5xl text-orange leading-none">
                {step.n}
              </p>
              <p className="mt-4 font-display font-semibold uppercase text-lg text-bone">
                {step.title}
              </p>
              <p className="mt-2 text-bone/65 text-sm leading-relaxed max-w-[220px]">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
