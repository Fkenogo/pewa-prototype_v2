import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, EyeOff, Pencil, Plus, Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { canAuthorMenus, canToggleAvailability, formatPrice, usePewa } from "@/lib/pewa/store";
import type { ModifierGroup, Offering } from "@/lib/pewa/types";
import { StatusBadge } from "@/components/pewa/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/menus/$menuId")({
  component: MenuEditor,
});

type Draft = Omit<Offering, "id" | "modifiers"> & { id?: string; modifiersText: string };

const emptyDraft: Draft = { name: "", description: "", price: 0, tags: [], available: true, emoji: "🍽️", modifiersText: "" };

const modsToText = (m: ModifierGroup[]) =>
  m.map((g) => `${g.name}: ${g.options.map((o) => (o.priceDelta ? `${o.name} +${o.priceDelta}` : o.name)).join(", ")}`).join("\n");

const textToMods = (t: string): ModifierGroup[] =>
  t
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes(":"))
    .map((l, gi) => {
      const [name, rest] = [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1)];
      return {
        id: `g${gi}_${name}`,
        name,
        options: rest
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
          .map((o, oi) => {
            const m = o.match(/^(.*?)\s*\+\s*(\d+(?:\.\d+)?)$/);
            return { id: `o${gi}_${oi}`, name: m ? m[1] : o, priceDelta: m ? Number(m[2]) : 0 };
          }),
      };
    });

