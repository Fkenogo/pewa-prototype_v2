import { Mail, MessageCircle, Phone } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Venue } from "@/lib/pewa/types";

export function ContactDrawer({
  venue,
  open,
  onOpenChange,
}: {
  venue: Venue;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const wa = venue.contact.whatsapp.replace(/[^\d]/g, "");
  const text = encodeURIComponent(
    `Hi ${venue.name}, I'm viewing your menu on PEWA and have a question.`,
  );
  const items = [
    venue.contact.whatsapp && {
      href: `https://wa.me/${wa}?text=${text}`,
      icon: MessageCircle,
      label: "Chat on WhatsApp",
      sub: venue.contact.whatsapp,
      cls: "bg-whatsapp text-primary-foreground",
    },
    venue.contact.phone && {
      href: `tel:${venue.contact.phone}`,
      icon: Phone,
      label: "Call the business",
      sub: venue.contact.phone,
      cls: "bg-primary text-primary-foreground",
    },
    venue.contact.email && {
      href: `mailto:${venue.contact.email}`,
      icon: Mail,
      label: "Send an email",
      sub: venue.contact.email,
      cls: "bg-secondary text-secondary-foreground",
    },
  ].filter(Boolean) as {
    href: string;
    icon: typeof Phone;
    label: string;
    sub: string;
    cls: string;
  }[];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display text-2xl">Contact {venue.name}</DrawerTitle>
          <DrawerDescription>
            You'll talk to the business directly. PEWA doesn't sit in between.
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-2 px-4 pb-safe">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This business hasn't added contact details yet.
            </p>
          )}
          {items.map((i) => (
            <a
              key={i.label}
              href={i.href}
              target="_blank"
              rel="noreferrer"
              className={`flex min-h-14 items-center gap-3 rounded-xl px-4 ${i.cls}`}
            >
              <i.icon className="h-5 w-5" />
              <span className="flex-1">
                <span className="block font-semibold">{i.label}</span>
                <span className="block text-xs opacity-80">{i.sub}</span>
              </span>
            </a>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
