import { useEffect, useRef, useState } from "react";
import { catalogById, catalogFile, useLayoutStore, variantColor } from "../store/useLayoutStore";
import { draft } from "../systems/edit/draft";
import type { PlacedItem } from "../types/layout";

const CATEGORIES: Record<string, string> = {
  living: "Phòng khách",
  dining: "Phòng ăn",
  bedroom: "Phòng ngủ",
  kitchen: "Bếp",
  bathroom: "WC",
  decor: "Trang trí",
  appliance: "Thiết bị",
};

function typingTarget(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function EditHotkeys() {
  const editing = useLayoutStore((state) => state.editing);
  const toggleEditing = useLayoutStore((state) => state.toggleEditing);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (typingTarget(event)) return;
      if (event.code === "KeyE" && !event.repeat && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        toggleEditing();
        return;
      }
      if (!useLayoutStore.getState().editing) return;
      const state = useLayoutStore.getState();
      const fine = event.shiftKey;
      if (event.code === "KeyR" && !event.repeat) {
        event.preventDefault();
        const step = fine ? 15 : 90;
        if (state.armed) state.rotateArmed(step);
        else state.rotateSelected(step);
      }
      if (event.code === "KeyG" && !event.repeat) state.toggleSnap();
      if (event.code === "KeyL" && !event.repeat) state.toggleLock();
      if ((event.code === "Delete" || event.code === "Backspace") && !event.repeat) {
        event.preventDefault();
        state.removeSelected();
      }
      if (event.code === "KeyD" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        state.duplicateSelected();
      }
      if (event.code === "KeyZ" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (event.shiftKey) state.redo();
        else state.undo();
      }
      if (event.code === "KeyY" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        state.redo();
      }
      if (event.code === "Escape") {
        if (state.armed) state.clearArmed();
        else if (state.selectedUid) state.select(null);
        else state.toggleEditing();
        draft.active = false;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, toggleEditing]);

  return null;
}

