import { useEffect, useState, type ReactNode } from "react";
import { useLayoutStore } from "../store/useLayoutStore";
import { input, subscribeInput, toggleHelp, toggleLabels, toggleView, type ViewMode } from "../systems/movement/input";
import { player } from "../systems/movement/player";
import { zoneAt } from "../systems/layout/zoneAt";
import type { ZoneRect } from "../types/model";
import { Joystick } from "./Joystick";
import { Minimap } from "./Minimap";

const NOTES_KEY = "glory-heights-notes";

function useHudInput(): { view: ViewMode; help: boolean; showLabels: boolean } {
  const [snapshot, setSnapshot] = useState({ view: input.view, help: input.help, showLabels: input.showLabels });
  useEffect(
    () => subscribeInput(() => setSnapshot({ view: input.view, help: input.help, showLabels: input.showLabels })),
    [],
  );
  return snapshot;
}

function GameClock() {
  const [label, setLabel] = useState("09:00");
  const [day, setDay] = useState("Thứ Hai, 9 tháng 11");

  useEffect(() => {
    let seconds = 9 * 3600;
    const id = window.setInterval(() => {
      seconds = (seconds + 10) % (24 * 3600);
      const hour = Math.floor(seconds / 3600);
      const minute = Math.floor((seconds % 3600) / 60);
      setLabel(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
      if (hour === 0 && minute === 0 && seconds < 10) setDay("Thứ Ba, 10 tháng 11");
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="leading-tight">
      <div className="text-sm font-semibold tabular-nums">{label}</div>
      <div className="text-[10px] text-[#f4efe6]/70">{day}</div>
    </div>
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute right-3 top-16 z-30 w-[min(320px,calc(100vw-1.5rem))] rounded-2xl bg-[#2c2824]/95 p-3 text-[#f4efe6] shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button type="button" className="rounded-full px-2 py-1 text-xs text-[#f4efe6]/80 hover:bg-white/10" onClick={onClose}>
          Đóng
        </button>
      </div>
      {children}
    </div>
  );
}

export function Hud({
  zones,
  bounds,
}: {
  zones: ZoneRect[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}) {
  const hud = useHudInput();
  const [room, setRoom] = useState("Sảnh");
  const editing = useLayoutStore((state) => state.editing);
  const toggleEditing = useLayoutStore((state) => state.toggleEditing);
  const [panel, setPanel] = useState<"notes" | "invite" | "chat" | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setNotes(window.localStorage.getItem(NOTES_KEY) ?? "");
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = "";
    const tick = () => {
      const zone = zoneAt(zones, player.x, player.z);
      const name = zone?.name ?? "Ngoài căn";
      if (name !== last) {
        last = name;
        setRoom(name);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [zones]);

  const saveNotes = (value: string) => {
    setNotes(value);
    window.localStorage.setItem(NOTES_KEY, value);
  };

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#2c2824]/85 px-3 py-2 text-[#f4efe6] shadow-lg">
          <GameClock />
          <div className="h-8 w-px bg-white/15" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-[#f4efe6]/60">Đang ở</div>
            <div className="max-w-[9rem] truncate text-sm font-semibold sm:max-w-[14rem]">{room}</div>
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-2 text-xs font-semibold shadow ${editing ? "bg-[#e07a3d] text-white" : "bg-[#f4efe6] text-[#5b3a29]"}`}
            onClick={() => toggleEditing()}
          >
            {editing ? "Xong" : "Sửa đồ"}
          </button>
          <button
            type="button"
            aria-pressed={hud.showLabels}
            className={`rounded-full px-3 py-2 text-xs font-semibold shadow ${hud.showLabels ? "bg-[#f4efe6] text-[#5b3a29]" : "bg-[#2c2824]/85 text-[#f4efe6]"}`}
            onClick={() => toggleLabels()}
          >
            {hud.showLabels ? "Ẩn nhãn" : "Hiện nhãn"}
          </button>
          <button
            type="button"
            className="rounded-full bg-[#f4efe6] px-3 py-2 text-xs font-semibold text-[#5b3a29] shadow"
            onClick={() => toggleView()}
          >
            {hud.view === "first" ? "Góc thứ ba" : "Góc thứ nhất"}
          </button>
          <button type="button" className="rounded-full bg-[#2c2824]/85 px-3 py-2 text-xs font-semibold text-[#f4efe6] shadow" onClick={() => setPanel("invite")}>
            Mời bạn
          </button>
          <button type="button" className="rounded-full bg-[#2c2824]/85 px-3 py-2 text-xs font-semibold text-[#f4efe6] shadow" onClick={() => setPanel("notes")}>
            Ghi chú
          </button>
          <button type="button" className="rounded-full bg-[#2c2824]/85 px-3 py-2 text-xs font-semibold text-[#f4efe6] shadow" onClick={() => toggleHelp()} aria-label="Hướng dẫn">
            ?
          </button>
        </div>
      </header>

      <div className={`absolute top-[4.6rem] z-20 ${editing ? "left-[19.5rem] hidden md:block" : "left-3"}`}>
        <Minimap zones={zones} bounds={bounds} />
      </div>

      <Joystick />

      <button
        type="button"
        aria-label="Chat"
        className="absolute bottom-[11rem] right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#5b3a29] text-lg text-[#f4efe6] shadow-lg"
        onClick={() => setPanel("chat")}
      >
        ✎
      </button>

      {panel === "notes" && (
        <Panel title="Ghi chú" onClose={() => setPanel(null)}>
          <textarea
            value={notes}
            onChange={(event) => saveNotes(event.target.value)}
            placeholder="Ghi lại ý tưởng bố trí..."
            className="h-36 w-full resize-none rounded-xl bg-white/10 p-2 text-sm outline-none"
          />
        </Panel>
      )}
      {panel === "invite" && (
        <Panel title="Mời bạn" onClose={() => setPanel(null)}>
          <p className="text-sm text-[#f4efe6]/80">Chơi cùng nhau sẽ mở ở giai đoạn nhiều người. Bạn có thể gửi link căn hộ này.</p>
          <button
            type="button"
            className="mt-3 rounded-full bg-[#f4efe6] px-3 py-1.5 text-xs font-semibold text-[#5b3a29]"
            onClick={() => void navigator.clipboard.writeText(window.location.href).catch(() => undefined)}
          >
            Sao chép link
          </button>
        </Panel>
      )}
      {panel === "chat" && (
        <Panel title="Chat" onClose={() => setPanel(null)}>
          <p className="text-sm text-[#f4efe6]/80">Khung chat dùng khi có người khác trong căn. Hiện chỉ có mình bạn.</p>
        </Panel>
      )}
      {hud.help && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#2c2824]/45 p-4" onClick={() => toggleHelp()}>
          <div className="w-[min(420px,100%)] rounded-2xl bg-[#f4efe6] p-5 text-[#2c2824] shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[#5b3a29]">Cách đi và nhìn</h2>
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
              <li>WASD hoặc mũi tên để đi, Shift để chạy.</li>
              <li>Click sàn để tự đi tới. Trên điện thoại, dùng cần ở góc trái.</li>
              <li>Chuột phải hoặc nút Xoay để đổi góc. Cuộn để zoom.</li>
              <li>V hoặc nút trên cùng để vào góc nhìn thứ nhất. Click để khóa chuột.</li>
              <li>N hoặc nút Nhãn để ẩn tên phòng và chữ Bạn. C bật trần, H hiện mọi tường, ? mở hướng dẫn này.</li>
              <li>E hoặc Sửa đồ để kê nội thất. R xoay, Delete xóa, Ctrl+Z hoàn tác.</li>
            </ul>
            <button type="button" className="mt-4 rounded-full bg-[#5b3a29] px-4 py-2 text-sm font-semibold text-[#f4efe6]" onClick={() => toggleHelp()}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
