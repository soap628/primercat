"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./InfoHint.module.css";

/** A small, keyboard- and touch-accessible explanation, outside clipped cards. */
export default function InfoHint({ title, label, closeLabel, children }: {
  title: string;
  label: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16 });

  function show() {
    clearTimeout(timer.current);
    setOpen(true);
  }

  function leave() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (document.activeElement !== trigger.current && !panel.current?.contains(document.activeElement)) setOpen(false);
    }, 150);
  }

  function focusPanel() {
    requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>("button")?.focus());
  }

  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => {
    if (!open) return;
    function positionPanel() {
      const anchor = trigger.current?.getBoundingClientRect();
      const bounds = panel.current?.getBoundingClientRect();
      if (!anchor || !bounds) return;
      setPosition({
        left: Math.max(16, Math.min(anchor.left, window.innerWidth - bounds.width - 16)),
        top: anchor.bottom + bounds.height + 24 <= window.innerHeight
          ? anchor.bottom + 8
          : Math.max(16, anchor.top - bounds.height - 8),
      });
    }
    positionPanel();
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !panel.current?.contains(target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        trigger.current?.focus();
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open]);

  return <>
    <button
      ref={trigger}
      type="button"
      className={styles.trigger}
      aria-label={label}
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      aria-haspopup="dialog"
      onMouseEnter={show}
      onMouseLeave={leave}
      onFocus={show}
      onBlur={(event) => { if (!panel.current?.contains(event.relatedTarget)) setOpen(false); }}
      onClick={(event) => { event.stopPropagation(); show(); focusPanel(); }}
      onKeyDown={(event) => {
        if (open && event.key === "Tab" && !event.shiftKey) {
          event.preventDefault();
          focusPanel();
        }
      }}
    >?</button>
    {open && createPortal(
      <div
        ref={panel}
        id={id}
        role="dialog"
        aria-modal="false"
        aria-labelledby={`${id}-title`}
        className={styles.panel}
        style={position}
        onMouseEnter={show}
        onMouseLeave={leave}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = panel.current?.querySelectorAll<HTMLElement>("button, a[href]");
          if (!controls?.length) return;
          if (event.shiftKey && event.target === controls[0]) {
            event.preventDefault();
            trigger.current?.focus();
          } else if (!event.shiftKey && event.target === controls[controls.length - 1]) {
            event.preventDefault();
            const outsideControls = Array.from(document.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
            )).filter((element) => !panel.current?.contains(element) && element.getClientRects().length > 0 && element.tabIndex >= 0);
            const next = outsideControls[outsideControls.indexOf(trigger.current!) + 1];
            (next ?? trigger.current)?.focus();
            setOpen(false);
          }
        }}
        onBlur={(event) => {
          if (!panel.current?.contains(event.relatedTarget) && event.relatedTarget !== trigger.current) setOpen(false);
        }}
      >
        <div className={styles.heading}>
          <strong id={`${id}-title`}>{title}</strong>
          <button type="button" aria-label={closeLabel} onClick={() => { trigger.current?.focus(); setOpen(false); }}>×</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>, document.body,
    )}
  </>;
}
