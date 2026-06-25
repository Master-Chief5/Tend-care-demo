// The SalesEcho mark: a dark circular badge with white audio-wave bars,
// next to the wordmark.
export default function Logo({ size = 40, showWord = true }) {
  return (
    <span className="logo" aria-label="SalesEcho">
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill="#111" />
        <g fill="#fff">
          <rect x="28" y="42" width="7" height="16" rx="3.5" />
          <rect x="40" y="30" width="7" height="40" rx="3.5" />
          <rect x="52" y="24" width="7" height="52" rx="3.5" />
          <rect x="64" y="38" width="7" height="24" rx="3.5" />
        </g>
      </svg>
      {showWord && <span className="logo-word">SalesEcho</span>}
    </span>
  )
}
