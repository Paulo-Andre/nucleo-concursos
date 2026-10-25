import { useEffect, useRef, type KeyboardEvent } from "react";
import { ShieldCheck, X } from "lucide-react";
import { AdminCommercePanel } from "@/components/AdminCommercePanel";
import { AdminBackupPanel } from "@/components/AdminBackupPanel";
import { AdminLibraryPanel } from "@/components/AdminLibraryPanel";
import { AdminPanel } from "@/components/AdminPanel";
import { CourseCatalogManagementPanel } from "@/components/CourseCatalogManagementPanel";
import { GlobalContactSettingsPanel } from "@/components/GlobalContactSettingsPanel";
import { GlobalSettingsPanel } from "@/components/GlobalSettingsPanel";
import { StorefrontLivePreview } from "@/components/StorefrontLivePreview";
import { CompetitionAdminPanel } from "@/components/CompetitionAdminPanel";
import { AlertAdminPanel } from "@/components/AlertAdminPanel";
import { rootManagementSections, rootManagementGroups, type RootManagementSection } from "@/lib/rootManagementNavigation";

export type { RootManagementSection } from "@/lib/rootManagementNavigation";

type RootManagementPanelProps = {
  activeSection: RootManagementSection;
  onSectionChange: (section: RootManagementSection) => void;
  onClose: () => void;
};

export function RootManagementPanel({ activeSection, onSectionChange, onClose }: RootManagementPanelProps) {
  const active = rootManagementSections.find(section => section.id === activeSection) ?? rootManagementSections[0];
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')
    ).filter(element => element.getClientRects().length > 0 && !element.closest('[aria-hidden="true"]'));
    if (!focusable.length) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#152d38]/70 p-0 backdrop-blur-sm sm:p-3">
      <section
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="root-management-title"
        aria-describedby="root-management-description"
        className="mx-auto flex h-full w-full max-w-[1540px] flex-col overflow-hidden bg-[#fffdf8] shadow-2xl outline-none sm:h-[calc(100vh-1.5rem)] sm:rounded-[1.4rem] sm:border sm:border-[#274a54] lg:flex-row"
      >
        <aside className="shrink-0 border-b border-[#355762] bg-[#152d38] text-white lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3 lg:p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[#9be0d2]"><ShieldCheck className="h-4 w-4" aria-hidden="true" /><p className="text-xs font-bold tracking-wide">ADMINISTRAÇÃO</p></div>
              <h2 id="root-management-title" className="font-display mt-1 text-lg font-bold">Centro de gestão</h2>
              <p id="root-management-description" className="mt-1 hidden text-sm leading-5 text-[#c7dedd] lg:block">Acesse as áreas de gestão e ensino.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar administração" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/25 text-white transition-colors hover:bg-white/10 lg:hidden"><X className="h-5 w-5" aria-hidden="true" /></button>
          </div>
          <div className="px-4 py-3 lg:hidden">
            <label htmlFor="root-section-select" className="mb-1.5 block text-sm font-semibold text-[#d7ebe6]">Área administrativa</label>
            <select id="root-section-select" value={activeSection} onChange={event => onSectionChange(event.target.value as RootManagementSection)} className="min-h-11 w-full rounded-xl border border-white/30 bg-[#fffdf8] px-3 text-base font-semibold text-[#173d4a]">
              {rootManagementGroups.map(group => <optgroup key={group.label} label={group.label}>{group.sections.map(section => <option key={section.id} value={section.id}>{section.label}</option>)}</optgroup>)}
            </select>
          </div>
          <nav aria-label="Áreas da administração" className="hidden min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5 lg:block">
            {rootManagementGroups.map(group => (
              <div key={group.label}>
                <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-[#9ec8c8]">{group.label}</p>
                <div className="space-y-1">
                  {group.sections.map(section => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return <button key={section.id} type="button" onClick={() => onSectionChange(section.id)} aria-current={isActive ? "page" : undefined} className={`min-h-11 w-full rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#8ad2c3] ${isActive ? "border-[#8ad2c3] bg-[#0e5a70] text-white shadow-[inset_3px_0_0_#8ad2c3]" : "border-transparent text-[#d5e5e4] hover:border-white/20 hover:bg-white/10 hover:text-white"}`}>
                      <span className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{section.label}</span>
                      <span className={`mt-1 block text-xs leading-5 ${isActive ? "text-[#e2f4f0]" : "text-[#bed6d5]"}`}>{section.description}</span>
                    </button>;
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="hidden shrink-0 border-t border-white/10 p-4 lg:block">
            <p className="mb-3 text-sm font-medium text-[#c7dedd]">Área atual: <strong className="text-white">{active.label}</strong></p>
            <button type="button" onClick={onClose} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/25 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10">Fechar administração</button>
          </div>
        </aside>
        <div className="relative min-h-0 flex-1 bg-[#f5f1e8]" aria-label={`Área: ${active.label}`}>
          <div className="root-management-embedded h-full">
            {activeSection === "business" && <AdminCommercePanel embedded />}
            {activeSection === "students" && <AdminPanel embedded mode="students" />}
            {activeSection === "courses" && <CourseCatalogManagementPanel />}
            {activeSection === "contents" && <AdminLibraryPanel embedded />}
            {activeSection === "alerts" && <AlertAdminPanel />}
            {activeSection === "contacts" && <GlobalContactSettingsPanel />}
            {activeSection === "settings" && <div className="grid h-full min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(440px,.9fr)]"><div className="min-h-0"><GlobalSettingsPanel /></div><StorefrontLivePreview /></div>}
            {activeSection === "competition" && <CompetitionAdminPanel />}
            {activeSection === "backup" && <AdminBackupPanel />}
          </div>
        </div>
      </section>
    </div>
  );
}
