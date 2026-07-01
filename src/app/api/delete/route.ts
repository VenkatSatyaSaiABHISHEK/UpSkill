import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { publicId, resourceType } = await req.json();

    if (!publicId) {
      return NextResponse.json({ error: "Missing publicId parameter" }, { status: 400 });
    }

    let result;
    if (resourceType) {
      // If resourceType is explicitly supplied, delete using it
      result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } else {
      // Otherwise call in parallel to handle both raw attachments and images
      const [resImg, resRaw] = await Promise.all([
        cloudinary.uploader.destroy(publicId, { resource_type: "image" }),
        cloudinary.uploader.destroy(publicId, { resource_type: "raw" }),
      ]);
      result = { resImg, resRaw };
    }

    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    console.error("Cloudinary delete route exception:", error);
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
