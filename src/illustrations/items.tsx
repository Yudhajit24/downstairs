import type { ComponentType } from 'react'
import { Ill, RISO, T } from './Ill'

type P = { size?: number }

export const FilterCoffee = ({ size }: P) => (
  <Ill size={size} title="Filter coffee in a dabara and tumbler">
    <path d="M25 27H39L36.5 44H27.5Z" transform={RISO} {...T} />
    <path d="M12 38Q12 53 32 53Q52 53 52 38Z" />
    <path d="M10 38H54" />
    <path d="M22 20H42M24 20L27.5 44M40 20L36.5 44M27.5 44H36.5" />
    <path d="M28 8q-3 3 0 6M35 8q-3 3 0 6" />
  </Ill>
)

export const CuttingChai = ({ size }: P) => (
  <Ill size={size} title="Cutting chai in a ribbed glass">
    <path d="M23 26H41L39.5 50H24.5Z" transform={RISO} {...T} />
    <path d="M21 16L24 50H40L43 16Z" />
    <path d="M22.5 25H41.5M23.2 32H40.8M23.8 39H40.2M24.3 45H39.7" strokeWidth={1.8} />
    <path d="M27 6q-3 3 0 6M35 6q-3 3 0 6" />
  </Ill>
)

export const Cappuccino = ({ size }: P) => (
  <Ill size={size} title="Cappuccino with a heart in the foam">
    <path d="M30 34.5c-3-5-8-1-3.6 2.7L30 40l3.6-2.8c4.4-3.7-.6-7.7-3.6-2.7Z" transform={RISO} {...T} />
    <path d="M14 26H46V36Q46 48 30 48Q14 48 14 36Z" />
    <ellipse cx="30" cy="26" rx="16" ry="3.5" />
    <path d="M46 29h2.5a5 5 0 0 1 0 10H45" />
    <path d="M8 54H52" />
    <path d="M30 34.5c-3-5-8-1-3.6 2.7L30 40l3.6-2.8c4.4-3.7-.6-7.7-3.6-2.7Z" />
    <path d="M24 12q-3 3 0 6M32 10q-3 3 0 6" />
  </Ill>
)

export const ColdCoffee = ({ size }: P) => (
  <Ill size={size} title="Cold coffee in a tall glass with a straw">
    <path d="M21.5 27H42.5L41 54H23Z" transform={RISO} {...T} />
    <path d="M19 14H45L42 56H22Z" />
    <path d="M20.5 27H43.5" strokeWidth={1.8} />
    <path d="M37 6L33 32" />
    <rect x="25" y="34" width="7" height="7" rx="1.5" strokeWidth={1.8} transform="rotate(-10 28 37)" />
    <rect x="31" y="43" width="7" height="7" rx="1.5" strokeWidth={1.8} transform="rotate(8 34 46)" />
  </Ill>
)

export const ColdBrew = ({ size }: P) => (
  <Ill size={size} title="Cold brew bottle">
    <rect x="21" y="34" width="22" height="13" transform={RISO} {...T} />
    <path d="M27 6H37V16Q43 20 43 28V52Q43 58 37 58H27Q21 58 21 52V28Q21 20 27 16Z" />
    <path d="M26 11H38" />
    <path d="M21 34H43V47H21Z" strokeWidth={1.8} />
    <path d="M26 40.5H38" strokeWidth={1.8} />
  </Ill>
)

export const LemonIcedTea = ({ size }: P) => (
  <Ill size={size} title="Lemon iced tea with a lemon wedge">
    <path d="M38 21A9 9 0 0 1 56 21Z" transform={RISO} {...T} />
    <path d="M16 21H42L39 56H19Z" />
    <path d="M17.5 32H40.5" strokeWidth={1.8} />
    <path d="M29 8L26 36" />
    <path d="M38 21A9 9 0 0 1 56 21Z" />
    <path d="M47 12V21M41 15.5L47 21M53 15.5L47 21" strokeWidth={1.8} />
    <rect x="23" y="38" width="7" height="7" rx="1.5" strokeWidth={1.8} transform="rotate(-8 26 41)" />
  </Ill>
)

