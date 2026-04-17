export default function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 76 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="76" height="76" rx="20" fill="#2f4a7f" />
      <polygon points="13,27 38,40 38,65 13,52" fill="white" fillOpacity={0.38} />
      <polygon points="63,27 38,40 38,65 63,52" fill="white" fillOpacity={0.62} />
      <polygon points="38,13 63,27 38,40 13,27" fill="white" fillOpacity={0.95} />
      <polyline
        points="38,13 63,27 38,40 13,27 38,13"
        stroke="white"
        strokeOpacity={0.25}
        strokeWidth={0.6}
      />
      <line x1="38" y1="40" x2="38" y2="65" stroke="white" strokeOpacity={0.25} strokeWidth={0.6} />
      <line x1="13" y1="27" x2="13" y2="52" stroke="white" strokeOpacity={0.25} strokeWidth={0.6} />
      <line x1="63" y1="27" x2="63" y2="52" stroke="white" strokeOpacity={0.25} strokeWidth={0.6} />
      <line x1="13" y1="52" x2="38" y2="65" stroke="white" strokeOpacity={0.25} strokeWidth={0.6} />
      <line x1="63" y1="52" x2="38" y2="65" stroke="white" strokeOpacity={0.25} strokeWidth={0.6} />
    </svg>
  );
}
