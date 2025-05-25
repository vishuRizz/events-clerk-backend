import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Always use HTTPS
});

interface CloudinaryResponse {
  success: boolean;
  url?: string;
  thumbnail_url?: string;
  error?: string;
  secure_url?: string;
  public_id?: string;
}

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  width?: number;
  height?: number;
  folder?: string;
}

// At the top of the file after the config
console.log('Cloudinary Configuration:', {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
  apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
  apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
});

// In the uploadToCloudinary function
export async function uploadToCloudinary(file: Buffer, options?: Record<string, unknown>): Promise<CloudinaryResponse> {
  try {
    // Upload to Cloudinary
    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'events/resources',
          ...options
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryUploadResult);
        }
      ).end(file);
    });
    
    if (!result || !result.secure_url) {
      throw new Error('Upload failed: No URL returned');
    }
    
    return {
      success: true,
      url: result.secure_url,
      thumbnail_url: result.secure_url,
      secure_url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

// Add a utility function to delete files
export const deleteFromCloudinary = async (publicId: string, resourceType: 'auto' | 'image' | 'video' | 'raw' = 'image'): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};