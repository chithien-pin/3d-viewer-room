import { useLayoutStore } from "../store/useLayoutStore";

export function ControlHint() {
  const editing = useLayoutStore((state) => state.editing);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 sm:p-4">
      <div className="max-w-[960px] rounded-full bg-[#2c2824]/80 px-4 py-2 text-center text-[11px] leading-relaxed text-[#f4efe6] shadow-lg sm:text-xs">
        {editing ? (
          <span>E: xong · Click để đặt · Kéo để dời · R xoay · Delete xóa · Ctrl+Z hoàn tác</span>
        ) : (
          <>
            <span className="hidden sm:inline">
              WASD: đi · V: góc nhìn · N: nhãn · E: sửa đồ · Nắm xoay / chuột phải: xoay · Cuộn: zoom · ?: hướng dẫn
            </span>
            <span className="sm:hidden">Chạm sàn để đi · Nút Sửa đồ để kê nội thất</span>
          </>
        )}
      </div>
    </div>
  );
}
