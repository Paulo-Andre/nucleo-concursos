import { useEffect, useRef, useState } from "react";
import { Clock3, Pause, Play, RotateCcw } from "lucide-react";
import { focusRemainingSeconds, focusTimeLabel } from "@/lib/focusTimer";

export function StudyFocusTimer() {
  const [minutes, setMinutes] = useState<15 | 25 | 40 | 60>(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const deadline = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const update = () => {
      if (deadline.current === null) return;
      const next = focusRemainingSeconds(deadline.current);
      setRemaining(next);
      if (next === 0) {
        deadline.current = null;
        setRunning(false);
        setComplete(true);
      }
    };
    update();
    const interval = window.setInterval(update, 500);
    return () => window.clearInterval(interval);
  }, [running]);

  const start = () => {
    if (remaining === 0) {
      setRemaining(minutes * 60);
      deadline.current = Date.now() + minutes * 60_000;
    } else {
      deadline.current = Date.now() + remaining * 1000;
    }
    setComplete(false);
    setRunning(true);
  };
  const pause = () => {
    if (deadline.current !== null) setRemaining(focusRemainingSeconds(deadline.current));
    deadline.current = null;
    setRunning(false);
  };
  const reset = (nextMinutes = minutes) => {
    deadline.current = null;
    setRunning(false);
    setComplete(false);
    setRemaining(nextMinutes * 60);
  };

  return <section aria-label="Modo foco" className="shell-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="eyebrow flex items-center gap-2"><Clock3 className="h-4 w-4" aria-hidden="true"/>TEMPO DE CONCENTRAÇÃO</p>
        <h3 className="font-display mt-2 text-xl font-bold">Modo foco</h3>
        <p className="mt-2 max-w-lg text-sm leading-6 text-[#52666f]">Escolha uma sessão sem distrações, inicie o cronômetro e faça uma pequena pausa ao terminar.</p>
      </div>
      <label className="text-sm font-semibold text-[#254751]">Duração
        <select aria-label="Duração do modo foco" value={minutes} onChange={event=>{const value=Number(event.target.value) as 15|25|40|60;setMinutes(value);reset(value);}} className="filter-control mt-1.5">
          <option value={15}>15 minutos</option><option value={25}>25 minutos</option><option value={40}>40 minutos</option><option value={60}>60 minutos</option>
        </select>
      </label>
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-5">
      <div role="timer" aria-label="Tempo restante do modo foco" className="font-display min-w-32 text-4xl font-bold tabular-nums text-[#0e5a70]">{focusTimeLabel(remaining)}</div>
      <div className="flex flex-wrap gap-2">
        {running ? <button type="button" onClick={pause} className="action-button inline-flex min-h-11 items-center gap-2"><Pause className="h-4 w-4" aria-hidden="true"/>Pausar</button>
          : <button type="button" onClick={start} className="action-button inline-flex min-h-11 items-center gap-2"><Play className="h-4 w-4" aria-hidden="true"/>{remaining === minutes * 60 ? "Iniciar foco" : "Continuar"}</button>}
        <button type="button" onClick={()=>reset()} className="ghost-button inline-flex min-h-11 items-center gap-2"><RotateCcw className="h-4 w-4" aria-hidden="true"/>Reiniciar</button>
      </div>
    </div>
    {complete && <p role="status" className="mt-4 rounded-lg bg-[#e2f2eb] p-3 text-sm font-semibold text-[#17644e]">Sessão concluída! Faça uma pausa breve e depois continue seu roteiro.</p>}
  </section>;
}
