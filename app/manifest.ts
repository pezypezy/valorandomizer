import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Valorandomizer — VALORANT Team Randomizer",
    short_name: "Valorandomizer",
    description: "Generate random VALORANT team compositions or draw real pro team compositions for custom games.",
    start_url: "/ja",
    display: "standalone",
    background_color: "#1a242e",
    theme_color: "#ff4655",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
