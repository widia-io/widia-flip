"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface BlogTocItem {
  id: string;
  title: string;
  depth: 2 | 3;
}

interface BlogPostTocProps {
  items: BlogTocItem[];
}

const TOP_OFFSET_PX = 116;
const OBSERVER_ROOT_MARGIN = `-${TOP_OFFSET_PX}px 0px -55% 0px`;

export function BlogPostToc({ items }: BlogPostTocProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  const itemIndexById = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item, index) => map.set(item.id, index));
    return map;
  }, [items]);

  useEffect(() => {
    setActiveId(items[0]?.id ?? "");
  }, [items]);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    const headingElements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (headingElements.length === 0) {
      return;
    }

    const updateActiveByScroll = () => {
      const currentPosition = window.scrollY + TOP_OFFSET_PX + 8;
      let currentId = items[0]?.id ?? "";

      for (const heading of headingElements) {
        if (heading.offsetTop <= currentPosition) {
          currentId = heading.id;
          continue;
        }
        break;
      }

      setActiveId((prev) => (prev === currentId ? prev : currentId));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top),
          )[0];

        if (visibleEntry) {
          setActiveId(visibleEntry.target.id);
          return;
        }

        updateActiveByScroll();
      },
      {
        rootMargin: OBSERVER_ROOT_MARGIN,
        threshold: [0, 0.35, 1],
      },
    );

    headingElements.forEach((heading) => observer.observe(heading));
    updateActiveByScroll();
    window.addEventListener("scroll", updateActiveByScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateActiveByScroll);
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  const activeIndex = itemIndexById.get(activeId) ?? 0;
  const progress = Math.round(((activeIndex + 1) / items.length) * 100);

  const navigateToHeading = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) {
      return;
    }

    const targetTop = target.getBoundingClientRect().top + window.scrollY - TOP_OFFSET_PX;
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: targetTop, behavior: "smooth" });
    setActiveId(id);
    setMobileOpen(false);
  };

  const renderLinks = () => (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(event) => navigateToHeading(event, item.id)}
              className={cn(
                "blog-toc-link block rounded-md border border-transparent px-2.5 py-2 text-sm leading-snug transition-colors",
                item.depth === 3 && "ml-3 text-[0.82rem]",
                isActive
                  ? "border-primary/30 bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground/90",
              )}
              aria-current={isActive ? "location" : undefined}
            >
              {item.title}
            </a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <div className="blog-toc-mobile mt-8 rounded-2xl border border-border/70 bg-card/70 lg:hidden">
        <Collapsible open={mobileOpen} onOpenChange={setMobileOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Neste artigo
              </p>
              <p className="mt-1 text-sm font-medium text-foreground/90">{items.length} seções</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{progress}% lido</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  mobileOpen && "rotate-180",
                )}
              />
            </div>
          </CollapsibleTrigger>

          <div className="px-4 pb-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <CollapsibleContent className="pb-4">
            <nav className="px-4">{renderLinks()}</nav>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <aside className="hidden lg:col-start-2 lg:row-start-1 lg:block">
        <div className="blog-toc-rail sticky top-24 rounded-2xl border border-border/60 bg-card/65 p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Trilho de Viabilidade
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Navegue por seção sem perder o contexto.</p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <nav className="mt-4">{renderLinks()}</nav>
        </div>
      </aside>
    </>
  );
}
