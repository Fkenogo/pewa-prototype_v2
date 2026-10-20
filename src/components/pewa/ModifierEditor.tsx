import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles, Check, AlertCircle } from "lucide-react";
import type { ModifierGroup, ModifierOption } from "@/lib/pewa/types";
import { formatPrice, validateModifierGroupConfig } from "@/lib/pewa/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export interface ModifierPreset {
  name: string;
  selectionType: "single" | "multiple";
  required: boolean;
  options: { name: string; priceDelta: number }[];
}

export const MODIFIER_PRESETS: { id: string; label: string; preset: ModifierPreset }[] = [
  {
    id: "coffee_size",
    label: "Coffee Size",
    preset: {
      name: "Size",
      selectionType: "single",
      required: true,
      options: [
        { name: "Regular / Small", priceDelta: 0 },
        { name: "Medium", priceDelta: 40 },
        { name: "Large", priceDelta: 80 },
      ],
    },
  },
  {
    id: "milk_choice",
    label: "Milk Choice",
    preset: {
      name: "Milk",
      selectionType: "single",
      required: false,
      options: [
        { name: "Whole Dairy Milk", priceDelta: 0 },
        { name: "Oat Milk", priceDelta: 50 },
        { name: "Almond Milk", priceDelta: 60 },
        { name: "Soy Milk", priceDelta: 50 },
      ],
    },
  },
  {
    id: "burger_extras",
    label: "Extras & Add-ons",
    preset: {
      name: "Extras",
      selectionType: "multiple",
      required: false,
      options: [
        { name: "Cheddar Cheese Slice", priceDelta: 60 },
        { name: "Crispy Beef Bacon", priceDelta: 100 },
        { name: "Jalapeño Peppers", priceDelta: 40 },
        { name: "Extra House Sauce", priceDelta: 30 },
      ],
    },
  },
  {
    id: "temperature",
    label: "Serving Temperature",
    preset: {
      name: "Temperature",
      selectionType: "single",
      required: false,
      options: [
        { name: "Hot / Freshly Steamed", priceDelta: 0 },
        { name: "Iced / Over Cubes", priceDelta: 30 },
      ],
    },
  },
  {
    id: "doneness",
    label: "Preparation / Doneness",
    preset: {
      name: "Preparation",
      selectionType: "single",
      required: true,
      options: [
        { name: "Medium Rare", priceDelta: 0 },
        { name: "Medium", priceDelta: 0 },
        { name: "Well Done", priceDelta: 0 },
      ],
    },
  },
];

