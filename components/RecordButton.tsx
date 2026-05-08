"use client";

import { useEffect, useRef, useState } from "react";

export default function RecordButton({
  onAudio,
  disabled,
}: {
  onAudio: (blob: Blob) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => stopAll();
  }, []);

  function stopAll() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        stopAll();
        if (blob.size > 0) onAudio(blob);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch (err) {
      console.error("Mic error", err);
      alert("Mikrofonzugriff fehlgeschlagen: " + (err as Error).message);
    }
  }

  function stop() {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  }

  const scale = 1 + level * 0.5;

  return (
    <button
      onClick={recording ? stop : start}
      disabled={disabled}
      className={`relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
        recording
          ? "bg-red-600 hover:bg-red-700"
          : "bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700"
      } disabled:opacity-40`}
      title={recording ? "Aufnahme stoppen" : "Aufnahme starten"}
      aria-label={recording ? "Aufnahme stoppen" : "Aufnahme starten"}
    >
      {recording && (
        <span
          className="absolute inset-0 rounded-full bg-red-500/30 transition-transform"
          style={{ transform: `scale(${scale})` }}
        />
      )}
      <span className="relative text-xl">{recording ? "■" : "🎙️"}</span>
    </button>
  );
}
