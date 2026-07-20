"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search } from "lucide-react";
import { listEnabledAreas } from "@/lib/areas/registry";

const AREAS = listEnabledAreas().map((area) => ({
  label: area.displayName,
  areaKey: area.areaKey,
}));

export function SearchDialog({
  trigger,
  large = false,
}: {
  trigger?: React.ReactNode;
  large?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [areaKey, setAreaKey] = useState(AREAS[0].areaKey);
  const defaultTrigger = (
    <Button
      size={large ? "lg" : "default"}
      className={
        large
          ? "h-14 rounded-full bg-foreground px-8 text-base text-background"
          : "rounded-full bg-foreground text-background"
      }
    >
      <Search className="mr-1 size-4" />
      Find your edition
      <ArrowRight className="ml-1 size-4" />
    </Button>
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!AREAS.some((area) => area.areaKey === areaKey)) return;
    setOpen(false);
    router.push(`/local/${areaKey}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="rounded-none border border-black/15 bg-white text-black sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold tracking-tight md:text-4xl">
            Find your local edition
          </DialogTitle>
          <DialogDescription>
            Choose a supported civic area. A page does not claim live coverage
            unless the public projection confirms it.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-6" onSubmit={submit}>
          <label className="grid gap-2 text-xs uppercase tracking-[.14em]">
            Civic area
            <select
              value={areaKey}
              onChange={(event) => setAreaKey(event.target.value)}
              className="h-11 border border-black/30 bg-white px-3 text-base normal-case tracking-normal"
            >
              {AREAS.map((area) => (
                <option key={area.areaKey} value={area.areaKey}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>
          <DialogFooter>
            <Button
              type="submit"
              className="rounded-full bg-foreground text-background"
            >
              Open civic briefing <ArrowRight className="ml-1 size-4" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
