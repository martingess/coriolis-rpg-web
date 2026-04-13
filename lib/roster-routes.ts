export const TEAM_PANEL_ID = "__team__";
export const TEAM_HREF = "/team";
export const TEAM_FULL_HREF = "/team/full";
export const CHARACTER_HREF_PREFIX = "/characters";
export const COMBAT_HREF = "/combat";
export const SHIP_COMBAT_HREF = "/combat/ship";

function getCharacterBaseHref(characterId: string) {
  return `${CHARACTER_HREF_PREFIX}/${encodeURIComponent(characterId)}`;
}

export function getCharacterHref(characterId: string) {
  return `${getCharacterBaseHref(characterId)}/compact`;
}

export function getCompactCharacterHref(characterId: string) {
  return getCharacterHref(characterId);
}

export function getFullCharacterHref(characterId: string) {
  return `${getCharacterBaseHref(characterId)}/full`;
}

export function isFullSheetPath(pathname: string | null) {
  return pathname === TEAM_FULL_HREF || pathname?.endsWith("/full") === true;
}

export function getPanelIdFromPathname(pathname: string | null) {
  if (!pathname || pathname === "/" || pathname === TEAM_HREF) {
    return TEAM_PANEL_ID;
  }

  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "characters") {
    return TEAM_PANEL_ID;
  }

  if (segments.length === 3 && (segments[2] === "compact" || segments[2] === "full")) {
    return decodeURIComponent(segments[1] ?? "");
  }

  if (segments.length !== 2) {
    return TEAM_PANEL_ID;
  }

  return decodeURIComponent(segments[1] ?? "");
}
