import type { Interaction, WorldAssetConfig } from "@/game/types";

/** World convention: 1 unit = 1 metre; Y points up; all asset origins use ground centre. */
export const worldAssets: WorldAssetConfig[] = [
  { id: "building-main", type: "building", source: "procedural", position: [15, 0, -7], rotation: [0, 0, 0], scale: [1, 1, 1], colliderType: "compound" },
  { id: "building-left", type: "building", source: "procedural", position: [-12, 0, -7], rotation: [0, 0, 0], scale: [1, 1, 1], colliderType: "compound" },
];

export const interactions: Interaction[] = [
  { id: "campus-gate-main", label: "Nhấn E để mở cổng", title: "Cổng chính", body: "Cổng chính THPT Kiến An.", position: [0, 1.5, 39.8], radius: 2.5 },
  { id: "campus-gate-left", label: "Nhấn E để mở cổng", title: "Cổng phụ trái", body: "Cổng đi bộ phía trái.", position: [-7.4, 1.5, 39.8], radius: 2.5 },
  { id: "campus-gate-right", label: "Nhấn E để mở cổng", title: "Cổng phụ phải", body: "Cổng đi bộ phía phải.", position: [7.4, 1.5, 39.8], radius: 2.5 },
  { id: "memory-courtyard", label: "Remember", title: "Sân trường", body: "Một khoảng sân đầy nắng và những kỷ niệm tuổi học trò.", position: [0, 1.2, -12], radius: 3 },
];
