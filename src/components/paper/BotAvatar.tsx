/**
 * The face of a paper-trading bot.
 *
 * One inline SVG, no assets and no network: the whole portrait is geometry
 * driven by the `BotFace` in `identity.ts`, so a new bot gets a face by
 * adding six strings rather than an image.
 *
 * Construction is layered back-to-front — disc, shoulders, neck, back hair,
 * head, ears, front hair, features, beard, accessory, ring. The "hairline"
 * is not drawn: a hair-coloured ellipse sits a couple of pixels above the
 * face ellipse and the rim that peeks out *is* the hair.
 */
import { identityFor, type BotFace } from "@/lib/paper/identity";

export interface BotAvatarProps {
  profileId: string;
  size?: number;
  /** Ring around the disc. `rank` draws it in the bot's own hue. */
  ring?: "none" | "hairline" | "rank";
  className?: string;
  style?: React.CSSProperties;
}

const shade = (opacity: number) => ({ fill: "#000", opacity });

/**
 * All hair sits BEHIND the head. The face ellipse then covers the middle of
 * it, and the few pixels that still show around the top are the hairline —
 * which is why nothing here has to trace one.
 */
function Hair({ face }: { face: BotFace }) {
  const { hairStyle, hair } = face;

  if (hairStyle === "cap") {
    return <path d="M18 27.4c0-8 6.2-13.6 14-13.6s14 5.6 14 13.6z" fill={hair} />;
  }
  if (hairStyle === "beanie") {
    return <path d="M18 26c0-8.2 6.2-14.2 14-14.2s14 6 14 14.2z" fill={hair} />;
  }

  const rim = <ellipse cx="32" cy="27.4" rx="14.2" ry="14.4" fill={hair} />;
  return (
    <g>
      {hairStyle === "long" ? (
        <path d="M17.6 29c0-8.7 6.4-14.6 14.4-14.6S46.4 20.3 46.4 29v19c0 2.1-1.4 3.2-3.1 3.2-1.8 0-2.7-1.3-2.7-3.2V31H23.4v17c0 1.9-.9 3.2-2.7 3.2-1.7 0-3.1-1.1-3.1-3.2z" fill={hair} />
      ) : null}
      {hairStyle === "bun" ? <circle cx="32" cy="11.8" r="5.8" fill={hair} /> : null}
      {hairStyle === "curls" ? (
        <g fill={hair}>
          <circle cx="20.6" cy="21.6" r="5" /><circle cx="27.4" cy="16.4" r="5.6" />
          <circle cx="36.6" cy="16.4" r="5.6" /><circle cx="43.4" cy="21.6" r="5" />
        </g>
      ) : null}
      {hairStyle === "spike" ? (
        <path d="M18.4 22.5l3.4-8.8 2.9 6.2 3.7-9.4 3.2 7.6 3.6-8.4 3 7.5 3.4-6.2 3.2 9.1z" fill={hair} />
      ) : null}
      {rim}
    </g>
  );
}

/** The parts of the hair that belong in front of the face: brims and bands. */
function HairFront({ face }: { face: BotFace }) {
  const { hairStyle, hair } = face;
  if (hairStyle === "cap") {
    return (
      <g>
        <path d="M17.6 26c-4 .3-7 1.6-7 2.8 0 1 1.1 1.5 3 1.5h20.2c1.1 0 1.7-.5 1.7-1.4 0-1.6-2.7-2.9-7-2.9z" fill={hair} />
        <path d="M17.6 26h11.4v1.5H17.6z" fill="#000" opacity="0.16" />
        <circle cx="32" cy="15" r="1.7" fill={hair} opacity="0.6" />
      </g>
    );
  }
  if (hairStyle === "beanie") {
    return (
      <g>
        <rect x="17.4" y="22.6" width="29.2" height="5.4" rx="2.7" fill={hair} />
        <rect x="17.4" y="22.6" width="29.2" height="5.4" rx="2.7" fill="#000" opacity="0.18" />
      </g>
    );
  }
  if (hairStyle === "band") {
    return <rect x="18.4" y="21.8" width="27.2" height="3.4" rx="1.7" fill="#fff" opacity="0.26" />;
  }
  if (hairStyle === "wave") {
    return (
      <path d="M19.8 23.4c3.2-3.8 7.6-5.2 11.8-5.2 4.4 0 8.2 1.5 11 4-3.5-1.2-6.4-.3-9.1 1.1-3.1 1.6-6.2 2.3-9.1 1.2-1.7-.6-3.2-1.1-4.6-1.1z"
        fill="#fff" opacity="0.12" />
    );
  }
  return null;
}