export const KandaPoha = ({ size }: P) => (
  <Ill size={size} title="Bowl of kanda poha with steam">
    <path d="M16 36Q20 24 32 25Q44 24 48 36Z" transform={RISO} {...T} />
    <path d="M8 36H56Q56 56 32 56Q8 56 8 36Z" />
    <path d="M16 36Q20 24 32 25Q44 24 48 36" />
    <path d="M25 31h.1M32 29h.1M39 31h.1M29 33h.1M36 34h.1" strokeWidth={3} />
    <path d="M22 8q-4 4 0 8M32 6q-4 4 0 8M42 8q-4 4 0 8" />
  </Ill>
)

export const VegSandwich = ({ size }: P) => (
  <Ill size={size} title="Veg grilled sandwich, two halves">
    <path d="M28 54H54V28Z" transform={RISO} {...T} />
    <path d="M9 50V24L35 50Z" />
    <path d="M13 41L22 50M12 33L29 50" strokeWidth={1.8} />
    <path d="M26 56H54V28Z" />
    <path d="M32 56L54 34M40 56L54 42" strokeWidth={1.8} />
  </Ill>
)

export const EggBhurjiPav = ({ size }: P) => (
  <Ill size={size} title="Egg bhurji pav">
    <path d="M12 38q4-5 8 0t8 0 8 0 8 0 8 0V42H12Z" transform={RISO} {...T} />
    <path d="M10 35Q10 18 32 18Q54 18 54 35Z" />
    <path d="M12 38q4-5 8 0t8 0 8 0 8 0 8 0" />
    <path d="M10 43H54Q54 54 44 54H20Q10 54 10 43Z" />
    <path d="M22 25h.1M32 23h.1M42 25h.1" strokeWidth={3} />
  </Ill>
)

export const ButterCroissant = ({ size }: P) => (
  <Ill size={size} title="Butter croissant">
    <path d="M6 44Q10 20 32 16Q54 20 58 44Q52 42 50 36Q44 28 32 28Q20 28 14 36Q12 42 6 44Z" transform={RISO} {...T} />
    <path d="M6 44Q10 20 32 16Q54 20 58 44Q52 42 50 36Q44 28 32 28Q20 28 14 36Q12 42 6 44Z" fill="var(--paper-raised)" />
    <path d="M32 16V28M21 18.5L24 29M43 18.5L40 29M12 28.5L17 33.5M52 28.5L47 33.5" strokeWidth={1.8} />
  </Ill>
)

export const BananaBread = ({ size }: P) => (
  <Ill size={size} title="Banana walnut bread slice">
    <path d="M11 38Q32 30 53 38V47Q53 51 49 51H15Q11 51 11 47Z" transform={RISO} {...T} />
    <path d="M9 47V30Q9 14 32 14Q55 14 55 30V47Q55 52 50 52H14Q9 52 9 47Z" />
    <path d="M9 37Q32 29 55 37" strokeWidth={1.8} />
    <path d="M22 22l3 2-2 3zM37 21l3 2-2 3zM30 28l3 1-1 3z" strokeWidth={1.8} />
  </Ill>
)

export const ChocoCookie = ({ size }: P) => (
  <Ill size={size} title="Choco chip cookie">
    <path d="M32 12C44 11 53 20 52 32C51 45 42 53 31 52C19 51 11 43 12 31C13 20 21 12 32 12Z" transform={RISO} {...T} />
    <path d="M30 10C43 9 54 19 53 32C52 45 42 54 30 53C18 52 9 43 10 30C11 19 19 10 30 10Z" fill="var(--paper-raised)" />
    <path d="M24 22l3 1.5-1.5 3.5-3-1.5ZM38 28l3.5 1-1 3.5-3.5-1ZM26 38l3 1-1 3.5-3-1Z" fill="var(--ink)" />
    <path d="M40 18h.1M18 34h.1M42 42h.1" strokeWidth={3} />
  </Ill>
)

