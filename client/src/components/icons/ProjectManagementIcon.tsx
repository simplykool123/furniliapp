interface ProjectManagementIconProps {
  className?: string;
}

export default function ProjectManagementIcon({ className = "h-4 w-4" }: ProjectManagementIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Clock at top */}
      <circle cx="12" cy="4" r="2.5" />
      <path d="M12 2.5V4M12 4l1 1" />
      
      {/* Central person */}
      <circle cx="12" cy="13" r="2.5" />
      <path d="M8 19c0-2 2-3 4-3s4 1 4 3" />
      
      {/* Settings gear on left */}
      <circle cx="4" cy="13" r="2" />
      <path d="M3 11.5l1 .5-1 .5M3 14.5l1-.5-1-.5" />
      <path d="M5 11.5l1 .5-1 .5M5 14.5l1-.5-1-.5" />
      
      {/* Clipboard on right */}
      <rect x="18" y="11" width="4" height="5" rx="0.5" />
      <path d="M19 12h2M19 13.5h1.5M19 15h2" />
      <path d="M19.5 10.5h1v1h-1z" />
      
      {/* Connecting lines */}
      <path d="M10 6l-4 5M14 6l4 5" />
      <path d="M9.5 13h-3.5M14.5 13h3.5" />
    </svg>
  );
}