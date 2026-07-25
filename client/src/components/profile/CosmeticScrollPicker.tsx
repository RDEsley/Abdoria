import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Lock } from 'lucide-react';
import { ShopItemRow } from '@/components/shop/ShopItemRow';
import { resolveEquippedTitle } from '@/lib/cosmetic-title';
import { AnimatedTitleText } from '@/components/ui/AnimatedTitleText';
import type { ShopCatalogItem } from '@/types';

interface Props {
  label: string;
  hint: string;
  items: ShopCatalogItem[] | undefined;
  /** Item selecionado no RASCUNHO (não necessariamente o equipado no servidor). */
  selectedId: string | null;
  onSelect: (item: ShopCatalogItem) => void;
  /** Aplica o estilo animado do título ao nome equipado (só na aba de títulos). */
  styledTitle?: boolean;
  /**
   * Lista mínima (nome + cadeado, sem rareza/descrição/botão) — pra manter o
   * seletor de títulos simples: só o nome, clique seleciona.
   */
  simple?: boolean;
}

/**
 * Seletor compacto: o cabeçalho mostra o item selecionado e, ao clicar, revela
 * uma lista rolável com todos os itens. A seleção fica só no RASCUNHO — nada
 * é salvo no servidor até o Editar Perfil chamar "Salvar" (ver ProfileEditModal).
 */
export function CosmeticScrollPicker({
  label,
  hint,
  items,
  selectedId,
  onSelect,
  styledTitle = false,
  simple = false,
}: Props) {
  const [open, setOpen] = useState(false);
  if (!items?.length) return null;

  const selected = items.find((item) => item.id === selectedId);
  const resolvedTitle = styledTitle ? resolveEquippedTitle(selected?.id) : null;

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
            {selected ? (
              <>
                <Check size={12} aria-hidden /> {selected.nome}
              </>
            ) : (
              'Nenhum selecionado'
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
              {simple
                ? items.map((item) => {
                    const isSelected = item.id === selectedId;
                    const titleStyle = styledTitle ? resolveEquippedTitle(item.id) : null;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`cosmetic-picker__simple-row${isSelected ? ' cosmetic-picker__simple-row--selected' : ''}${!item.desbloqueada ? ' cosmetic-picker__simple-row--locked' : ''}`}
                        disabled={!item.desbloqueada}
                        onClick={() => onSelect(item)}
                        title={item.desbloqueada ? item.nome : `Como conseguir: ${item.unlock_label}`}
                      >
                        {item.desbloqueada ? (
                          titleStyle ? (
                            <AnimatedTitleText title={titleStyle} />
                          ) : (
                            <span>{item.nome}</span>
                          )
                        ) : (
                          <span className="cosmetic-picker__simple-row-locked">
                            <Lock size={12} aria-hidden /> {item.nome}
                          </span>
                        )}
                        {isSelected && <Check size={14} aria-hidden />}
                      </button>
                    );
                  })
                : items.map((item) => (
                    <ShopItemRow
                      key={item.id}
                      item={{ ...item, equipada: item.id === selectedId }}
                      busy={false}
                      onEquip={() => onSelect(item)}
                    />
                  ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
