export const TEAM_PANEL_ID = "__team__";
export const TEAM_HREF = "/team";
export const CHARACTER_HREF_PREFIX = "/characters";
export const COMBAT_HREF = "/combat";
export const SHIP_COMBAT_HREF = "/combat/ship";

export function getCharacterHref(characterId: string) {
  return `${CHARACTER_HREF_PREFIX}/${encodeURIComponent(characterId)}`;
}

export function getPanelIdFromPathname(pathname: string | null) {
  if (!pathname || pathname === "/" || pathname === TEAM_HREF) {
    return TEAM_PANEL_ID;
  }

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length !== 2 || segments[0] !== "characters") {
    return TEAM_PANEL_ID;
  }

  return decodeURIComponent(segments[1] ?? "");
}
