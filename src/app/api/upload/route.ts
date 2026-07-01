import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;

    // Determine target resource_type for Cloudinary uploads
    // Images are type "image", PDFs/Word/PPT are uploaded as "raw" to preserve attachments download capability
    const isImage = file.type.startsWith("image/");
    const resourceType = isImage ? "image" : "raw";

    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "upskill-program-tracker/attachments",
          resource_type: resourceType,
          public_id: fileName.split(".")[0].replace(/[^a-zA-Z0-9]/g, "_") + "_" + Date.now(),
        },
        (error, result) => {
          if (error) reject(error);
          else if (result) resolve(result as { secure_url: string; public_id: string });
          else reject(new Error("Upload returned undefined result"));
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      resource_type: resourceType
    });
  } catch (error: unknown) {
    console.error("Cloudinary upload route exception:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
