import type { Interaction, WorldAssetConfig } from "@/game/types";

export const worldAssets: WorldAssetConfig[] = [];
/** Accessible viewpoints measured in the V02 Y-up game coordinate system. */
export const interactions: Interaction[] = [
  { id: "memory-courtyard", label: "Ngắm sân trường", title: "Sân trường", body: "Khoảng sân trước, nơi gặp nhau mỗi sáng và lưu giữ những kỷ niệm tuổi học trò.", position: [-3, .86, 28], radius: 3 },
  { id: "memory-stage", label: "Ghé sân khấu", title: "Sân khấu chào cờ", body: "Sân khấu dưới mặt tiền tòa lớp chính, hướng về sân tập trung và cột cờ.", position: [0, .86, 16.8], radius: 2.6 },
  { id: "memory-badminton", label: "Khám phá sân cầu lông", title: "Sân cầu lông", body: "Sân cầu lông phía bên phải sân trước. Đi vòng hai đầu lưới để sang phần sân bên kia.", position: [26.2, .86, 32], radius: 2.4 },
  { id: "memory-rear-yard", label: "Khám phá sân sau", title: "Sân sau có mái che", body: "Khoảng sân phía sau tòa lớp chính, có mái che và những dãy bàn sinh hoạt chung.", position: [-5, .86, -18], radius: 3 },
  { id: "memory-class-photo", label: "Xem ảnh lớp 12A1", title: "Kỷ niệm 12A1", body: "Góc ảnh và bảng kỷ niệm riêng của lớp 12A1. Những gương mặt quen thuộc, những ngày tháng khó quên.", position: [42.7, 1.2, 5.2], radius: 1.8 },
];
