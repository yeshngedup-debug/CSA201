export function Footer() {
  return (
    <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 pb-2 pt-3 text-[10px] text-[#5c6e63]">
      <span>© 2026 Teru Care · Teru Care — CSA201 Group 1 · <strong className="font-semibold text-[#5c6e63]">Ctrl+N</strong> new · <strong className="font-semibold text-[#5c6e63]">Ctrl+Z</strong> undo · <strong className="font-semibold text-[#5c6e63]">Esc</strong> close</span>
      <span className="flex items-center gap-1.5">
        <span className="live-dot h-[5px]! w-[5px]!" aria-hidden="true" /> Java backend live on :8090
      </span>
    </footer>
  );
}
