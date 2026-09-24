import type { ComponentProps } from 'react';

/** A quarter rest: the musical sign for a beat of silence. */
export function RestGlyph(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={0.6} strokeLinejoin="round" {...props}>
      <path d="M9.6 2.2 L14.9 8.4 L11.4 13.2 L15 17.6 C12.4 16.2 9.2 16.8 9.4 19.4 C9.5 20.6 10.4 21.5 11.4 22 L11.9 21.5 C11 20.6 10.9 19.4 11.5 18.6 C11.9 18 12.4 17.7 12.8 17.6 L8.6 12.5 L12 7.4 Z" />
    </svg>
  );
}
