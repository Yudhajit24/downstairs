/** Fixed full-screen riso grain. Pass `off` on the kitchen view if the tablet struggles. */
export function Grain({ off }: { off?: boolean }) {
  return off ? null : <div className="grain" aria-hidden />
}
