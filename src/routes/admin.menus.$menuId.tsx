import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Camera,
  Check,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  Plus,
  Rocket,
  Sparkles,
  Tag as TagIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";
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
import { pageHead } from "@/lib/pewa/metadata";
import {
  getExistingMenuTags,
  getRecommendedSectionsForCategory,
  getRecommendedTagsForCategory,
  PROTOTYPE_IMAGE_LIBRARY,
} from "@/lib/pewa/taxonomy";

export const Route = createFileRoute("/admin/menus/$menuId")({
  head: () =>
    pageHead(
      "Edit business menu",
      "Create sections, edit offerings and publish your menu on PEWA.",
    ),
  component: MenuEditor,
});

type Draft = Omit<Offering, "id" | "modifiers"> & { id?: string; modifiersText: string };

const emptyDraft: Draft = {
  name: "",
  description: "",
  price: 0,
  tags: [],
  available: true,
  emoji: "🍽️",
  modifiersText: "",
  image: undefined,
};

const modsToText = (m: ModifierGroup[]) =>
  m
    .map(
      (g) =>
        `${g.name}: ${g.options.map((o) => (o.priceDelta ? `${o.name} +${o.priceDelta}` : o.name)).join(", ")}`,
    )
    .join("\n");

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
            return {
              id: `o${gi}_${oi}`,
              name: m ? (m[1] ?? o) : o,
              priceDelta: m ? Number(m[2]) : 0,
            };
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
  const [customTagInput, setCustomTagInput] = useState("");
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!menu)
    return (
      <p className="p-6">
        Menu not found.{" "}
        <Link to="/admin" className="underline">
          Back
        </Link>
      </p>
    );

  const itemCount = menu.sections.reduce((n, x) => n + x.offerings.length, 0);
  const categoryContext = venue?.category || s.organisation?.category || venue?.businessType || "";
  const recommendedSections = getRecommendedSectionsForCategory(categoryContext);
  const recommendedTags = getRecommendedTagsForCategory(categoryContext);
  const existingMenuTags = getExistingMenuTags(menu);

  const save = () => {
    if (!editing) return;
    const { modifiersText, ...d } = editing.draft;
    if (!d.name.trim() || !(d.price >= 0)) {
      toast.error("Add a name and price");
      return;
    }
    s.upsertOffering(menu.id, editing.sectionId, { ...d, modifiers: textToMods(modifiersText) });
    setEditing(null);
  };

  const addTagToDraft = (tag: string) => {
    const clean = tag.trim();
    if (!clean || !editing) return;
    if (editing.draft.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) return;
    setEditing({
      ...editing,
      draft: { ...editing.draft, tags: [...editing.draft.tags, clean] },
    });
  };

  const removeTagFromDraft = (tag: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      draft: { ...editing.draft, tags: editing.draft.tags.filter((t) => t !== tag) },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setEditing({
          ...editing,
          draft: { ...editing.draft, image: result },
        });
        toast.success("Photo attached to item");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pt-4 pb-20">
      <div className="flex items-center gap-2 pr-28">
        <Link
          to="/admin"
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <StatusBadge status={menu.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold">{menu.name}</h1>
        {categoryContext && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {categoryContext}
          </span>
        )}
      </div>

      {!author && (
        <p className="mt-1 text-sm text-muted-foreground">
          You can mark items sold out. Editing and publishing need a manager.
        </p>
      )}

      {author && (
        <div className="sticky top-0 z-30 -mx-4 mt-4 flex gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
          {menu.status !== "published" ? (
            <Button
              className="h-12 flex-1 text-base font-semibold"
              disabled={itemCount === 0}
              onClick={() => {
                s.setMenuStatus(menu.id, "published");
                toast.success("Published — your menu is live now", {
                  action: venue
                    ? { label: "View", onClick: () => window.open(`/m/${venue.slug}`, "_self") }
                    : undefined,
                });
              }}
            >
              <Rocket className="h-5 w-5" />{" "}
              {itemCount === 0 ? "Add an item to publish" : "Publish now"}
            </Button>
          ) : (
            <>
              {venue && (
                <Button asChild className="h-12 flex-1 font-semibold">
                  <Link to="/m/$slug" params={{ slug: venue.slug }}>
                    View live menu
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                className="h-12"
                onClick={() => s.setMenuStatus(menu.id, "hidden")}
              >
                <EyeOff className="h-4 w-4" /> Hide
              </Button>
            </>
          )}
        </div>
      )}

      <div className="mt-5 space-y-6">
        {menu.sections.length === 0 && (
          <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
            Start with a section, like “Coffee” or “Breakfast”. Choose a suggested section below or
            type your own.
          </p>
        )}

        {menu.sections.map((sec, i) => (
          <section key={sec.id} className="rounded-2xl border bg-card shadow-xs">
            <header className="flex items-center gap-1 border-b p-3">
              {author ? (
                <Input
                  defaultValue={sec.name}
                  onBlur={(e) => s.renameSection(menu.id, sec.id, e.target.value || sec.name)}
                  className="h-10 flex-1 border-transparent font-display text-lg shadow-none"
                />
              ) : (
                <h2 className="flex-1 px-2 text-lg font-semibold">{sec.name}</h2>
              )}
              {author && (
                <>
                  <IconBtn
                    label="Move up"
                    disabled={i === 0}
                    onClick={() => s.moveSection(menu.id, sec.id, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    label="Move down"
                    disabled={i === menu.sections.length - 1}
                    onClick={() => s.moveSection(menu.id, sec.id, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    label="Delete section"
                    onClick={() =>
                      confirm(`Delete “${sec.name}”?`) && s.removeSection(menu.id, sec.id)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </>
              )}
            </header>
            <ul className="divide-y">
              {sec.offerings.map((o) => (
                <li key={o.id} className="flex items-center gap-3 p-3">
                  {o.image ? (
                    <img
                      src={o.image}
                      alt={o.name}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover border"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                      {o.emoji}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-medium ${o.available ? "" : "text-muted-foreground line-through"}`}
                    >
                      {o.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(o.price, currency)}
                      {o.modifiers.length > 0 &&
                        ` · ${o.modifiers.length} option group${o.modifiers.length > 1 ? "s" : ""}`}
                    </p>
                    {o.tags && o.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {o.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {canToggleAvailability(s.role) && (
                    <label className="flex flex-col items-center text-[10px] text-muted-foreground">
                      <Switch
                        checked={o.available}
                        onCheckedChange={() => s.toggleAvailability(menu.id, sec.id, o.id)}
                        aria-label="Available"
                      />
                      {o.available ? "On" : "Sold out"}
                    </label>
                  )}
                  {author && (
                    <IconBtn
                      label="Edit"
                      onClick={() =>
                        setEditing({
                          sectionId: sec.id,
                          draft: { ...o, modifiersText: modsToText(o.modifiers) },
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </IconBtn>
                  )}
                </li>
              ))}
            </ul>
            {author && (
              <button
                onClick={() => setEditing({ sectionId: sec.id, draft: { ...emptyDraft } })}
                className="flex min-h-12 w-full items-center justify-center gap-2 border-t text-sm font-semibold text-primary hover:bg-muted/40 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add item
              </button>
            )}
          </section>
        ))}

        {author && (
          <div className="space-y-4 rounded-2xl border bg-card/60 p-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Suggested sections for your {categoryContext || "menu"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recommendedSections
                  .filter(
                    (rec) =>
                      !menu.sections.some(
                        (sec) => sec.name.trim().toLowerCase() === rec.trim().toLowerCase(),
                      ),
                  )
                  .slice(0, 6)
                  .map((rec) => (
                    <button
                      key={rec}
                      type="button"
                      onClick={() => s.addSection(menu.id, rec)}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 active:scale-98 transition-all"
                    >
                      <Plus className="h-3 w-3" /> {rec}
                    </button>
                  ))}
              </div>
            </div>

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!sectionName.trim()) return;
                s.addSection(menu.id, sectionName.trim());
                setSectionName("");
              }}
            >
              <Input
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="Custom section name (e.g. Nyama Choma, Specials)"
                className="h-12"
              />
              <Button type="submit" variant="secondary" className="h-12 shrink-0 font-semibold">
                <Plus className="h-4 w-4" /> Section
              </Button>
            </form>
          </div>
        )}
      </div>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[92vh] overflow-y-auto rounded-t-3xl sm:mx-auto sm:max-w-lg"
        >
          <SheetHeader className="px-0 text-left">
            <SheetTitle className="font-display text-2xl">
              {editing?.draft.id ? "Edit item" : "New item"}
            </SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 pb-safe pt-2">
              {/* Media Selection: Image Library & User Upload */}
              <div className="rounded-2xl border bg-muted/30 p-3">
                <Label className="mb-2 block font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Photo & Icon
                </Label>
                <div className="flex items-center gap-3">
                  {editing.draft.image ? (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border">
                      <img
                        src={editing.draft.image}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            draft: { ...editing.draft, image: undefined },
                          })
                        }
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16">
                      <Input
                        value={editing.draft.emoji}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            draft: { ...editing.draft, emoji: e.target.value },
                          })
                        }
                        className="h-14 text-center text-2xl"
                        title="Emoji Icon"
                      />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowImageLibrary(!showImageLibrary)}
                        className="h-9 flex-1 text-xs"
                      >
                        <ImageIcon className="mr-1.5 h-3.5 w-3.5 text-primary" />
                        Library
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 flex-1 text-xs"
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5 text-primary" />
                        Upload
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {editing.draft.image
                        ? "Photo attached. Tap × to revert to emoji."
                        : "Pick from curated library or upload your own image."}
                    </p>
                  </div>
                </div>

                {/* Inline Curated Prototype Image Library Grid */}
                {showImageLibrary && (
                  <div className="mt-3 rounded-xl border bg-card p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold">Curated Prototype Library</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setShowImageLibrary(false)}
                      >
                        Close
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {PROTOTYPE_IMAGE_LIBRARY.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setEditing({
                              ...editing,
                              draft: { ...editing.draft, image: item.url },
                            });
                            setShowImageLibrary(false);
                            toast.success(`Attached "${item.title}"`);
                          }}
                          className="group relative flex flex-col items-start rounded-lg border p-1 text-left hover:border-primary transition-all"
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            className="h-16 w-full rounded-md object-cover"
                          />
                          <span className="mt-1 line-clamp-1 text-[11px] font-medium group-hover:text-primary">
                            {item.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-1.5 block">Name</Label>
                <Input
                  autoFocus
                  value={editing.draft.name}
                  onChange={(e) =>
                    setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })
                  }
                  className="h-12 text-base"
                  placeholder="e.g. Cappuccino or Sourdough Loaf"
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Price ({currency})</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={editing.draft.price || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, price: Number(e.target.value) },
                    })
                  }
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Description</Label>
                <Textarea
                  value={editing.draft.description}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, description: e.target.value },
                    })
                  }
                  rows={2}
                  placeholder="Describe ingredients, preparation, origin..."
                />
              </div>

              {/* Descriptive Tags Engine */}
              <div className="space-y-2 rounded-2xl border p-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TagIcon className="h-3.5 w-3.5 text-primary" />
                    Descriptive Tags & Dietaries
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {editing.draft.tags.length} assigned
                  </span>
                </div>

                {/* Assigned Tag Chips with Dismiss */}
                {editing.draft.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editing.draft.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-1 text-xs font-medium"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTagFromDraft(t)}
                          aria-label={`Remove tag ${t}`}
                          className="hover:text-primary-foreground hover:bg-primary rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No tags yet. Select suggested tags or create custom ones below.
                  </p>
                )}

                {/* Custom Tag Input */}
                <div className="flex gap-1.5 pt-1">
                  <Input
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customTagInput.trim()) {
                          addTagToDraft(customTagInput);
                          setCustomTagInput("");
                        }
                      }
                    }}
                    placeholder="Create custom tag (e.g. Sourdough, Keto, Halal)"
                    className="h-10 text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 shrink-0 text-xs"
                    onClick={() => {
                      if (customTagInput.trim()) {
                        addTagToDraft(customTagInput);
                        setCustomTagInput("");
                      }
                    }}
                  >
                    + Tag
                  </Button>
                </div>

                {/* Menu Tag Reuse (Tags already used in this menu) */}
                {existingMenuTags.filter((t) => !editing.draft.tags.includes(t)).length > 0 && (
                  <div className="pt-2 border-t mt-2">
                    <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Reuse tags from this menu:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {existingMenuTags
                        .filter((t) => !editing.draft.tags.includes(t))
                        .map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => addTagToDraft(t)}
                            className="rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            + {t}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Suggested Tags based on Category */}
                <div className="pt-2 border-t mt-2">
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Suggested tags:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {recommendedTags
                      .filter((t) => !editing.draft.tags.includes(t))
                      .slice(0, 8)
                      .map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => addTagToDraft(t)}
                          className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/10 transition-colors"
                        >
                          + {t}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">Options & Modifiers</Label>
                <Textarea
                  value={editing.draft.modifiersText}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, modifiersText: e.target.value },
                    })
                  }
                  rows={3}
                  placeholder={"Milk: Whole, Oat +50, Almond +60\nExtras: Extra shot +70"}
                  className="font-mono text-xs"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  One group per line. “+50” adds to the price.
                </p>
              </div>

              <label className="flex min-h-11 items-center justify-between rounded-xl border px-3">
                <span className="text-sm font-medium">Available now</span>
                <Switch
                  checked={editing.draft.available}
                  onCheckedChange={(v) =>
                    setEditing({ ...editing, draft: { ...editing.draft, available: v } })
                  }
                />
              </label>

              <div className="flex gap-2 pt-2">
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
                <Button className="h-12 flex-1 text-base font-semibold" onClick={save}>
                  Save item
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function IconBtn({
  label,
  children,
  ...rest
}: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30"
      {...rest}
    >
      {children}
    </button>
  );
}
