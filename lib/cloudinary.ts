import { v2 as cloudinary } from 'cloudinary';
import { UploadApiOptions } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Always use HTTPS
});

interface UploadOptions extends Omit<UploadApiOptions, 'resource_type'> {
  resource_type?: 'auto' | 'image' | 'video' | 'raw';
  folder?: string;
  public_id?: string;
  overwrite?: boolean;
}

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  width?: number;
  height?: number;
  folder?: string;
  thumbnail_url?: string;
}

// At the top of the file after the config
console.log('Cloudinary Configuration:', {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
  apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
  apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
});

// In the uploadToCloudinary function
export const uploadToCloudinary = (buffer: Buffer, options: UploadOptions = {}): Promise<CloudinaryResponse> => {
  console.log('Starting Cloudinary upload with options:', {
    resourceType: options.resource_type,
    folder: options.folder,
    bufferSize: buffer.length
  });

  return new Promise((resolve, reject) => {
    const uploadOptions: UploadApiOptions = {
      resource_type: options.resource_type || 'auto',
      folder: options.folder || 'events',
      public_id: options.public_id,
      overwrite: options.overwrite !== undefined ? options.overwrite : true,
      ...options
    };
    
    cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
        reject(new Error(error?.message || 'Upload failed'));
      } else if (!result) {
        console.error('No result from Cloudinary');
        reject(new Error('Upload failed - no result'));
      } else {
        console.log('Cloudinary upload successful:', {
          publicId: result.public_id,
          url: result.secure_url
        });
        resolve(result as unknown as CloudinaryResponse);
      }
    }).end(buffer);
  });
};

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