export function CatalogPanel() {
  const editing = useLayoutStore((state) => state.editing);
  const armed = useLayoutStore((state) => state.armed);
  const items = useLayoutStore((state) => state.items);
  const selectedUid = useLayoutStore((state) => state.selectedUid);
  const snap = useLayoutStore((state) => state.snap);
  const startMode = useLayoutStore((state) => state.startMode);
  const past = useLayoutStore((state) => state.past.length);
  const future = useLayoutStore((state) => state.future.length);
  const arm = useLayoutStore((state) => state.arm);
  const undo = useLayoutStore((state) => state.undo);
  const redo = useLayoutStore((state) => state.redo);
  const toggleSnap = useLayoutStore((state) => state.toggleSnap);
  const removeSelected = useLayoutStore((state) => state.removeSelected);
  const duplicateSelected = useLayoutStore((state) => state.duplicateSelected);
  const toggleLock = useLayoutStore((state) => state.toggleLock);
  const loadSample = useLayoutStore((state) => state.loadSample);
  const loadEmpty = useLayoutStore((state) => state.loadEmpty);
  const importItems = useLayoutStore((state) => state.importItems);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!editing) return null;

  const selected = items.find((item) => item.uid === selectedUid);
  const selectedDef = selected ? catalogById.get(selected.itemId) : undefined;
  const needle = query.trim().toLowerCase();
  const list = catalogFile.items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (!needle) return true;
    return item.name.toLowerCase().includes(needle);
  });

  const exportLayout = () => {
    const payload = { startMode, items };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "glory-heights-layout.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data: unknown = JSON.parse(String(reader.result));
        const rows = Array.isArray(data)
          ? data
          : typeof data === "object" && data !== null && Array.isArray((data as { items?: unknown }).items)
            ? (data as { items: PlacedItem[] }).items
            : [];
        importItems(rows);
      } catch {
        window.alert("File JSON không đọc được.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <aside className="absolute bottom-3 left-3 top-16 z-30 flex w-72 flex-col gap-2 overflow-hidden rounded-2xl bg-[#2c2824]/[0.96] p-3 text-[#f4efe6] shadow-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Nội thất</h2>
        <span className="text-[10px] text-[#f4efe6]/60">{items.length} món</span>
      </div>
      <div className="flex flex-wrap gap-1">
        <MiniButton label="Hoàn tác" disabled={past === 0} onClick={undo} />
        <MiniButton label="Làm lại" disabled={future === 0} onClick={redo} />
        <MiniButton label={snap ? "Lưới 10 cm" : "Lưới tắt"} onClick={toggleSnap} active={snap} />
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm đồ..."
        className="rounded-xl bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-[#f4efe6]/40"
      />
      <div className="flex gap-1 overflow-x-auto pb-1">
        <Chip label="Tất cả" active={category === "all"} onClick={() => setCategory("all")} />
        {catalogFile.categories.map((id) => (
          <Chip key={id} label={CATEGORIES[id] ?? id} active={category === id} onClick={() => setCategory(id)} />
        ))}
      </div>
      <div className="catalog-scroll min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {list.map((item) => {
          const active = armed?.itemId === item.id;
          const color = variantColor(item.id, item.variants?.[0]?.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => arm(item.id)}
              className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left ${active ? "bg-[#f4efe6] text-[#2c2824]" : "bg-white/5 hover:bg-white/10"}`}
            >
              <span className="h-8 w-8 shrink-0 rounded-lg border border-black/10" style={{ background: color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{item.name}</span>
                <span className={`block text-[10px] ${active ? "text-[#2c2824]/60" : "text-[#f4efe6]/50"}`}>
                  {item.size[0]} × {item.size[1]} × {item.size[2]} m
                </span>
              </span>
              {item.variants && (
                <span className="flex gap-1">
                  {item.variants.map((variant) => (
                    <span
                      key={variant.id}
                      role="presentation"
                      onClick={(event) => {
                        event.stopPropagation();
                        arm(item.id, variant.id);
                      }}
                      className={`h-3.5 w-3.5 rounded-full border ${active && armed?.variantId === variant.id ? "border-[#2c2824]" : "border-white/40"}`}
                      style={{ background: variant.color }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="rounded-xl bg-black/20 p-2 text-[11px] leading-relaxed text-[#f4efe6]/80">
        {armed
          ? "Click sàn để đặt. Đỏ là bị kẹt hoặc ra ngoài căn. R xoay 90°, Shift+R xoay 15°."
          : selected && selectedDef
            ? `${selectedDef.name}${selected.locked ? " · đang khóa" : ""}. Kéo để dời, R xoay, Delete xóa.`
            : "Chọn một món bên trên, hoặc bấm vào đồ trong căn."}
      </div>
      <div className="flex flex-wrap gap-1">
        <MiniButton label="Xóa" disabled={!selected || selected.locked} onClick={removeSelected} />
        <MiniButton label="Nhân bản" disabled={!selected} onClick={duplicateSelected} />
        <MiniButton label={selected?.locked ? "Mở khóa" : "Khóa"} disabled={!selected} onClick={toggleLock} />
      </div>
      <button
        type="button"
        className="rounded-full bg-[#f4efe6] px-3 py-2 text-xs font-semibold text-[#5b3a29]"
        onClick={() => (startMode === "empty" ? loadSample() : loadEmpty())}
      >
        {startMode === "empty" ? "Nội thất mẫu" : "Bàn giao thô"}
      </button>
      <div className="flex gap-1">
        <MiniButton label="Xuất JSON" onClick={exportLayout} />
        <MiniButton label="Nhập JSON" onClick={() => fileRef.current?.click()} />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.target.value = "";
          }}
        />
      </div>
    </aside>
  );
}

function MiniButton({
  label,
  onClick,
  disabled,
  active,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40 ${active ? "bg-[#e07a3d] text-white" : "bg-white/10 text-[#f4efe6]"}`}
    >
      {label}
    </button>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${active ? "bg-[#f4efe6] text-[#5b3a29]" : "bg-white/10 text-[#f4efe6]"}`}
    >
      {label}
    </button>
  );
}
