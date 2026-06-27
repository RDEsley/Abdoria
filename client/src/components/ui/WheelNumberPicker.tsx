import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';

const ITEM_HEIGHT = 36;
const PAD_COUNT = 2;

interface WheelCoreProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function WheelPickerCore({ value, min, max, step = 1, suffix = '', onChange }: WheelCoreProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const options = useMemo(() => {
    const list: number[] = [];
    for (let n = min; n <= max; n += step) list.push(n);
    return list;
  }, [min, max, step]);

  const clampValue = useCallback(
    (next: number) => {
      const idx = options.indexOf(next);
      if (idx >= 0) return next;
      const clamped = Math.min(max, Math.max(min, next));
      const rounded = Math.round((clamped - min) / step) * step + min;
      return Math.min(max, Math.max(min, rounded));
    },
    [min, max, step, options],
  );

  const indexFromValue = useCallback(
    (v: number) => {
      const idx = options.indexOf(clampValue(v));
      return idx >= 0 ? idx : 0;
    },
    [clampValue, options],
  );

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'auto') => {
    scrollRef.current?.scrollTo({ top: index * ITEM_HEIGHT, behavior });
  }, []);

  useEffect(() => {
    if (scrollingRef.current) return;
    scrollToIndex(indexFromValue(value));
  }, [value, indexFromValue, scrollToIndex]);

  useEffect(() => () => clearTimeout(scrollEndTimer.current), []);

  const selectIndex = useCallback(
    (index: number) => {
      const next = options[index];
      if (next === undefined) return;

      clearTimeout(scrollEndTimer.current);
      scrollingRef.current = true;
      scrollToIndex(index, 'smooth');
      if (next !== value) onChange(next);

      scrollEndTimer.current = setTimeout(() => {
        scrollingRef.current = false;
      }, 280);
    },
    [onChange, options, scrollToIndex, value],
  );

  const syncFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const index = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)));
    const next = options[index];
    scrollToIndex(index, 'smooth');
    if (next !== value) onChange(next);
    scrollingRef.current = false;
  }, [onChange, options, scrollToIndex, value]);

  const handleScroll = () => {
    scrollingRef.current = true;
    clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = setTimeout(syncFromScroll, 100);
  };

  return (
    <div className="game-wheel-picker__viewport">
      <div className="game-wheel-picker__highlight" aria-hidden />
      <div
        ref={scrollRef}
        className="game-wheel-picker__scroll"
        onScroll={handleScroll}
        role="listbox"
        aria-label="Selecionar valor"
      >
        {Array.from({ length: PAD_COUNT }).map((_, i) => (
          <div key={`pad-top-${i}`} className="game-wheel-picker__item game-wheel-picker__item--spacer" aria-hidden />
        ))}
        {options.map((n, index) => (
          <button
            key={n}
            type="button"
            role="option"
            aria-selected={n === value}
            className={`game-wheel-picker__item ${n === value ? 'game-wheel-picker__item--active' : ''}`}
            onClick={() => selectIndex(index)}
          >
            {n}
            {suffix}
          </button>
        ))}
        {Array.from({ length: PAD_COUNT }).map((_, i) => (
          <div key={`pad-bot-${i}`} className="game-wheel-picker__item game-wheel-picker__item--spacer" aria-hidden />
        ))}
      </div>
    </div>
  );
}

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  suffix?: string;
  className?: string;
  placeholder?: string;
}

export function WheelNumberPicker({
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  label,
  suffix = '',
  className = '',
  placeholder = '—',
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const displayValue = `${value}${suffix}`;

  const openPicker = () => {
    if (disabled) return;
    setDraft(value);
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  const confirmPicker = () => {
    onChange(draft);
    closePicker();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePicker();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const sheetTitle = label ?? 'Selecionar valor';

  return (
    <>
      <div className={`game-wheel-picker ${disabled ? 'game-wheel-picker--disabled' : ''} ${className}`.trim()}>
        {label && <span className="game-wheel-picker__label">{label}</span>}
        <button
          type="button"
          className="game-wheel-picker__field"
          onClick={openPicker}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={label ? `${label}: ${displayValue}` : displayValue}
        >
          <span className={`game-wheel-picker__value ${disabled ? 'game-wheel-picker__value--muted' : ''}`}>
            {disabled ? placeholder : displayValue}
          </span>
          {!disabled && <ChevronDown size={16} className="game-wheel-picker__chevron" aria-hidden />}
        </button>
      </div>

      {open &&
        createPortal(
          <div className="game-picker-sheet-overlay" onClick={closePicker} role="presentation">
            <div
              className="game-picker-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="picker-sheet-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="game-picker-sheet__handle" aria-hidden />
              <h2 id="picker-sheet-title" className="game-picker-sheet__title">
                {sheetTitle}
              </h2>
              <WheelPickerCore
                value={draft}
                min={min}
                max={max}
                step={step}
                suffix={suffix}
                onChange={setDraft}
              />
              <div className="game-picker-sheet__actions">
                <GameButton variant="secondary" className="flex-1" onClick={closePicker}>
                  Cancelar
                </GameButton>
                <GameButton className="flex-1" onClick={confirmPicker}>
                  Confirmar
                </GameButton>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
