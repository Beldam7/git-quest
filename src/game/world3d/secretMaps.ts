/** Secret-mission maps: one hidden arena per secret mission. Pure data (no 3D imports) so the HUD can use it. */
export interface SecretMapInfo {
  id: number;
  challengeId: string;
  name: string;
  guardian: string;
  accent: string;
  blurb: string;
}

export const SECRET_MAPS: SecretMapInfo[] = [
  { id: 101, challengeId: 'sm_ghost_commit', name: 'The Whispering Crypt', guardian: 'The Ghost of Lost Commits', accent: '#9fe8ff', blurb: 'A mist-wrapped graveyard where forgotten commits drift as lost souls.' },
  { id: 102, challengeId: 'sm_silent_guardian', name: 'The Moonlit Sanctum', guardian: 'The Silent Sentinel', accent: '#c4b5fd', blurb: 'A hidden garden of warding stones that keep secrets out of sight.' },
  { id: 103, challengeId: 'sm_gate_crasher', name: 'The Shattered Gatehouse', guardian: 'The Gate Crasher Ogre', accent: '#fbbf24', blurb: 'A ruined gatehouse above a gorge; the rejected push waits at the portcullis.' },
  { id: 104, challengeId: 'sm_clean_timeline', name: 'The Tangled Spire', guardian: 'The Tangled Chronomancer', accent: '#7df9ff', blurb: 'Floating platforms and knotted ribbons of time that need straightening.' },
];

export const secretMapForChallenge = (challengeId: string | null | undefined): SecretMapInfo | undefined =>
  challengeId ? SECRET_MAPS.find((m) => m.challengeId === challengeId) : undefined;
