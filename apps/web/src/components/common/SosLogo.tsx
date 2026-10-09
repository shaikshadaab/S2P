import React from "react";
import Link from "next/link";

export interface SosLogoProps {
  variant?: "horizontal" | "compact" | "icon" | "mark";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  theme?: "light" | "dark" | "monochrome";
  showSubtitle?: boolean;
  href?: string;
  className?: string;
}

export function SosLogo({
  variant = "horizontal",
  size = "md",
  theme = "light",
  showSubtitle = true,
  href,
  className = ""
}: SosLogoProps) {
  // Dimension scalings
  const dimensions = {
    xs: { icon: 24, fontMain: "text-xs", fontSub: "text-[8px]" },
    sm: { icon: 32, fontMain: "text-sm", fontSub: "text-[9px]" },
    md: { icon: 40, fontMain: "text-base font-black", fontSub: "text-[10px]" },
    lg: { icon: 48, fontMain: "text-xl font-black", fontSub: "text-xs" },
    xl: { icon: 60, fontMain: "text-2xl font-black", fontSub: "text-xs" }
  }[size];

  const isDark = theme === "dark";
  const isMono = theme === "monochrome";

  const markSvg = (
    <svg
      viewBox="0 0 64 64"
      width={dimensions.icon}
      height={dimensions.icon}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform group-hover:scale-105 duration-200"
      aria-label="SOS Print Logo Symbol"
    >
      <defs>
        <linearGradient id="emeraldGradComp" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>

      {/* Rounded Container */}
      <rect
        width="64"
        height="64"
        rx="14"
        fill={isMono ? (isDark ? "#FFFFFF" : "#0F172A") : "url(#emeraldGradComp)"}
      />

      {/* Document Sheet */}
      <path
        d="M22 13h15l10 10v20a3 3 0 0 1-3 3H22a3 3 0 0 1-3-3V16a3 3 0 0 1 3-3z"
        fill={isMono && isDark ? "#0F172A" : "#FFFFFF"}
      />
      {/* Folded Corner */}
      <path
        d="M37 13v7a3 3 0 0 0 3 3h7"
        fill="none"
        stroke={isMono ? "#94A3B8" : "#E2E8F0"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Scanner Bar (Emerald / Accent) */}
      <line
        x1="23"
        y1="27"
        x2="41"
        y2="27"
        stroke={isMono ? (isDark ? "#FFFFFF" : "#0F172A") : "#059669"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Document Lines */}
      <line
        x1="23"
        y1="32"
        x2="37"
        y2="32"
        stroke={isMono ? "#CBD5E1" : "#94A3B8"}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="23"
        y1="37"
        x2="33"
        y2="37"
        stroke={isMono ? "#E2E8F0" : "#CBD5E1"}
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* Printer Base / Output Slot */}
      <path
        d="M16 43h32a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"
        fill={isMono ? (isDark ? "#FFFFFF" : "#0F172A") : "#0F172A"}
      />
      <line
        x1="24"
        y1="46"
        x2="40"
        y2="46"
        stroke={isMono ? "#64748B" : "#10B981"}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Scan Target Corner Registration Marks */}
      <path
        d="M12 18v-4h4"
        stroke={isMono ? "#94A3B8" : "#A7F3D0"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M48 14h4v4"
        stroke={isMono ? "#94A3B8" : "#A7F3D0"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 46v4h4"
        stroke={isMono ? "#94A3B8" : "#A7F3D0"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M48 50h4v-4"
        stroke={isMono ? "#94A3B8" : "#A7F3D0"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === "icon" || variant === "mark") {
    if (href) {
      return (
        <Link href={href} className={`inline-flex items-center group ${className}`}>
          {markSvg}
        </Link>
      );
    }
    return <span className={`inline-flex items-center ${className}`}>{markSvg}</span>;
  }

  const content = (
    <div className={`inline-flex items-center gap-3 group select-none ${className}`}>
      {markSvg}
      <div className="flex flex-col leading-none">
        <div className={`font-black tracking-wider flex items-center gap-1.5 ${dimensions.fontMain} ${
          isDark ? "text-white" : "text-[#0F172A]"
        }`}>
          <span>SOS</span>
          <span className={isMono ? (isDark ? "text-white" : "text-black") : "text-emerald-600 font-extrabold"}>
            PRINT
          </span>
        </div>
        {showSubtitle && variant === "horizontal" && (
          <div className={`font-bold tracking-widest uppercase mt-1 text-[#475569] ${dimensions.fontSub} ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}>
            Shakeel Online Services
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default SosLogo;
