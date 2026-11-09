import { useEffect, useState } from "react";

export function BootScreen({ ready, title }: { ready: boolean; title: string }) {
  const [progress, setProgress] = useState(12);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (ready) {
      setProgress(100);
      const hide = window.setTimeout(() => setVisible(false), 320);
      return () => window.clearTimeout(hide);
    }
    const tick = window.setInterval(() => {
      setProgress((value) => (value >= 88 ? value : value + 4 + Math.random() * 7));
    }, 160);
    return () => window.clearInterval(tick);
  }, [ready]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#f4efe6]">
      <div className="w-[min(420px,88vw)] text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7768]">Vinhomes Grand Park</p>
        <h1 className="mt-2 font-semibold text-[#5b3a29] text-2xl">Glory Heights</h1>
        <p className="mt-1 text-sm text-[#6d6258]">{title}</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#e4d9cc]">
          <div className="h-full rounded-full bg-[#5b3a29] transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-xs text-[#8a7b6c]">Đang dựng căn hộ… {Math.round(progress)}%</p>
      </div>
    </div>
  );
}

export function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-[#f4efe6] p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold text-[#5b3a29]">Không mở được căn hộ</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5c5148]">{message}</p>
      </div>
    </div>
  );
}
