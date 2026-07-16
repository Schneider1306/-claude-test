import { ImageResponse } from "next/og";
import { buildIconElement } from "@/lib/pwa-icon";

export const dynamic = "force-static";

const SIZE = 192;

export async function GET() {
  return new ImageResponse(buildIconElement(SIZE), { width: SIZE, height: SIZE });
}