export const EggWhiteWrap = ({ size }: P) => (
  <Ill size={size} title="Egg white wrap">
    <g transform="rotate(-32 32 32)">
      <ellipse cx="51" cy="33" rx="5" ry="10" transform={RISO} {...T} />
      <path d="M12 22H49A11 11 0 0 1 49 44H12A11 11 0 0 1 12 22Z" fill="var(--paper-raised)" />
      <path d="M12 22H49A11 11 0 0 1 49 44H12A11 11 0 0 1 12 22Z" />
      <ellipse cx="51" cy="33" rx="5" ry="10" />
      <path d="M14 22V44M21 22V44M28 22V44" strokeWidth={1.8} />
      <path d="M48 28q3 2 0 4t0 4" strokeWidth={1.8} />
    </g>
  </Ill>
)

export const SproutsBowl = ({ size }: P) => (
  <Ill size={size} title="Sprouts and chickpea bowl">
    <circle cx="25" cy="31" r="3" transform={RISO} {...T} />
    <circle cx="38" cy="30" r="3" transform={RISO} {...T} />
    <path d="M8 36H56Q56 56 32 56Q8 56 8 36Z" />
    <path d="M20 36q-5-9 2-14M28 36q0-11 7-15M39 36q6-6 3-13M47 36q4-5 2-9" />
    <path d="M22 22q-3-3-6-1M35 21q3-4 7-3" strokeWidth={1.8} />
    <circle cx="25" cy="31" r="3" strokeWidth={1.8} />
    <circle cx="38" cy="30" r="3" strokeWidth={1.8} />
  </Ill>
)

export const ProteinShake = ({ size }: P) => (
  <Ill size={size} title="Protein shake in a shaker bottle">
    <path d="M27 31L33 22H30L35 12H38L34 21H40L31 33Z" transform={RISO} {...T} />
    <path d="M22 8H42V15H22Z" />
    <path d="M20 15H44L41 57H23Z" />
    <path d="M24 20H40M24 50H41" strokeWidth={1.8} />
    <path d="M27 31L33 22H30L35 12H38L34 21H40L31 33Z" strokeWidth={1.8} />
  </Ill>
)

export const ChickenSandwich = ({ size }: P) => (
  <Ill size={size} title="Chicken grilled sandwich">
    <path d="M12 38q5-5 10 0t10 0 10 0 10 0V44H12Z" transform={RISO} {...T} />
    <path d="M9 30Q9 14 32 14Q55 14 55 30Z" fill="var(--paper-raised)" />
    <path d="M9 30Q9 14 32 14Q55 14 55 30Z" />
    <path d="M21 17l4 8M31 15l4 9M41 17l4 8" strokeWidth={1.8} />
    <path d="M9 30H55" />
    <path d="M12 38q5-5 10 0t10 0 10 0 10 0" />
    <path d="M9 44H55V48Q55 55 48 55H16Q9 55 9 48Z" fill="var(--paper-raised)" />
    <path d="M9 44H55V48Q55 55 48 55H16Q9 55 9 48Z" />
  </Ill>
)

export const ChickenTikkaWrap = ({ size }: P) => (
  <Ill size={size} title="Chicken tikka wrap with a skewer">
    <g transform="rotate(-32 32 34)">
      <ellipse cx="51" cy="35" rx="5" ry="10" transform={RISO} {...T} />
      <path d="M12 24H49A11 11 0 0 1 49 46H12A11 11 0 0 1 12 24Z" fill="var(--paper-raised)" />
      <path d="M12 24H49A11 11 0 0 1 49 46H12A11 11 0 0 1 12 24Z" />
      <ellipse cx="51" cy="35" rx="5" ry="10" />
      <path d="M14 24V46M21 24V46" strokeWidth={1.8} />
      <circle cx="43" cy="31" r="2.2" strokeWidth={1.8} /><circle cx="43" cy="39" r="2.2" strokeWidth={1.8} />
    </g>
    <path d="M8 56L30 50" strokeWidth={1.8} />
    <rect x="8" y="49" width="6" height="6" rx="1.2" strokeWidth={1.8} transform="rotate(-14 11 52)" />
  </Ill>
)

