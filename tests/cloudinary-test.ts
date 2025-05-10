require('dotenv').config();
import * as fs from 'fs';
import * as path from 'path';
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/cloudinary';

async function testCloudinaryUpload() {
  try {
    // Path to a test image file
    const testImagePath = path.join(__dirname, '../public/next.svg');
    
    // Read the file as a buffer
    const imageBuffer = fs.readFileSync(testImagePath);
    
    console.log('Starting Cloudinary upload test...');
    console.log('Environment variables loaded:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
      apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
    });
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(imageBuffer, {
      folder: 'tests',
      resource_type: 'image',
      public_id: `test-${Date.now()}` // Unique ID to avoid conflicts
    });
    
    console.log('Upload successful!');
    console.log('Secure URL:', result.secure_url);
    console.log('Public ID:', result.public_id);
    
    // Optional: Test deletion
    console.log('Testing deletion...');
    const deleteResult = await deleteFromCloudinary(result.public_id, 'image');
    console.log('Deletion result:', deleteResult ? 'Success' : 'Failed');
    
    return result;
  } catch (error) {
    console.error('Cloudinary test failed:', error);
    throw error;
  }
}

// Run the test
testCloudinaryUpload()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err));