export function ModifierEditor({
  modifiers,
  onChange,
  currency = "KES",
}: {
  modifiers: ModifierGroup[];
  onChange: (mods: ModifierGroup[]) => void;
  currency?: string;
}) {
  const [newGroupName, setNewGroupName] = useState("");

  const addGroup = (preset?: ModifierPreset) => {
    const name = preset ? preset.name : newGroupName.trim() || "New Choice Group";
    const group: ModifierGroup = {
      id: uid("mod"),
      name,
      selectionType: preset?.selectionType ?? "single",
      required: preset?.required ?? false,
      options: preset
        ? preset.options.map((o) => ({
            id: uid("opt"),
            name: o.name,
            priceDelta: o.priceDelta,
          }))
        : [
            { id: uid("opt"), name: "Standard", priceDelta: 0 },
            { id: uid("opt"), name: "Upgraded", priceDelta: 50 },
          ],
    };
    onChange([...modifiers, group]);
    setNewGroupName("");
  };

  const updateGroup = (groupId: string, updates: Partial<ModifierGroup>) => {
    onChange(modifiers.map((g) => (g.id === groupId ? { ...g, ...updates } : g)));
  };

  const removeGroup = (groupId: string) => {
    onChange(modifiers.filter((g) => g.id !== groupId));
  };

  const moveGroup = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= modifiers.length) return;
    const copy = [...modifiers];
    const item = copy[idx];
    if (!item) return;
    copy.splice(idx, 1);
    copy.splice(targetIdx, 0, item);
    onChange(copy);
  };

  const addOption = (groupId: string) => {
    onChange(
      modifiers.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: [...g.options, { id: uid("opt"), name: "", priceDelta: 0 }],
        };
      }),
    );
  };

  const updateOption = (groupId: string, optionId: string, updates: Partial<ModifierOption>) => {
    onChange(
      modifiers.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options.map((o) => (o.id === optionId ? { ...o, ...updates } : o)),
        };
      }),
    );
  };

  const removeOption = (groupId: string, optionId: string) => {
    onChange(
      modifiers.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options.filter((o) => o.id !== optionId),
        };
      }),
    );
  };

  const moveOption = (groupId: string, optIdx: number, dir: -1 | 1) => {
    onChange(
      modifiers.map((g) => {
        if (g.id !== groupId) return g;
        const targetIdx = optIdx + dir;
        if (targetIdx < 0 || targetIdx >= g.options.length) return g;
        const copy = [...g.options];
        const opt = copy[optIdx];
        if (!opt) return g;
        copy.splice(optIdx, 1);
        copy.splice(targetIdx, 0, opt);
        return { ...g, options: copy };
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Customise Options & Choices
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Configure sizes, milks, toppings, or meal options with price deltas.
          </p>
        </div>
        <span className="text-xs font-semibold text-primary">
          {modifiers.length} {modifiers.length === 1 ? "group" : "groups"}
        </span>
      </div>

      {/* Preset Quick-Add Chips */}
      <div className="rounded-xl border bg-muted/20 p-2.5">
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          1-Tap templates:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {MODIFIER_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addGroup(p.preset)}
              className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors shadow-2xs active:scale-95"
            >
              <Plus className="h-3 w-3 text-primary" />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Group List */}
      {modifiers.length === 0 ? (
        <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground italic">
          No options configured yet. Tap a template above or create a custom option group below.
        </div>
      ) : (
        <div className="space-y-3">
          {modifiers.map((group, gIdx) => {
            const isSingle = (group.selectionType ?? "single") === "single";
            return (
              <div
                key={group.id}
                className="rounded-2xl border bg-card shadow-2xs overflow-hidden transition-all"
              >
                {/* Header */}
                <div className="flex items-center gap-2 border-b bg-muted/40 p-2.5">
                  <div className="flex-1 min-w-0">
                    <Input
                      value={group.name}
                      onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                      placeholder="Group name (e.g. Size, Milk, Extras)"
                      className="h-8 font-semibold text-sm border-transparent bg-transparent shadow-none focus-visible:bg-background focus-visible:border-input"
                    />
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={gIdx === 0}
                      onClick={() => moveGroup(gIdx, -1)}
                      className="h-7 w-7 text-muted-foreground"
                      aria-label="Move group up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={gIdx === modifiers.length - 1}
                      onClick={() => moveGroup(gIdx, 1)}
                      className="h-7 w-7 text-muted-foreground"
                      aria-label="Move group down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeGroup(group.id)}
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      aria-label="Delete group"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Group Behavior Controls */}
                <div className="space-y-2 border-b px-3 py-2.5 bg-muted/15">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateGroup(group.id, {
                            selectionType: "single",
                            minSelections: undefined,
                            maxSelections: undefined,
                          })
                        }
                        className={cn(
                          "rounded-md px-2.5 py-1 font-medium transition-all text-xs",
                          isSingle
                            ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Single Choice (Radio)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateGroup(group.id, {
                            selectionType: "multiple",
                            minSelections: group.required ? 1 : 0,
                          })
                        }
                        className={cn(
                          "rounded-md px-2.5 py-1 font-medium transition-all text-xs",
                          !isSingle
                            ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Multiple Choice (Checkboxes)
                      </button>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs font-medium text-foreground">
                        {group.required ? "Required" : "Optional"}
                      </span>
                      <Switch
                        checked={Boolean(group.required)}
                        onCheckedChange={(val) => {
                          if (isSingle) {
                            updateGroup(group.id, { required: val });
                          } else {
                            updateGroup(group.id, {
                              required: val,
                              minSelections: val ? Math.max(1, group.minSelections ?? 1) : 0,
                            });
                          }
                        }}
                        aria-label="Required choice"
                      />
                    </label>
                  </div>

                  {/* Multiple Choice Boundaries */}
                  {!isSingle && (
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground border-t border-border/50">
                      {group.required ? (
                        <div className="flex items-center gap-1.5">
                          <Label className="text-[11px] font-semibold text-foreground">
                            Min required:
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={Math.max(1, group.options.length)}
                            value={group.minSelections ?? 1}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              updateGroup(group.id, { minSelections: val });
                            }}
                            className="h-7 w-16 text-xs text-center"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Min: 0 (Optional)</span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <Label className="text-[11px] font-semibold text-foreground">
                          Max limit:
                        </Label>
                        <Input
                          type="number"
                          min={group.required ? (group.minSelections ?? 1) : 1}
                          max={Math.max(1, group.options.length)}
                          placeholder="No limit"
                          value={group.maxSelections ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                            updateGroup(group.id, { maxSelections: val });
                          }}
                          className="h-7 w-20 text-xs text-center"
                        />
                        <span className="text-[10px] text-muted-foreground">
                          (leave empty for unlimited)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rule Summary & Inline Validation Error */}
                  {(() => {
                    const groupErr = validateModifierGroupConfig(group);
                    if (groupErr) {
                      return (
                        <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1 text-[11px] font-medium text-destructive">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{groupErr}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        {isSingle
                          ? group.required
                            ? "Single choice (Required): Customer must choose exactly 1 option."
                            : "Single choice (Optional): Customer may choose 1 option or skip."
                          : group.required
                            ? `Multiple choice (Required): Customer must choose between ${group.minSelections ?? 1} and ${group.maxSelections ?? group.options.length} options.`
                            : group.maxSelections
                              ? `Multiple choice (Optional): Customer may choose up to ${group.maxSelections} options.`
                              : "Multiple choice (Optional): Customer may choose any combination."}
                      </div>
                    );
                  })()}
                </div>

                {/* Options List */}
                <div className="p-3 space-y-2">
                  <div className="space-y-1.5">
                    {group.options.map((opt, oIdx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <Input
                          value={opt.name}
                          onChange={(e) => updateOption(group.id, opt.id, { name: e.target.value })}
                          placeholder="Option name (e.g. Oat Milk)"
                          className="h-9 flex-1 text-xs"
                        />
                        <div className="flex items-center gap-1 shrink-0 w-28">
                          <span className="text-[11px] text-muted-foreground">+</span>
                          <Input
                            type="number"
                            min={0}
                            value={opt.priceDelta || ""}
                            onChange={(e) =>
                              updateOption(group.id, opt.id, {
                                priceDelta: Math.max(0, Number(e.target.value)),
                              })
                            }
                            placeholder="0"
                            className="h-9 text-xs"
                          />
                        </div>
                        <span className="w-16 text-right text-[11px] font-medium text-muted-foreground shrink-0 truncate">
                          {opt.priceDelta ? `+${formatPrice(opt.priceDelta, currency)}` : "Free"}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={oIdx === 0}
                            onClick={() => moveOption(group.id, oIdx, -1)}
                            className="h-6 w-6 text-muted-foreground"
                            aria-label="Move option up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={oIdx === group.options.length - 1}
                            onClick={() => moveOption(group.id, oIdx, 1)}
                            className="h-6 w-6 text-muted-foreground"
                            aria-label="Move option down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(group.id, opt.id)}
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            aria-label="Remove option"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addOption(group.id)}
                    className="h-8 w-full border-dashed text-xs text-primary font-medium"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add choice to {group.name || "group"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Group Add Form */}
      <div className="flex gap-2 pt-1">
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New choice group (e.g. Bread Type, Side Dish)"
          className="h-10 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (newGroupName.trim()) addGroup();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-10 shrink-0 text-xs font-semibold"
          onClick={() => addGroup()}
          disabled={!newGroupName.trim()}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Group
        </Button>
      </div>
    </div>
  );
}
