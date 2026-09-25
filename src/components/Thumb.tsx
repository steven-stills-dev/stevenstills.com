/** Rounded 3:2 tile in one of four brand tones, with an orb. */
export default function Thumb({ tone }: { tone: number }) {
  return <div className={`thumb thumb-t${tone % 4}`} aria-hidden="true"><i className="thumb-orb" /></div>;
}