function Accessory({ face }: { face: BotFace }) {
  const stroke = "rgba(18,20,24,0.78)";
  switch (face.accessory) {
    case "glasses-round":
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.5">
          <circle cx="26.4" cy="31.4" r="4.6" fill="rgba(255,255,255,0.09)" />
          <circle cx="37.6" cy="31.4" r="4.6" fill="rgba(255,255,255,0.09)" />
          <path d="M31 31.2h2M21.8 30.4l-2.4-1M42.2 30.4l2.4-1" />
        </g>
      );
    case "glasses-square":
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.5">
          <rect x="21.4" y="27.6" width="9.6" height="7.4" rx="2.2" fill="rgba(255,255,255,0.09)" />
          <rect x="33" y="27.6" width="9.6" height="7.4" rx="2.2" fill="rgba(255,255,255,0.09)" />
          <path d="M31 31h2M21.4 30l-2.2-1M42.6 30l2.2-1" />
        </g>
      );
    case "headphones":
      return (
        <g>
          <path d="M18.6 31.5v-2.8c0-7.4 6-13.4 13.4-13.4s13.4 6 13.4 13.4v2.8" fill="none" stroke="#1B1F26" strokeWidth="2.6" strokeLinecap="round" />
          <rect x="15.6" y="28.6" width="6" height="9.4" rx="3" fill="#1B1F26" />
          <rect x="42.4" y="28.6" width="6" height="9.4" rx="3" fill="#1B1F26" />
        </g>
      );
    case "visor":
      return <path d="M18.8 27.2h26.4v3.4H18.8z" fill="rgba(18,20,24,0.7)" />;
    default:
      return null;
  }
}

export default function BotAvatar({ profileId, size = 40, ring = "hairline", className, style }: BotAvatarProps) {
  const identity = identityFor(profileId);
  const face = identity.face;
  const clipId = `pa-${profileId.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ flex: "none", display: "block", borderRadius: "50%", ...style }}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="64" height="64" fill={face.bg} />
        <ellipse cx="32" cy="8" rx="34" ry="22" fill="#fff" opacity="0.05" />

        <rect x="27.6" y="38" width="8.8" height="11" fill={face.skin} />
        <ellipse cx="32" cy="41.8" rx="8.4" ry="4.4" {...shade(0.16)} />

        <ellipse cx="32" cy="66" rx="21" ry="17" fill={face.shirt} />
        <path d="M25.6 50.8 32 57l6.4-6.2 3 1.6L32 61l-9.4-8.6z" fill={face.bg} opacity="0.55" />

        <Hair face={face} />

        <ellipse cx="19.2" cy="31.8" rx="2.4" ry="3.2" fill={face.skin} />
        <ellipse cx="44.8" cy="31.8" rx="2.4" ry="3.2" fill={face.skin} />
        <ellipse cx="32" cy="30.4" rx="13" ry="14.2" fill={face.skin} />

        <HairFront face={face} />

        {face.beard ? (
          <path d="M19.2 32.6c0 8.2 5.4 12.4 12.8 12.4s12.8-4.2 12.8-12.4c-1.1 4.6-3.9 6.8-6.2 7.3-1.6-1.9-11.6-1.9-13.2 0-2.3-.5-5.1-2.7-6.2-7.3z"
            fill={face.hair} opacity="0.9" />
        ) : null}

        <g fill="#16181D">
          <ellipse cx="26.6" cy="31.2" rx="1.5" ry="1.7" />
          <ellipse cx="37.4" cy="31.2" rx="1.5" ry="1.7" />
        </g>
        <g stroke="#16181D" strokeWidth="1.2" strokeLinecap="round" opacity="0.62" fill="none">
          <path d="M23.8 27.4c1.6-1 3.6-1 5.2-.2M35 27.2c1.6-.8 3.6-.8 5.2.2" />
        </g>
        <path d="M29.2 37.4c1.8 1.4 3.8 1.4 5.6 0" fill="none" stroke="#16181D" strokeWidth="1.3" strokeLinecap="round" opacity="0.68" />

        <Accessory face={face} />
      </g>
      {ring === "none" ? null : (
        <circle
          cx="32"
          cy="32"
          r="31"
          fill="none"
          stroke={ring === "rank" ? identity.hue : "rgba(255,255,255,0.13)"}
          strokeWidth={ring === "rank" ? 2.2 : 1.6}
        />
      )}
    </svg>
  );
}
