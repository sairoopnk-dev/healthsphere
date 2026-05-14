"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState("en");

  const triggerTranslation = (lang: string) => {
    let attempts = 0;
    const interval = setInterval(() => {
      const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
      if (select) {
        select.value = lang;
        select.dispatchEvent(new Event("change"));
        clearInterval(interval);
      }
      attempts++;
      if (attempts > 20) {
        // Stop trying after 10 seconds (20 * 500ms)
        clearInterval(interval);
      }
    }, 500);
  };

  // On mount, apply language from localStorage if it exists
  useEffect(() => {
    const savedLang = localStorage.getItem("app_language");
    if (savedLang) {
      setLanguageState(savedLang);
      triggerTranslation(savedLang);
    }
  }, []);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
    triggerTranslation(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
