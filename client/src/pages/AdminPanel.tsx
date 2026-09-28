import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Check,
  ChefHat,
  ChevronRight,
  CircleAlert,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Snack = {
  id: number;
  name: string;
  price: number;
  color: string;
  weight: string | null;
  imageUrl: string | null;
  description: string;
  icon: string | null;
  isPublished: boolean;
  sortOrder: number;
};

type Settings = {
  announcement: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutBody: string;
};

type SnackForm = Omit<Snack, "id">;

const blankSnack: SnackForm = {
  name: "",
  price: 50,
  color: "classic",
  weight: "",
  imageUrl: "",
  description: "",
  icon: "",
  isPublished: true,
  sortOrder: 0,
};

const defaultSettings: Settings = {
  announcement: "Made in Sri Lanka · Shared everywhere",
  heroTitle: "A little joy, packed fresh.",
  heroSubtitle: "Familiar flavours and satisfying crunch for tea breaks, school bags, and every in-between moment.",
  aboutTitle: "Good ingredients. Good company.",
  aboutBody: "We make snacks with care in Sri Lanka, bringing quality and warmth to the everyday.",
};

export default function AdminPanel() {
  const { user, loading, logout } = useAuth();
  const [section, setSection] = useState<"catalog" | "site">("catalog");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Snack | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<SnackForm>(blankSnack);
  const [settingsForm, setSettingsForm] = useState<Settings>(defaultSettings);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === "admin";
  const snacksQuery = trpc.catalog.adminList.useQuery(undefined, { enabled: isAdmin });
  const settingsQuery = trpc.catalog.adminSettings.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const createSnack = trpc.catalog.create.useMutation({ onSuccess: refreshCatalog });
  const updateSnack = trpc.catalog.update.useMutation({ onSuccess: refreshCatalog });
  const removeSnack = trpc.catalog.remove.useMutation({ onSuccess: refreshCatalog });
  const uploadImage = trpc.catalog.uploadImage.useMutation();
  const updateSettings = trpc.catalog.updateSettings.useMutation({
    onSuccess: result => {
      if (result) setSettingsForm(result);
      toast.success("Site content saved");
      utils.catalog.publicSettings.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  function refreshCatalog() {
    setEditor(null);
    setIsCreating(false);
    toast.success("Catalog saved");
    utils.catalog.adminList.invalidate();
    utils.catalog.publicList.invalidate();
  }

  const snacks = (snacksQuery.data ?? []) as Snack[];
  const filteredSnacks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? snacks.filter(snack => `${snack.name} ${snack.color} ${snack.price}`.toLowerCase().includes(term)) : snacks;
  }, [search, snacks]);
  const publishedCount = snacks.filter(snack => snack.isPublished).length;
  const imageCount = snacks.filter(snack => snack.imageUrl).length;

  useEffect(() => {
    if (settingsQuery.data) setSettingsForm(settingsQuery.data as Settings);
  }, [settingsQuery.data]);

  if (loading) return <LoadingScreen />;
  if (!user) return <AccessScreen title="Welcome to Kanta Studio" message="Sign in with the owner account to manage the public catalog." action="Sign in" onAction={startLogin} />;
  if (!isAdmin) return <AccessScreen title="This space is private" message="Your account is signed in, but it does not have owner access to Kanta Studio." action="Back to Kanta" onAction={() => { window.location.href = "/"; }} />;

  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <div className="studio-brand">
          <div className="studio-mark"><ChefHat size={18} /></div>
          <div><strong>Kanta</strong><span>Studio</span></div>
        </div>
        <div className="studio-owner-card">
          <span className="eyebrow">Owner workspace</span>
          <strong>{user.name || "Kanta owner"}</strong>
          <span>{user.email || "Authenticated owner"}</span>
        </div>
        <nav className="studio-nav" aria-label="Admin sections">
          <button className={section === "catalog" ? "active" : ""} onClick={() => setSection("catalog")}><PackagePlus size={17} /> Catalog <ChevronRight size={15} /></button>
          <button className={section === "site" ? "active" : ""} onClick={() => setSection("site")}><Settings2 size={17} /> Site content <ChevronRight size={15} /></button>
        </nav>
        <div className="studio-sidebar-bottom">
          <a href="/" target="_blank" rel="noreferrer"><ArrowUpRight size={16} /> View public site</a>
          <button onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      <main className="studio-main">
        <header className="studio-topbar">
          <div><span className="eyebrow">Kanta Studio / {section === "catalog" ? "Catalog" : "Site content"}</span><h1>{section === "catalog" ? "The snack shelf" : "Shape the storefront"}</h1></div>
          <div className="studio-top-actions"><span className="status-pill"><span /> Live changes</span><a className="icon-link" href="/" target="_blank" rel="noreferrer" aria-label="Open public site"><ArrowUpRight size={18} /></a></div>
        </header>

        {section === "catalog" ? (
          <CatalogSection
            snacks={filteredSnacks}
            allCount={snacks.length}
            publishedCount={publishedCount}
            imageCount={imageCount}
            search={search}
            setSearch={setSearch}
            onAdd={() => { setForm(blankSnack); setIsCreating(true); setEditor(null); }}
            onEdit={snack => { setForm({ ...snack, weight: snack.weight ?? "", imageUrl: snack.imageUrl ?? "", icon: snack.icon ?? "" }); setEditor(snack); setIsCreating(false); }}
            onDelete={snack => { if (window.confirm(`Remove ${snack.name} from the catalog?`)) removeSnack.mutate({ id: snack.id }); }}
            onToggle={snack => updateSnack.mutate({ ...snack, isPublished: !snack.isPublished, weight: snack.weight, imageUrl: snack.imageUrl, icon: snack.icon })}
            loading={snacksQuery.isLoading}
          />
        ) : (
          <SiteContentSection
            form={settingsForm}
            setForm={setSettingsForm}
            loading={settingsQuery.isLoading}
            saving={updateSettings.isPending}
            onSave={() => updateSettings.mutate(settingsForm)}
          />
        )}

        {(isCreating || editor) && (
          <SnackEditor
            form={form}
            setForm={setForm}
            isCreating={isCreating}
            uploading={uploading}
            fileInputRef={fileInputRef}
            onClose={() => { setEditor(null); setIsCreating(false); }}
            onUpload={async file => {
              setUploading(true);
              try {
                const dataUrl = await readFileAsDataUrl(file);
                const result = await uploadImage.mutateAsync({ fileName: file.name, contentType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", dataBase64: dataUrl.split(",")[1] ?? "" });
                setForm(current => ({ ...current, imageUrl: result.url }));
                toast.success("Image uploaded");
              } catch (error) { toast.error(error instanceof Error ? error.message : "Could not upload image"); }
              finally { setUploading(false); }
            }}
            onSave={() => {
              const payload = { ...form, price: Number(form.price), sortOrder: Number(form.sortOrder), weight: form.weight || null, imageUrl: form.imageUrl || null, icon: form.icon || null };
              if (isCreating) createSnack.mutate(payload); else if (editor) updateSnack.mutate({ ...payload, id: editor.id });
            }}
            saving={createSnack.isPending || updateSnack.isPending}
          />
        )}
      </main>
    </div>
  );
}

function CatalogSection({ snacks, allCount, publishedCount, imageCount, search, setSearch, onAdd, onEdit, onDelete, onToggle, loading }: { snacks: Snack[]; allCount: number; publishedCount: number; imageCount: number; search: string; setSearch: (value: string) => void; onAdd: () => void; onEdit: (snack: Snack) => void; onDelete: (snack: Snack) => void; onToggle: (snack: Snack) => void; loading: boolean; }) {
  return <>
    <div className="stats-grid"><Stat label="Total snacks" value={allCount} note="Across every price point" icon={<LayoutDashboard size={18} />} /><Stat label="Published" value={publishedCount} note="Visible on the public site" icon={<Check size={18} />} accent /><Stat label="With imagery" value={imageCount} note="Ready for the shelf" icon={<ImagePlus size={18} />} /></div>
    <div className="section-toolbar"><div className="search-field"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search snacks, colours, prices" aria-label="Search snacks" />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}</div><Button onClick={onAdd} className="add-button"><Plus size={17} /> Add snack</Button></div>
    <div className="catalog-heading"><div><span className="eyebrow">Editable catalog</span><h2>{search ? `${snacks.length} matching snacks` : "Everyday favourites"}</h2></div><span className="muted-label">Changes publish instantly</span></div>
    {loading ? <div className="empty-state"><div className="loading-orb" /><p>Loading the snack shelf…</p></div> : snacks.length === 0 ? <div className="empty-state"><CircleAlert size={24} /><p>No snacks match this search.</p></div> : <div className="snack-grid">{snacks.map(snack => <article className={`snack-admin-card ${!snack.isPublished ? "is-hidden" : ""}`} key={snack.id}><div className="snack-card-image">{snack.imageUrl ? <img src={snack.imageUrl} alt="" /> : <div className="image-placeholder"><ImagePlus size={22} /><span>Needs image</span></div>}<span className={`visibility-badge ${snack.isPublished ? "published" : "draft"}`}>{snack.isPublished ? "Live" : "Hidden"}</span></div><div className="snack-card-content"><div className="snack-card-title"><div><span className="snack-color">{snack.color}</span><h3>{snack.name}</h3></div><strong>Rs. {snack.price}</strong></div><p>{snack.description}</p><div className="snack-card-footer"><label className="publish-toggle"><Switch checked={snack.isPublished} onCheckedChange={() => onToggle(snack)} /><span>{snack.isPublished ? "Published" : "Hidden"}</span></label><div className="card-actions"><button onClick={() => onEdit(snack)} aria-label={`Edit ${snack.name}`}><Pencil size={15} /></button><button onClick={() => onDelete(snack)} aria-label={`Delete ${snack.name}`}><Trash2 size={15} /></button></div></div></div></article>)}</div>}
  </>;
}

function SnackEditor({ form, setForm, isCreating, uploading, fileInputRef, onClose, onUpload, onSave, saving }: { form: SnackForm; setForm: React.Dispatch<React.SetStateAction<SnackForm>>; isCreating: boolean; uploading: boolean; fileInputRef: React.RefObject<HTMLInputElement | null>; onClose: () => void; onUpload: (file: File) => void; onSave: () => void; saving: boolean; }) {
  const update = (field: keyof SnackForm, value: string | number | boolean) => setForm(current => ({ ...current, [field]: value }));
  return <div className="editor-drawer"><div className="drawer-header"><div><span className="eyebrow">{isCreating ? "New catalog item" : "Edit catalog item"}</span><h2>{isCreating ? "Add a snack" : form.name}</h2></div><button className="drawer-close" onClick={onClose} aria-label="Close editor"><X /></button></div><div className="drawer-body"><div className="image-upload-box"><div className="editor-preview">{form.imageUrl ? <img src={form.imageUrl} alt="Snack preview" /> : <ImagePlus size={30} />}</div><div><strong>Product image</strong><p>JPG, PNG, WEBP or GIF · max 6 MB</p><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file); }} /><Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? "Uploading…" : <><Upload size={15} /> Upload image</>}</Button></div></div><div className="form-grid"><Field label="Snack name" value={form.name} onChange={value => update("name", value)} placeholder="e.g. Super Ball" /><Field label="Price (Rs.)" type="number" value={form.price} onChange={value => update("price", Number(value))} /><Field label="Colour / variant" value={form.color} onChange={value => update("color", value)} placeholder="e.g. Blue" /><Field label="Weight" value={form.weight ?? ""} onChange={value => update("weight", value)} placeholder="e.g. 50g" /><Field label="Display order" type="number" value={form.sortOrder} onChange={value => update("sortOrder", Number(value))} /><Field label="Fallback icon" value={form.icon ?? ""} onChange={value => update("icon", value)} placeholder="Optional" /></div><label className="form-label">Description<textarea value={form.description} onChange={event => update("description", event.target.value)} rows={5} placeholder="Tell customers what makes this snack special." /></label><label className="editor-publish"><Switch checked={form.isPublished} onCheckedChange={checked => update("isPublished", checked)} /><span><strong>Publish to public site</strong><small>Hidden snacks stay in your studio until you are ready.</small></span></label></div><div className="drawer-footer"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={saving || !form.name.trim() || !form.description.trim()}>{saving ? "Saving…" : <><Check size={16} /> Save snack</>}</Button></div></div>;
}

