import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { ShopItemRow } from '@/components/shop/ShopItemRow';
import { resolveEquippedTitle } from '@/lib/cosmetic-title';
import type { ShopCatalogItem } from '@/types';

interface Props {
  label: string;
  hint: string;
  items: ShopCatalogItem[] | undefined;
  busyItemId: string | null;
  onEquip: (item: ShopCatalogItem) => void;
  /** Aplica o estilo animado do título ao nome equipado (só na aba de títulos). */
  styledTitle?: boolean;
}

/**
 * Seletor compacto: o cabeçalho mostra o item equipado e, ao clicar, revela uma
 * lista rolável com todos os itens (equipa os que o jogador possui, mostra
 * bloqueio + "como conseguir" nos demais). Economiza espaço no Editar Perfil em
 * vez de despejar a lista inteira sempre aberta.
 */
export function CosmeticScrollPicker({
  label,
  hint,
  items,
  busyItemId,
  onEquip,
  styledTitle = false,
}: Props) {
  const [open, setOpen] = useState(false);
  if (!items?.length) return null;

  const equipped = items.find((item) => item.equipada);
  const resolvedTitle = styledTitle ? resolveEquippedTitle(equipped?.id) : null;

  return (
    <div className="profile-edit-field cosmetic-picker">
      <button
        type="button"
        className={`cosmetic-picker__trigger${open ? ' cosmetic-picker__trigger--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="cosmetic-picker__trigger-main">
          <span className="profile-edit-field__label">{label}</span>
          <span
            className={`cosmetic-picker__current${resolvedTitle?.variantClass ? ` ${resolvedTitle.variantClass}` : ''}`}
          >
            {equipped ? (
              <>
                <Check size={12} aria-hidden /> {equipped.nome}
              </>
            ) : (
              'Nenhum equipado'
            )}
          </span>
        </span>
        <ChevronDown className="cosmetic-picker__chevron" size={18} aria-hidden />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="cosmetic-picker__panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            <span className="profile-edit-field__hint">{hint}</span>
            <div className="cosmetic-picker__scroll">
              {items.map((item) => (
                <ShopItemRow
                  key={item.id}
                  item={item}
                  busy={busyItemId === item.id}
                  onEquip={() => onEquip(item)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
