/** The two fighters on the big screen in the grip picture, drawn in the art's units, so a player sees it is this game they are pointing at. */
export function BladeScene() {
  return (
    <>
      <rect x="218" y="80" width="80" height="4" rx="2" fill="#3f74ad" />
      <path d="M233 80v-13m0 0l-4 13m4-13 5 -3" className="hold-art__fighter hold-art__fighter--red" />
      <circle cx="233" cy="63" r="3" fill="#ff4757" />
      <path d="M283 80v-13m0 0 4 13m-4-13-5 -3" className="hold-art__fighter hold-art__fighter--green" />
      <circle cx="283" cy="63" r="3" fill="#2ed573" />
    </>
  );
}