function SiteContentSection({ form, setForm, loading, saving, onSave }: { form: Settings; setForm: React.Dispatch<React.SetStateAction<Settings>>; loading: boolean; saving: boolean; onSave: () => void; }) {
  const update = (field: keyof Settings, value: string) => setForm(current => ({ ...current, [field]: value }));
  if (loading) return <div className="empty-state"><div className="loading-orb" /><p>Loading site content…</p></div>;
  return <div className="content-editor"><div className="content-editor-intro"><div><span className="eyebrow">Public copy</span><h2>Keep the storefront feeling fresh.</h2><p>These fields update the public homepage without changing the separate studio workspace.</p></div><Button onClick={onSave} disabled={saving}><Check size={16} /> {saving ? "Saving…" : "Save changes"}</Button></div><div className="settings-form"><Field label="Announcement bar" value={form.announcement} onChange={value => update("announcement", value)} /><Field label="Hero title" value={form.heroTitle} onChange={value => update("heroTitle", value)} /><label className="form-label">Hero subtitle<textarea value={form.heroSubtitle} onChange={event => update("heroSubtitle", event.target.value)} rows={4} /></label><Field label="Story title" value={form.aboutTitle} onChange={value => update("aboutTitle", value)} /><label className="form-label">Story body<textarea value={form.aboutBody} onChange={event => update("aboutBody", event.target.value)} rows={5} /></label></div></div>;
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string; }) { return <label className="form-label">{label}<input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>; }
function Stat({ label, value, note, icon, accent = false }: { label: string; value: number; note: string; icon: React.ReactNode; accent?: boolean; }) { return <div className={`stat-card ${accent ? "accent" : ""}`}><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function AccessScreen({ title, message, action, onAction }: { title: string; message: string; action: string; onAction: () => void; }) { return <div className="access-screen"><div className="access-card"><div className="studio-mark large"><ChefHat size={26} /></div><span className="eyebrow">Kanta Studio</span><h1>{title}</h1><p>{message}</p><Button onClick={onAction}>{action}</Button><a href="/">Return to public site</a></div></div>; }
function LoadingScreen() { return <div className="access-screen"><div className="loading-orb" /><p>Opening Kanta Studio…</p></div>; }
function readFileAsDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); }
