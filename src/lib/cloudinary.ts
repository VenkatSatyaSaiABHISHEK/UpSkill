export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
  apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "",
};

/**
 * Generate a formatted Cloudinary image URL for a given public ID
 */
export function getCloudinaryUrl(publicId: string, options: { width?: number; height?: number; crop?: string } = {}) {
  if (!cloudinaryConfig.cloudName) {
    return publicId; // Return original if not configured
  }
  
  const transformations: string[] = [];
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  
  const transString = transformations.length > 0 ? `${transformations.join(",")}/` : "";
  return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/${transString}${publicId}`;
}
