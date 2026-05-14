"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Menu, X } from "lucide-react";

const navLinks = [
  { label: "About Us",     href: "/about"         },
  { label: "Features",     href: "/features"      },
  { label: "How It Works", href: "/how-it-works"  },
  { label: "Contact",      href: "/contact"       },
];

export default function LoginNavbar() {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? "rgba(10, 22, 40, 0.85)"
          : "rgba(10, 22, 40, 0.45)",
        backdropFilter:         "blur(16px) saturate(150%)",
        WebkitBackdropFilter:   "blur(16px) saturate(150%)",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(255,255,255,0.04)",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.3)" : "none",
      }}
    >
      <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-md shadow-emerald-500/25 transition-transform duration-200 group-hover:scale-105">
            <Heart size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">
            HealthSphere
          </span>
        </Link>

        {/* ── Desktop nav links ── */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="login-nav-link relative px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/5 group"
            >
              {label}
              {/* animated underline */}
              <span className="absolute bottom-1 left-4 right-4 h-px bg-gradient-to-r from-emerald-400 to-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-250 origin-left rounded-full" />
            </Link>
          ))}
        </nav>

        {/* ── Mobile hamburger ── */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-hidden"
            style={{
              background: "rgba(10, 22, 40, 0.95)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <nav className="flex flex-col px-6 py-3 gap-1">
              {navLinks.map(({ label, href }, i) => (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.2 }}
                >
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-3 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-400/60" />
                    {label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
