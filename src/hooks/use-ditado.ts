"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/*
 * Tipos mínimos da Web Speech API (SpeechRecognition): ela ainda não faz
 * parte do lib.dom do TypeScript e, no Chrome/Safari, vem com prefixo webkit.
 */
type ResultadoFala = { isFinal: boolean; 0: { transcript: string } };
type EventoResultado = {
  resultIndex: number;
  results: { length: number; [indice: number]: ResultadoFala };
};
type EventoErro = { error: string };
type Reconhecimento = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((evento: EventoResultado) => void) | null;
  onerror: ((evento: EventoErro) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type ConstrutorReconhecimento = new () => Reconhecimento;

function construtorReconhecimento(): ConstrutorReconhecimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, ConstrutorReconhecimento | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Tem suporte a voz? O microfone exige contexto seguro (https ou localhost):
 * em http://192.168.x.x o navegador recusa, então tratamos como "sem suporte".
 */
function temSuporte(): boolean {
  return construtorReconhecimento() !== null && window.isSecureContext;
}

const nadaMuda = () => () => {};

const MENSAGENS_ERRO: Record<string, string> = {
  "not-allowed": "Permita o uso do microfone no navegador para ditar.",
  "service-not-allowed": "Permita o uso do microfone no navegador para ditar.",
  "no-speech": "Não ouvi nada. Toque no microfone e fale de novo.",
  "audio-capture": "Nenhum microfone encontrado neste aparelho.",
  network: "Sem conexão para reconhecer a voz. Tente de novo ou digite o texto.",
  "language-not-supported": "Este navegador não reconhece voz em português.",
};

/**
 * Ditado por voz em português (pt-BR) com a Web Speech API do navegador.
 * `aoReconhecer` recebe cada trecho FINAL reconhecido; `parcial` mostra o que
 * ainda está sendo ouvido. Sem suporte, `suportado` é false (e no servidor
 * também, para a primeira renderização bater com a do navegador).
 */
export function useDitado(aoReconhecer: (trecho: string) => void) {
  const suportado = useSyncExternalStore(nadaMuda, temSuporte, () => false);
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const reconhecimento = useRef<Reconhecimento | null>(null);
  const callback = useRef(aoReconhecer);
  useEffect(() => {
    callback.current = aoReconhecer;
  }, [aoReconhecer]);

  // Para de ouvir ao sair da tela.
  useEffect(() => () => reconhecimento.current?.abort(), []);

  const iniciar = useCallback(() => {
    const Construtor = construtorReconhecimento();
    if (!Construtor || reconhecimento.current) return;

    const r = new Construtor();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;

    r.onresult = (evento) => {
      let emAndamento = "";
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const resultado = evento.results[i];
        const texto = resultado[0].transcript;
        if (resultado.isFinal) {
          if (texto.trim()) callback.current(texto.trim());
        } else {
          emAndamento += texto;
        }
      }
      setParcial(emAndamento.trim());
    };
    r.onerror = (evento) => {
      if (evento.error === "aborted") return;
      setErro(MENSAGENS_ERRO[evento.error] ?? "Não foi possível usar o microfone agora.");
    };
    r.onend = () => {
      reconhecimento.current = null;
      setOuvindo(false);
      setParcial("");
    };

    setErro(null);
    try {
      r.start();
      reconhecimento.current = r;
      setOuvindo(true);
    } catch {
      setErro("Não foi possível usar o microfone agora.");
    }
  }, []);

  const parar = useCallback(() => reconhecimento.current?.stop(), []);

  return { suportado, ouvindo, parcial, erro, iniciar, parar };
}
