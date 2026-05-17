"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * useWebSpeech — Custom hook wrapping the Web Speech API
 * Provides both Speech-to-Text (SpeechRecognition) and
 * Text-to-Speech (SpeechSynthesis) via the browser-native APIs.
 * No external models or services required.
 */

interface UseWebSpeechOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface UseWebSpeechReturn {
  // STT
  isListening: boolean;
  transcript: string;
  finalTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  sttSupported: boolean;
  sttError: string;

  // TTS
  isSpeaking: boolean;
  speak: (text: string, onEnd?: () => void) => void;
  cancelSpeech: () => void;
  ttsSupported: boolean;
}

export function useWebSpeech(opts: UseWebSpeechOptions = {}): UseWebSpeechReturn {
  const { lang = "en-US", continuous = true, interimResults = true } = opts;

  // ── STT state ──
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [sttError, setSttError] = useState("");
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef("");

  // ── TTS state ──
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Feature detection ──
  const sttSupported = typeof window !== "undefined" &&
    !!(((window as any).SpeechRecognition) || ((window as any).webkitSpeechRecognition));
  const ttsSupported = typeof window !== "undefined" && !!window.speechSynthesis;

  // ── Preload voices (Chrome loads async) ──
  useEffect(() => {
    if (ttsSupported) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, [ttsSupported]);

  // ── STT: Start Listening ──
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSttError("Web Speech API is not supported in this browser. Please use Chrome.");
      return;
    }

    finalRef.current = "";
    setTranscript("");
    setFinalTranscript("");
    setSttError("");

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = interimResults;
    recognition.continuous = continuous;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const display = final || interim;
      setTranscript(display);
      if (final) {
        finalRef.current = final;
        setFinalTranscript(final);
      }
    };

    recognition.onend = () => setIsListening(false);

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setSttError("Microphone permission denied — please allow mic access in your browser settings.");
      } else if (event.error === "no-speech") {
        setSttError("No speech detected. Please try again.");
      } else {
        setSttError(`Speech error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, continuous, interimResults]);

  // ── STT: Stop Listening ──
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setFinalTranscript("");
    finalRef.current = "";
  }, []);

  // ── TTS: Speak ──
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!ttsSupported) { onEnd?.(); return; }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Select best English voice (prefer female)
    const voices = window.speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith("en"));
    const femaleVoice = enVoices.find(v =>
      /female|zira|samantha|google.*us.*female|microsoft.*zira/i.test(v.name)
    );
    const naturalVoice = enVoices.find(v => !v.localService) || enVoices[0];
    utterance.voice = femaleVoice || naturalVoice || null;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); onEnd?.(); };
    utterance.onerror = () => { setIsSpeaking(false); onEnd?.(); };

    window.speechSynthesis.speak(utterance);
  }, [lang, ttsSupported]);

  // ── TTS: Cancel ──
  const cancelSpeech = useCallback(() => {
    if (ttsSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [ttsSupported]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (ttsSupported) window.speechSynthesis.cancel();
    };
  }, [ttsSupported]);

  return {
    isListening, transcript, finalTranscript,
    startListening, stopListening, resetTranscript,
    sttSupported, sttError,
    isSpeaking, speak, cancelSpeech, ttsSupported,
  };
}