function MenuEditor() {
  const { menuId } = Route.useParams();
  const s = usePewa();
  const menu = s.menus.find((m) => m.id === menuId && m.orgId === s.organisation?.id);
  const venue = s.venues.find((v) => v.orgId === s.organisation?.id);
  const currency = s.organisation?.currency ?? "KES";
  const author = canAuthorMenus(s.role);
  const [sectionName, setSectionName] = useState("");
  const [editing, setEditing] = useState<{ sectionId: string; draft: Draft } | null>(null);

  if (!menu) return <p className="p-6">Menu not found. <Link to="/admin" className="underline">Back</Link></p>;
  const itemCount = menu.sections.reduce((n, x) => n + x.offerings.length, 0);

  const save = () => {
    if (!editing) return;
    const { modifiersText, ...d } = editing.draft;
    if (!d.name.trim() || !(d.price >= 0)) return toast.error("Add a name and price");
    s.upsertOffering(menu.id, editing.sectionId, { ...d, modifiers: textToMods(modifiersText) });
    setEditing(null);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pt-4">
      <div className="flex items-center gap-2 pr-28">
        <Link to="/admin" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <StatusBadge status={menu.status} />
      </div>
      <h1 className="mt-2 text-3xl">{menu.name}</h1>
      {!author && <p className="mt-1 text-sm text-muted-foreground">You can mark items sold out. Editing and publishing need a manager.</p>}

      {author && (
        <div className="sticky top-0 z-30 -mx-4 mt-4 flex gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
          {menu.status !== "published" ? (
            <Button
              className="h-12 flex-1 text-base"
              disabled={itemCount === 0}
              onClick={() => {
                s.setMenuStatus(menu.id, "published");
                toast.success("Published — your menu is live now", {
                  action: venue ? { label: "View", onClick: () => window.open(`/m/${venue.slug}`, "_self") } : undefined,
                });
              }}
            >
              <Rocket className="h-5 w-5" /> {itemCount === 0 ? "Add an item to publish" : "Publish now"}
            </Button>
          ) : (
            <>
              {venue && (
                <Button asChild className="h-12 flex-1">
                  <Link to="/m/$slug" params={{ slug: venue.slug }}>View live menu</Link>
                </Button>
              )}
              <Button variant="outline" className="h-12" onClick={() => s.setMenuStatus(menu.id, "hidden")}>
                <EyeOff className="h-4 w-4" /> Hide
              </Button>
            </>
          )}
        </div>
      )}

      <div className="mt-5 space-y-5">
        {menu.sections.length === 0 && (
          <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">Start with a section, like “Coffee” or “Breakfast”.</p>
        )}
        {menu.sections.map((sec, i) => (
          <section key={sec.id} className="rounded-2xl border bg-card">
            <header className="flex items-center gap-1 border-b p-3">
              {author ? (
                <Input defaultValue={sec.name} onBlur={(e) => s.renameSection(menu.id, sec.id, e.target.value || sec.name)} className="h-10 flex-1 border-transparent font-display text-lg shadow-none" />
              ) : (
                <h2 className="flex-1 px-2 text-lg">{sec.name}</h2>
              )}
              {author && (
                <>
                  <IconBtn label="Move up" disabled={i === 0} onClick={() => s.moveSection(menu.id, sec.id, -1)}><ArrowUp className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Move down" disabled={i === menu.sections.length - 1} onClick={() => s.moveSection(menu.id, sec.id, 1)}><ArrowDown className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Delete section" onClick={() => confirm(`Delete “${sec.name}”?`) && s.removeSection(menu.id, sec.id)}><Trash2 className="h-4 w-4" /></IconBtn>
                </>
              )}
            </header>
            <ul className="divide-y">
              {sec.offerings.map((o) => (
                <li key={o.id} className="flex items-center gap-3 p-3">
                  <span className="text-2xl">{o.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-medium ${o.available ? "" : "text-muted-foreground line-through"}`}>{o.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(o.price, currency)}
                      {o.modifiers.length > 0 && ` · ${o.modifiers.length} option group${o.modifiers.length > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  {canToggleAvailability(s.role) && (
                    <label className="flex flex-col items-center text-[10px] text-muted-foreground">
                      <Switch checked={o.available} onCheckedChange={() => s.toggleAvailability(menu.id, sec.id, o.id)} aria-label="Available" />
                      {o.available ? "On" : "Sold out"}
                    </label>
                  )}
                  {author && (
                    <IconBtn label="Edit" onClick={() => setEditing({ sectionId: sec.id, draft: { ...o, modifiersText: modsToText(o.modifiers) } })}>
                      <Pencil className="h-4 w-4" />
                    </IconBtn>
                  )}
                </li>
              ))}
            </ul>
            {author && (
              <button onClick={() => setEditing({ sectionId: sec.id, draft: { ...emptyDraft } })} className="flex min-h-12 w-full items-center justify-center gap-2 border-t text-sm font-semibold text-primary">
                <Plus className="h-4 w-4" /> Add item
              </button>
            )}
          </section>
        ))}

        {author && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!sectionName.trim()) return;
              s.addSection(menu.id, sectionName.trim());
              setSectionName("");
            }}
          >
            <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="New section name" className="h-12" />
            <Button type="submit" variant="secondary" className="h-12"><Plus className="h-4 w-4" /> Section</Button>
          </form>
        )}
      </div>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl sm:mx-auto sm:max-w-lg">
          <SheetHeader className="px-0 text-left">
            <SheetTitle className="font-display text-2xl">{editing?.draft.id ? "Edit item" : "New item"}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 pb-safe">
              <div className="flex gap-2">
                <div className="w-20">
                  <Label className="mb-1.5 block">Icon</Label>
                  <Input value={editing.draft.emoji} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, emoji: e.target.value } })} className="h-12 text-center text-xl" />
                </div>
                <div className="flex-1">
                  <Label className="mb-1.5 block">Name</Label>
                  <Input autoFocus value={editing.draft.name} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })} className="h-12 text-base" placeholder="e.g. Cappuccino" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Price ({currency})</Label>
                <Input type="number" inputMode="decimal" min={0} value={editing.draft.price || ""} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, price: Number(e.target.value) } })} className="h-12 text-base" />
              </div>
              <div>
                <Label className="mb-1.5 block">Description</Label>
                <Textarea value={editing.draft.description} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, description: e.target.value } })} rows={2} />
              </div>
              <div>
                <Label className="mb-1.5 block">Tags (comma separated)</Label>
                <Input value={editing.draft.tags.join(", ")} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) } })} className="h-12" placeholder="Vegan, Hot" />
              </div>
              <div>
                <Label className="mb-1.5 block">Options</Label>
                <Textarea
                  value={editing.draft.modifiersText}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, modifiersText: e.target.value } })}
                  rows={3}
                  placeholder={"Milk: Whole, Oat +50, Almond +60\nExtras: Extra shot +70"}
                  className="font-mono text-xs"
                />
                <p className="mt-1 text-xs text-muted-foreground">One group per line. “+50” adds to the price.</p>
              </div>
              <label className="flex min-h-11 items-center justify-between rounded-xl border px-3">
                <span className="text-sm font-medium">Available now</span>
                <Switch checked={editing.draft.available} onCheckedChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, available: v } })} />
              </label>
              <div className="flex gap-2">
                {editing.draft.id && (
                  <Button
                    variant="outline"
                    className="h-12"
                    onClick={() => {
                      s.removeOffering(menu.id, editing.sectionId, editing.draft.id!);
                      setEditing(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button className="h-12 flex-1 text-base" onClick={save}>Save item</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function IconBtn({ label, children, ...rest }: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30" {...rest}>
      {children}
    </button>
  );
}
