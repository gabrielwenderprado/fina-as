import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  HardDriveDownload,
  Landmark,
  LockKeyhole,
  Pencil,
  Plus,
  ReceiptText,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { calculateCumulativeBalance } from "../lib/cumulativeBalance";

type EntryType = "income" | "fixed" | "expense";
type Entry = {
  id: string;
  period: string;
  type: EntryType;
  description: string;
  amountCents: number;
  entryDate: string;
};
type Draft = { type: EntryType; description: string; amount: string; entryDate: string };
type StoredState = { entries: Entry[]; unreadable: boolean };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const APP_ID = "mesacerto";
const STORAGE_KEY = "mesacerto:financas:v1";
const BACKUP_VERSION = 1;

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || month < 1 || month > 12 || day < 1) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const period = typeof item.period === "string" ? item.period : "";
  const entryDate = typeof item.entryDate === "string" ? item.entryDate : "";
  const validPeriod = /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
  const validDate = isCalendarDate(entryDate);
  return (
    typeof item.id === "string" && item.id.length > 0 &&
    validPeriod && validDate && entryDate.slice(0, 7) === period &&
    (item.type === "income" || item.type === "fixed" || item.type === "expense") &&
    typeof item.description === "string" && item.description.trim().length > 0 && item.description.length <= 120 &&
    Number.isSafeInteger(item.amountCents) && Number(item.amountCents) > 0
  );
}

function parseStoredValue(raw: string | null): StoredState {
  if (!raw) return { entries: [], unreadable: false };
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return { entries: [], unreadable: true };
    const parsed = data as { app?: unknown; version?: unknown; entries?: unknown };
    if (parsed.app !== APP_ID || parsed.version !== BACKUP_VERSION || !Array.isArray(parsed.entries)) {
      return { entries: [], unreadable: true };
    }
    const validEntries = parsed.entries.filter(isEntry);
    const seenIds = new Set<string>();
    const entries = validEntries.filter(item => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
    return { entries, unreadable: entries.length !== parsed.entries.length };
  } catch {
    return { entries: [], unreadable: true };
  }
}

function readLocalEntries(): StoredState {
  try {
    return parseStoredValue(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return { entries: [], unreadable: true };
  }
}

const monthNow = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 2),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});
const formatMoney = (cents: number) => currency.format(cents / 100);

const formatDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(year, month - 1, day),
  );
};

const daysInMonth = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month, 0).getDate();
};

const displayType: Record<EntryType, string> = {
  income: "Entrada",
  fixed: "Conta fixa",
  expense: "Gasto variável",
};

function moveMonth(period: string, offset: number) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 2);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span /><span /><span />
    </div>
  );
}

