import { Ill, RISO, T } from './Ill'

const V = '0 0 240 200'

/** Hero: residential tower, one lit window, dotted path down to a café awning. */
export function HeroScene({ size = '100%' }: { size?: number | string }) {
  return (
    <Ill size={size} viewBox={V} title="A residential tower with one lit window and a path down to the café">
      <rect x="39" y="28" width="22" height="18" transform={RISO} {...T} />
      <path d="M24 176V40L50 20L76 40V176" />
      <path d="M16 176H224" />
      {[56, 82, 108, 134].map((y) =>
        [34, 56].map((x) => (
          <rect key={`${x}${y}`} x={x} y={y} width="14" height="14" rx="2" strokeWidth={2} />
        )),
      )}
      <rect x="39" y="28" width="22" height="18" rx="2" fill="none" />
      <rect x="40" y="152" width="20" height="24" rx="2" />
      <path d="M50 46V28M39 37H61" strokeWidth={1.8} />
      <path d="M62 160C100 150 110 178 142 164" strokeDasharray="1 8" strokeWidth={3} />
      {/* café */}
      <path d="M150 176V120H220V176" />
      <path d="M144 120L152 100H218L226 120Z" transform={RISO} {...T} />
      <path d="M144 120L152 100H218L226 120Z" />
      <path d="M144 120q6.2 10 12.4 0t12.4 0 12.4 0 12.4 0 12.4 0 12.4 0" />
      <rect x="164" y="140" width="22" height="36" rx="2" />
      <rect x="194" y="136" width="18" height="18" rx="2" strokeWidth={2} />
      <path d="M170 90q-3 3 0 6M180 88q-3 3 0 6" strokeWidth={2} />
    </Ill>
  )
}

const stroke = { strokeWidth: 2.5 }

export function SceneNew({ size = 160 }: { size?: number }) {
  return (
    <Ill size={size} viewBox={V} title="An order ticket">
      <path d="M70 40H170V160L160 152L150 160L140 152L130 160L120 152L110 160L100 152L90 160L80 152L70 160Z" transform={RISO} {...T} />
      <path d="M66 36H166V156L156 148L146 156L136 148L126 156L116 148L106 156L96 148L86 156L76 148L66 156Z" fill="var(--paper-raised)" {...stroke} />
      <path d="M78 56H122M78 70H154" />
      <path d="M78 88H154" strokeDasharray="2 6" />
      <path d="M78 104H140M78 118H120M78 132H132" strokeWidth={2} />
      <circle cx="146" cy="58" r="9" />
      <path d="M142 58l3 3 6-6" strokeWidth={2} />
    </Ill>
  )
}

export function ScenePreparing({ size = 160 }: { size?: number }) {
  return (
    <Ill size={size} viewBox={V} title="A steaming cup">
      <path d="M70 100H150V122Q150 156 110 156Q70 156 70 122Z" transform={RISO} {...T} />
      <path d="M66 96H146V122Q146 154 106 154Q66 154 66 122Z" fill="var(--paper-raised)" />
      <ellipse cx="106" cy="96" rx="40" ry="8" />
      <path d="M146 108h10a14 14 0 0 1 0 28h-12" />
      <path d="M50 168H162" />
      <g style={{ strokeDasharray: 20 }}>
        <path d="M88 76q-9-10 0-20t0-20" style={{ animation: 'steam 2.4s ease-in-out infinite' }} />
        <path d="M108 76q-9-10 0-20t0-20" style={{ animation: 'steam 2.4s .5s ease-in-out infinite' }} />
        <path d="M128 76q-9-10 0-20t0-20" style={{ animation: 'steam 2.4s 1s ease-in-out infinite' }} />
      </g>
    </Ill>
  )
}

/** Person (original monoline figure) heading down the stairs. */
export function SceneReady({ size = 160 }: { size?: number }) {
  return (
    <Ill size={size} viewBox={V} title="Someone heading down the stairs">
      <path d="M40 60H80V90H120V120H160V150H200V168H40Z" transform={RISO} {...T} />
      <path d="M36 56H76V86H116V116H156V146H196V164" />
      <path d="M36 56V164H196" />
      <path d="M76 86V164M116 116V164M156 146V164" strokeWidth={2} />
      <circle cx="112" cy="44" r="12" fill="var(--paper-raised)" />
      <path d="M108 38q6-6 12 0" strokeWidth={2} />
      <path d="M110 58L106 88M106 88L92 112M106 88L122 100L120 116M110 62L94 74M110 62L124 74" />
      <path d="M170 90q10-10 20 0" strokeWidth={2} />
      <path d="M176 74v8M190 78l-5 6M162 78l5 6" strokeWidth={2} />
    </Ill>
  )
}

export function ScenePickedUp({ size = 160 }: { size?: number }) {
  return (
    <Ill size={size} viewBox={V} title="A cup raised in a toast">
      <path d="M92 74H132L127 126H97Z" transform={RISO} {...T} />
      <path d="M88 70H128L123 124H93Z" fill="var(--paper-raised)" />
      <path d="M90 82H126" strokeWidth={1.8} />
      <path d="M66 124q-6 40 30 44M128 124q10 30 44 28" />
      <path d="M96 40l-8-14M110 36V20M124 40l8-14" />
      <path d="M92 170H160" />
    </Ill>
  )
}

export function SceneCancelled({ size = 160 }: { size?: number }) {
  return (
    <Ill size={size} viewBox={V} title="A crossed-out ticket">
      <path d="M72 44H168V158H72Z" transform={RISO} {...T} />
      <path d="M68 40H164V154H68Z" fill="var(--paper-raised)" />
      <path d="M80 62H128M80 76H150M80 90H140" strokeWidth={2} />
      <path d="M90 108L142 148M142 108L90 148" strokeWidth={3.5} />
    </Ill>
  )
}