export const ChickenKeemaPav = ({ size }: P) => (
  <Ill size={size} title="Chicken keema with pav">
    <path d="M30 36Q30 22 44 22Q58 22 58 36Z" transform={RISO} {...T} />
    <path d="M30 36Q30 22 44 22Q58 22 58 36" />
    <path d="M36 28h.1M43 26h.1M50 28h.1M40 31h.1M47 31h.1M53 33h.1M37 34h.1" strokeWidth={3} />
    <path d="M26 36H62Q62 50 44 50Q26 50 26 36Z" />
    <rect x="4" y="30" width="19" height="22" rx="8" fill="var(--paper-raised)" />
    <path d="M9 38h9M9 44h9" strokeWidth={1.8} />
    <path d="M40 12q-2 3 0 5M47 11q-2 3 0 5" strokeWidth={1.8} />
  </Ill>
)

export const ChickenPuff = ({ size }: P) => (
  <Ill size={size} title="Chicken puff pastry">
    <path d="M8 46Q8 20 32 16Q56 20 56 46Z" transform={RISO} {...T} />
    <path d="M6 46Q6 18 32 14Q58 18 58 46Z" fill="var(--paper-raised)" />
    <path d="M6 46Q6 18 32 14Q58 18 58 46Z" />
    <path d="M6 46H58" />
    <path d="M13 44l2.5-3 2.5 3M21 44l2.5-3 2.5 3M29 44l2.5-3 2.5 3M37 44l2.5-3 2.5 3M45 44l2.5-3 2.5 3" strokeWidth={1.6} />
    <path d="M17 36Q32 24 47 36M21 40Q32 31 43 40" strokeWidth={1.8} />
    <path d="M32 14V22" strokeWidth={1.8} />
  </Ill>
)

export const GrilledChickenBowl = ({ size }: P) => (
  <Ill size={size} title="Grilled chicken bowl with greens">
    <path d="M17 36l4-8h22l4 8Z" transform={RISO} {...T} />
    <path d="M8 36H56Q56 56 32 56Q8 56 8 36Z" />
    <path d="M14 36Q12 28 20 26Q22 20 28 24Q34 18 40 24Q48 22 49 30Q54 32 50 36" fill="var(--paper-raised)" />
    <path d="M14 36Q12 28 20 26Q22 20 28 24Q34 18 40 24Q48 22 49 30Q54 32 50 36" />
    <path d="M19 33l9-8M27 34l9-8M35 34l9-8" strokeWidth={2.2} />
    <circle cx="44" cy="35" r="2.6" strokeWidth={1.8} />
  </Ill>
)

export const ITEM_ILLUSTRATIONS: Record<string, ComponentType<P>> = {
  'filter-coffee': FilterCoffee,
  'cutting-chai': CuttingChai,
  cappuccino: Cappuccino,
  'cold-coffee': ColdCoffee,
  'cold-brew': ColdBrew,
  'lemon-iced-tea': LemonIcedTea,
  'kanda-poha': KandaPoha,
  'veg-sandwich': VegSandwich,
  'egg-bhurji-pav': EggBhurjiPav,
  'butter-croissant': ButterCroissant,
  'banana-bread': BananaBread,
  'choco-cookie': ChocoCookie,
  'egg-white-wrap': EggWhiteWrap,
  'sprouts-bowl': SproutsBowl,
  'protein-shake': ProteinShake,
  'chicken-sandwich': ChickenSandwich,
  'chicken-tikka-wrap': ChickenTikkaWrap,
  'chicken-keema-pav': ChickenKeemaPav,
  'chicken-puff': ChickenPuff,
  'grilled-chicken-bowl': GrilledChickenBowl,
}

export function ItemIllustration({ name, size = 64 }: { name: string; size?: number }) {
  const C = ITEM_ILLUSTRATIONS[name]
  return C ? <C size={size} /> : null
}