export default function Home() {
  const [stored, setStored] = useState<StoredState>(() => readLocalEntries());
  const [saveFailed, setSaveFailed] = useState(false);
  const [period, setPeriod] = useState(monthNow);
  const [showEditor, setShowEditor] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [filter, setFilter] = useState<"all" | EntryType>("all");
  const restoreInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft>({ type: "income", description: "", amount: "", entryDate: `${monthNow()}-01` });

  const entries = stored.entries;
  const currentPeriod = monthNow();
  const cumulativeBalance = useMemo(
    () => calculateCumulativeBalance(entries, currentPeriod),
    [entries, currentPeriod],
  );

  useEffect(() => {
    if (stored.unreadable) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ app: APP_ID, version: BACKUP_VERSION, entries }));
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  }, [entries, stored.unreadable]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setStored(parseStoredValue(event.newValue));
    };
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("storage", onStorage);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const totals = useMemo(() => {
    const monthEntries = entries.filter(item => item.period === period);
    const income = monthEntries.reduce((total, item) => total + (item.type === "income" ? item.amountCents : 0), 0);
    const fixed = monthEntries.reduce((total, item) => total + (item.type === "fixed" ? item.amountCents : 0), 0);
    const variable = monthEntries.reduce((total, item) => total + (item.type === "expense" ? item.amountCents : 0), 0);
    return { income, fixed, variable, remaining: income - fixed - variable };
  }, [entries, period]);

  const monthEntries = useMemo(
    () => entries.filter(item => item.period === period).sort((a, b) => b.entryDate.localeCompare(a.entryDate)),
    [entries, period],
  );
  const filteredEntries = useMemo(
    () => filter === "all" ? monthEntries : monthEntries.filter(item => item.type === filter),
    [monthEntries, filter],
  );

  const openNewEntry = (type: EntryType = "income") => {
    if (stored.unreadable || saveFailed) {
      toast.error("Importe um backup válido antes de continuar, para não sobrescrever seus dados.");
      return;
    }
    setEditing(null);
    setDraft({ type, description: "", amount: "", entryDate: `${period}-01` });
    setShowEditor(true);
  };

  const openEditEntry = (item: Entry) => {
    setEditing(item);
    setDraft({ type: item.type, description: item.description, amount: (item.amountCents / 100).toFixed(2), entryDate: item.entryDate });
    setShowEditor(true);
  };

  const closeEditor = () => { setShowEditor(false); setEditing(null); };

  const submitEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(draft.amount.replace(",", "."));
    const amountCents = Math.round(amount * 100);
    if (!draft.description.trim()) return toast.error("Dê um nome para esse lançamento.");
    if (!Number.isFinite(amount) || !Number.isSafeInteger(amountCents) || amountCents <= 0) return toast.error("Informe um valor positivo que possa ser guardado em centavos.");
    if (!isCalendarDate(draft.entryDate) || draft.entryDate.slice(0, 7) !== period) return toast.error("Escolha uma data válida dentro do mês selecionado.");
    const values = { period, type: draft.type, description: draft.description.trim().slice(0, 120), amountCents, entryDate: draft.entryDate };
    if (editing) {
      setStored(current => ({ ...current, entries: current.entries.map(item => item.id === editing.id ? { ...item, ...values } : item) }));
      toast.success("Lançamento atualizado neste aparelho.");
    } else {
      setStored(current => ({ ...current, entries: [{ id: newId(), ...values }, ...current.entries] }));
      toast.success("Lançamento salvo neste aparelho.");
    }
    closeEditor();
  };

  const removeEntry = (item: Entry) => {
    if (!window.confirm(`Apagar “${item.description}” do histórico deste aparelho?`)) return;
    setStored(current => ({ ...current, entries: current.entries.filter(entry => entry.id !== item.id) }));
    toast.success("Lançamento removido.");
  };

  const downloadBackup = () => {
    if (stored.unreadable) return toast.error("Os dados atuais não puderam ser lidos. Restaure um backup válido.");
    const backup = { app: APP_ID, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), entries };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mes-a-certo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Backup baixado. Guarde o arquivo em um lugar seguro.");
  };

  const restoreBackup = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("Esse arquivo é maior do que o limite de 5 MB.");
      const raw: unknown = JSON.parse(await file.text());
      if (!raw || typeof raw !== "object") throw new Error("O arquivo não parece ser um backup do Mês a Certo.");
      const backup = raw as { app?: unknown; version?: unknown; entries?: unknown };
      if (backup.app !== APP_ID || backup.version !== BACKUP_VERSION || !Array.isArray(backup.entries)) {
        throw new Error("Esse backup não é compatível com esta versão do app.");
      }
      if (backup.entries.length > 10000 || !backup.entries.every(isEntry)) {
        throw new Error("Há registros inválidos neste arquivo de backup.");
      }
      const restoredEntries = backup.entries as Entry[];
      const restoredIds = new Set(restoredEntries.map(item => item.id));
      if (restoredIds.size !== restoredEntries.length) throw new Error("O backup contém identificadores repetidos.");
      if (entries.length && !window.confirm(`Restaurar ${restoredEntries.length} registros e substituir os ${entries.length} registros deste aparelho?`)) return;
      setStored({ entries: restoredEntries, unreadable: false });
      setSaveFailed(false);
      setShowBackup(false);
      toast.success("Backup restaurado neste aparelho.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível restaurar o backup.");
    } finally {
      if (restoreInput.current) restoreInput.current.value = "";
    }
  };

  const installApp = async () => {
    if (!installPrompt) {
      setShowInstallGuide(true);
      return;
    }
    try {
      const prompt = installPrompt;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === "accepted") toast.success("O app foi adicionado à tela inicial.");
    } catch {
      setShowInstallGuide(true);
    }
  };

  const spend = totals.fixed + totals.variable;
  const spendPercent = totals.income > 0 ? Math.min(100, Math.round(spend / totals.income * 100)) : 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label="Mês a Certo — início">
          <BrandMark />
          <span className="brand-copy"><strong>mês a certo</strong><small>finanças no seu ritmo</small></span>
        </a>
        <div className="topbar-right">
          <div className="topbar-balance" role="status" aria-live="polite" aria-label={stored.unreadable ? "Saldo acumulado indisponível; restaure um backup." : `Saldo acumulado até ${monthLabel(currentPeriod)}: ${formatMoney(cumulativeBalance)}`} title={`Acumulado até ${monthLabel(currentPeriod)}, independente do mês filtrado`}>
            <span>Saldo na carteira</span>
            <strong>{stored.unreadable ? "—" : formatMoney(cumulativeBalance)}</strong>
          </div>
          <div className="topbar-actions">
            <button className="tool-button" onClick={() => setShowBackup(true)} aria-label="Backup e restauração dos dados"><HardDriveDownload size={16} /><span>Backup</span></button>
            <button className="tool-button install-tool" onClick={() => void installApp()} aria-label="Instalar app no celular"><Smartphone size={16} /><span>Instalar</span></button>
          </div>
        </div>
      </header>

      <main className="dashboard">
        <section className="intro-row">
          <div>
            <span className="eyebrow"><Sparkles size={14} /> CONTROLE SEM COMPLICAÇÃO</span>
            <h1>Seu mês, <span>sob controle.</span></h1>
            <p>Registre, acompanhe e cuide do seu dinheiro no seu ritmo.</p>
          </div>
          <button className="primary-button desktop-add" onClick={() => openNewEntry()}><Plus size={18} /> Novo lançamento</button>
        </section>

        {(stored.unreadable || saveFailed) && (
          <div className="storage-warning" role="alert">
            <LockKeyhole size={17} />
            <span>{stored.unreadable ? "Os dados salvos não puderam ser lidos. Restaure um backup antes de continuar." : "O navegador não conseguiu salvar os últimos dados. Baixe um backup e verifique o espaço disponível."}</span>
            <button className="text-button" onClick={() => setShowBackup(true)}>Abrir backup</button>
          </div>
        )}

        <section className="local-note"><LockKeyhole size={14} /><span>Seus registros ficam somente neste navegador. Faça backup antes de trocar de aparelho ou navegador.</span></section>

        <section className="month-toolbar" aria-label="Filtro do mês">
          <div className="month-label"><CalendarDays size={18} /><span>Visão do mês</span></div>
          <div className="month-picker">
            <button className="icon-button month-arrow" onClick={() => setPeriod(current => moveMonth(current, -1))} aria-label="Mês anterior"><ChevronLeft size={19} /></button>
            <label className="month-value">
              <span>{monthLabel(period)}</span>
              <input aria-label="Filtrar por mês" type="month" value={period} onChange={event => setPeriod(event.target.value || monthNow())} />
            </label>
            <button className="icon-button month-arrow" onClick={() => setPeriod(current => moveMonth(current, 1))} aria-label="Próximo mês"><ChevronRight size={19} /></button>
          </div>
        </section>

        <section className={`balance-card ${totals.remaining < 0 ? "balance-negative" : ""}`}>
          <div className="balance-glow" />
          <div className="balance-copy">
            <span className="balance-caption"><CircleDollarSign size={16} /> PREVISÃO DE SOBRA</span>
            <p className="balance-value">{formatMoney(totals.remaining)}</p>
            <p className="balance-description">{totals.remaining < 0 ? "Os gastos passaram do que entrou neste mês." : "É o que deve sobrar depois das contas e dos gastos."}</p>
          </div>
          <div className="balance-side">
            <div className="balance-chip"><span className="balance-dot" /> {monthLabel(period)}</div>
            <div className="balance-mark" aria-hidden="true"><span /><span /><span /></div>
          </div>
        </section>

        <section className="summary-grid" aria-label="Resumo financeiro do mês">
          <article className="summary-card income-card"><div className="summary-top"><span className="summary-icon"><ArrowDownRight size={19} /></span><span className="summary-label">Entradas</span></div><strong>{formatMoney(totals.income)}</strong><small>Salário e outros rendimentos</small></article>
          <article className="summary-card fixed-card"><div className="summary-top"><span className="summary-icon"><Landmark size={18} /></span><span className="summary-label">Contas fixas</span></div><strong>{formatMoney(totals.fixed)}</strong><small>O que já tem destino</small></article>
          <article className="summary-card expense-card"><div className="summary-top"><span className="summary-icon"><ShoppingBag size={18} /></span><span className="summary-label">Gastos variáveis</span></div><strong>{formatMoney(totals.variable)}</strong><small>Compras, passeios e extras</small></article>
        </section>

        <section className="content-grid">
          <article className="panel movements-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">SEU HISTÓRICO</span><h2>Lançamentos</h2></div>
              <button className="primary-button compact-add" onClick={() => openNewEntry()}><Plus size={17} /><span>Adicionar</span></button>
            </div>
            <div className="filter-row" role="tablist" aria-label="Filtrar lançamentos">
              {([["all", "Todos"], ["income", "Entradas"], ["fixed", "Contas"], ["expense", "Gastos"]] as const).map(([value, label]) => (
                <button key={value} role="tab" aria-selected={filter === value} className={`filter-tab ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)}>{label}</button>
              ))}
            </div>
            {filteredEntries.length === 0 ? (
              <div className="empty-state"><div className="empty-icon"><ReceiptText size={22} /></div><strong>{monthEntries.length === 0 ? "Seu mês começa por aqui" : "Nada por aqui ainda"}</strong><p>{monthEntries.length === 0 ? "Adicione o salário, uma conta ou seu primeiro gasto." : "Não há lançamentos nessa categoria neste mês."}</p>{monthEntries.length === 0 && <button className="text-button" onClick={() => openNewEntry("income")}><Plus size={16} /> Registrar meu salário</button>}</div>
            ) : (
              <div className="entry-list">{filteredEntries.map(item => (
                <article className="entry-row" key={item.id}>
                  <div className={`entry-icon ${item.type}`}>{item.type === "income" ? <ArrowDownRight size={18} /> : item.type === "fixed" ? <Landmark size={17} /> : <ShoppingBag size={17} />}</div>
                  <div className="entry-main"><strong>{item.description}</strong><span>{displayType[item.type]} <i>·</i> {formatDate(item.entryDate)}</span></div>
                  <div className={`entry-amount ${item.type === "income" ? "positive" : "negative"}`}>{item.type === "income" ? "+ " : "− "}{formatMoney(item.amountCents)}</div>
                  <div className="entry-actions"><button className="icon-button" aria-label={`Editar ${item.description}`} title="Editar" onClick={() => openEditEntry(item)}><Pencil size={15} /></button><button className="icon-button delete-action" aria-label={`Apagar ${item.description}`} title="Apagar" onClick={() => removeEntry(item)}><Trash2 size={15} /></button></div>
                </article>
              ))}</div>
            )}
            {monthEntries.length > 0 && <div className="panel-footnote"><LockKeyhole size={13} /> Histórico salvo neste aparelho para {monthLabel(period)}.</div>}
          </article>

          <aside className="side-column">
            <article className="panel spending-panel"><span className="eyebrow">COMO ESTÁ O MÊS?</span><h2>Entrou x saiu</h2><div className="spending-amounts"><div><span>Entrou</span><strong>{formatMoney(totals.income)}</strong></div><div><span>Saiu</span><strong>{formatMoney(spend)}</strong></div></div><div className="progress-track" role="progressbar" aria-label="Percentual da renda comprometida" aria-valuenow={spendPercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${spendPercent}%` }} /></div><p className="progress-copy">{totals.income === 0 ? "Registre uma entrada para acompanhar seu mês." : totals.remaining < 0 ? "Seus gastos ultrapassaram as entradas." : `${spendPercent}% da sua renda já tem destino.`}</p><div className="split-line" /><div className="mini-breakdown"><span><i className="legend-dot fixed-dot" /> Contas fixas</span><strong>{formatMoney(totals.fixed)}</strong></div><div className="mini-breakdown"><span><i className="legend-dot variable-dot" /> Gastos variáveis</span><strong>{formatMoney(totals.variable)}</strong></div></article>
            <article className="tip-card"><div className="tip-icon"><Sparkles size={17} /></div><div><strong>Um passo de cada vez</strong><p>Registre os gastos quando acontecerem. No fim do mês, a visão fica muito mais clara.</p></div></article>
          </aside>
        </section>
        <footer className="footer-note"><BrandMark /><span>Seus dados financeiros não saem deste navegador.</span></footer>
      </main>

      <button className="mobile-fab" aria-label="Novo lançamento" onClick={() => openNewEntry()}><Plus size={23} /><span>Novo</span></button>
      <input ref={restoreInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={event => void restoreBackup(event.currentTarget.files?.[0])} />

      {showEditor && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeEditor(); }}><section className="entry-modal" role="dialog" aria-modal="true" aria-labelledby="entry-modal-title"><div className="modal-heading"><div><span className="eyebrow">{editing ? "AJUSTE SEU REGISTRO" : "NOVO REGISTRO"}</span><h2 id="entry-modal-title">{editing ? "Editar lançamento" : "Adicionar ao mês"}</h2></div><button className="icon-button close-modal" aria-label="Fechar" onClick={closeEditor}><X size={19} /></button></div><form onSubmit={submitEntry}><label className="field-label">Tipo de lançamento</label><div className="type-picker">{([["income", "Entrada"], ["fixed", "Conta fixa"], ["expense", "Gasto"]] as const).map(([value, label]) => <button type="button" key={value} className={`type-choice ${draft.type === value ? `selected ${value}` : ""}`} onClick={() => setDraft(current => ({ ...current, type: value }))}>{label}</button>)}</div><label className="field-label" htmlFor="entry-description">Descrição</label><input id="entry-description" className="form-input" autoFocus placeholder={draft.type === "income" ? "Ex.: Salário" : draft.type === "fixed" ? "Ex.: Aluguel" : "Ex.: Mercado"} maxLength={120} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} /><label className="field-label" htmlFor="entry-amount">Valor</label><div className="money-input"><span>R$</span><input id="entry-amount" className="form-input" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0,00" value={draft.amount} onChange={event => setDraft(current => ({ ...current, amount: event.target.value }))} /></div><label className="field-label" htmlFor="entry-date">Data</label><input id="entry-date" className="form-input" type="date" min={`${period}-01`} max={`${period}-${daysInMonth(period)}`} value={draft.entryDate} onChange={event => setDraft(current => ({ ...current, entryDate: event.target.value }))} /><div className="form-period-note"><CalendarDays size={14} /> Será salvo em <strong>{monthLabel(period)}</strong>, só neste navegador.</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={closeEditor}>Cancelar</button><button type="submit" className="primary-button"><Check size={17} />{editing ? "Salvar alterações" : "Salvar lançamento"}</button></div></form></section></div>}

      {showBackup && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowBackup(false); }}><section className="entry-modal backup-modal" role="dialog" aria-modal="true" aria-labelledby="backup-title"><div className="modal-heading"><div><span className="eyebrow">SEUS DADOS, SOB SEU CONTROLE</span><h2 id="backup-title">Backup e restauração</h2></div><button className="icon-button close-modal" aria-label="Fechar" onClick={() => setShowBackup(false)}><X size={19} /></button></div><div className="backup-local-note"><LockKeyhole size={17} /><p>Os registros ficam neste aparelho e não são enviados ao GitHub. Use um backup se trocar de celular, navegador ou endereço do app.</p></div><button className="primary-button backup-action" onClick={downloadBackup} disabled={stored.unreadable}><Download size={17} /> Baixar backup dos meus dados</button><button className="secondary-button backup-action" onClick={() => restoreInput.current?.click()}><Upload size={17} /> Restaurar de um arquivo</button><p className="backup-footnote">O arquivo de backup pode conter seus dados financeiros. Guarde-o em um local privado.</p></section></div>}

      {showInstallGuide && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowInstallGuide(false); }}><section className="entry-modal install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title"><div className="modal-heading"><div><span className="eyebrow">LEVE O APP COM VOCÊ</span><h2 id="install-title">Instalar no celular</h2></div><button className="icon-button close-modal" aria-label="Fechar" onClick={() => setShowInstallGuide(false)}><X size={19} /></button></div><div className="install-instructions"><div><span className="install-device"><Smartphone size={18} /></span><p><strong>Android</strong><br />Abra no Chrome, toque no menu <b>⋮</b> e escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p></div><div><span className="install-device"><WalletCards size={18} /></span><p><strong>iPhone</strong><br />Abra no Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p></div></div><p className="backup-footnote">Depois de instalar, abra o ícone da tela inicial. Os dados ficam no armazenamento local desta instalação e não sincronizam com outros aparelhos. Use o backup para transferi-los.</p><div className="modal-actions"><button className="primary-button" onClick={() => setShowInstallGuide(false)}>Entendi</button></div></section></div>}
    </div>
  );
}
