'use client';

/* eslint-disable @next/next/no-img-element */
import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { Logo } from '@/components/ui/Logo';
import { BarcodeIcon, SparkPhotoIcon, CarIcon } from '@/components/ui/icons';

const features = [
  {
    Icon: BarcodeIcon,
    title: 'Scan the barcode',
    body: 'Carded car? Scan the UPC and the details fill themselves in — saved in seconds.',
  },
  {
    Icon: SparkPhotoIcon,
    title: 'Match loose cars by photo',
    body: 'Snap a top-down photo and on-device AI finds it in your collection. Nothing leaves your phone.',
  },
  {
    Icon: CarIcon,
    title: 'Never double-buy',
    body: 'It flags “you may already own this” before you’re at the till. Browse the whole garage offline.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

export function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Scroll-linked parallax for the hero layers.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '28%']);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.18]);
  const carY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-22%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '60%']);
  const heroFade = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0.15]);

  return (
    <main className="min-h-screen">
      {/* Top nav floats over the hero */}
      <nav className="absolute inset-x-0 top-0 z-30 mx-auto flex max-w-6xl items-center justify-between px-6 pt-safe-bar">
        <span className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <span className="text-lg font-extrabold uppercase tracking-tight text-ink">
            Pit<span className="text-accent">stop</span>
          </span>
        </span>
        <Link
          href="/login"
          className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold text-ink backdrop-blur hover:border-accent/60"
        >
          Sign in
        </Link>
      </nav>

      {/* ---------------- Hero ---------------- */}
      <section ref={heroRef} className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
        {/* Parallax background: shelf of cars */}
        <motion.div className="absolute inset-0" style={{ y: bgY, scale: bgScale, opacity: heroFade }}>
          <img src="/landing/hero.webp" alt="" className="h-full w-full object-cover" />
          {/* legibility + theme wash */}
          <div className="absolute inset-0 bg-gradient-to-b from-bg/85 via-bg/55 to-bg" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent,rgba(10,10,10,0.65))]" />
        </motion.div>

        {/* Floating hero car — mix-blend-screen drops the image's black bg into
            the dark hero so it reads as a cutout, not a box. */}
        <motion.div
          style={{ y: carY }}
          initial={reduce ? false : { opacity: 0, scale: 0.85, y: 40 }}
          animate={reduce ? {} : { opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute bottom-[10%] right-[3%] w-[48%] max-w-lg sm:bottom-[13%]"
        >
          {/* gold halo */}
          <div className="absolute inset-0 -z-10 translate-y-6 scale-90 rounded-full bg-accent/20 blur-3xl" />
          <img src="/landing/car.webp" alt="Die-cast model car" className="w-full mix-blend-screen" />
        </motion.div>

        {/* Hero copy */}
        <motion.div
          style={{ y: textY }}
          className="relative z-10 mx-auto flex max-w-6xl flex-col items-start px-6 text-left"
        >
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.12, delayChildren: 0.1 }}
            className="max-w-2xl"
          >
            <motion.span
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="inline-block rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent"
            >
              Phone-first diecast catalog
            </motion.span>
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="mt-5 text-balance text-5xl font-extrabold leading-[1.02] tracking-tight text-ink sm:text-7xl"
            >
              Your collection,<br />
              <span className="text-accent">one scan away.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="mt-5 max-w-lg text-pretty text-lg text-ink-muted"
            >
              Scan barcodes, photo-match loose cars with on-device AI, and know exactly what you
              own — even offline.
            </motion.p>
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="flex min-h-12 items-center rounded-full bg-accent px-7 text-base font-bold text-bg transition-transform active:scale-95"
              >
                Get started
              </Link>
              <a
                href="https://github.com/kea0811/pitstop"
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center rounded-full border border-white/20 bg-black/30 px-7 text-base font-semibold text-ink backdrop-blur hover:border-accent/60"
              >
                View on GitHub
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* scroll hint */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-ink-muted"
        >
          <motion.div
            animate={reduce ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="text-2xl"
          >
            ↓
          </motion.div>
        </motion.div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="max-w-2xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl"
        >
          Built for the moment you’re <span className="text-accent">standing in the aisle.</span>
        </motion.h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {features.map(({ Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              variants={fadeUp}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-panel p-6"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- Showcase strip (parallax band) ---------------- */}
      <ShowcaseBand />

      {/* ---------------- Closing CTA ---------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-panel px-6 py-16 text-center"
        >
          <Logo className="h-14 w-14" />
          <h2 className="max-w-xl text-3xl font-extrabold text-ink sm:text-4xl">
            Stop guessing what you own.
          </h2>
          <Link
            href="/login"
            className="flex min-h-12 items-center rounded-full bg-accent px-8 text-base font-bold text-bg transition-transform active:scale-95"
          >
            Start your collection
          </Link>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
            Free · open source · installs to your home screen
          </p>
        </motion.div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 pb-12 text-xs text-ink-muted">
        <span>Pitstop</span>
        <span aria-hidden>·</span>
        <span>MIT licensed</span>
        <span aria-hidden>·</span>
        <a href="https://github.com/kea0811/pitstop" className="hover:text-ink" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </main>
  );
}

/** A full-bleed parallax band using the shelf image. */
function ShowcaseBand() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-12%', reduce ? '-12%' : '12%']);

  return (
    <section ref={ref} className="relative h-[42vh] overflow-hidden border-y border-white/10 sm:h-[52vh]">
      <motion.img
        src="/landing/hero.webp"
        alt=""
        style={{ y }}
        className="absolute inset-0 h-[130%] w-full object-cover"
      />
      <div className="absolute inset-0 bg-bg/60" />
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl text-2xl font-bold text-ink sm:text-3xl"
        >
          Every casting, every variant — <span className="text-accent">cataloged in your pocket.</span>
        </motion.p>
      </div>
    </section>
  );
}
