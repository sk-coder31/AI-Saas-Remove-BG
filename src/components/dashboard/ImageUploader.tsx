import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, X, Download, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ProcessedImage {
  id: string;
  originalFile: File;
  originalUrl: string;
  processedUrl: string;
  status: 'processing' | 'completed' | 'failed';
  fileName: string;
}

const ImageUploader: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<ProcessedImage[]>([]);
  const { user, updateCredits } = useAuth();

  // Background removal API call with improved error handling
  const removeBackground = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file); // Changed from 'image' to 'file' to match backend expectation

    try {
      // Get token from localStorage with null check
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      console.log('Making API request to remove background...');
      
      const response = await fetch('https://springboot-backend-md5u.onrender.com/api/image/remove', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type header when using FormData - browser will set it automatically with boundary
        },
      });

      console.log('Response status:', response.status);

      // Check if response is ok
      if (!response.ok) {
        let errorMessage = 'Processing failed';
        
        try {
          // Try to get error message from response text
          const errorText = await response.text();
          errorMessage = errorText || `Server error: ${response.status}`;
        } catch (parseError) {
          // If response can't be read, use status text
          errorMessage = response.statusText || `HTTP ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      // Check if response is an image (your backend returns image/png)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('image/')) {
        throw new Error('Expected image response from server');
      }

      // Convert response to blob and create object URL
      const blob = await response.blob();
      const processedImageUrl = URL.createObjectURL(blob);
      
      console.log('Successfully processed image');
      return processedImageUrl;

    } catch (error) {
      console.error('Background removal failed:', error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check if the server is running.');
      }
      
      // Re-throw the error to be handled by the caller
      throw error;
    }
  };

  const processImage = async (file: File): Promise<void> => {
    const originalUrl = URL.createObjectURL(file);
    
    const image: ProcessedImage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      originalFile: file,
      originalUrl,
      processedUrl: '',
      status: 'processing',
      fileName: file.name
    };

    setUploadedImages(prev => [...prev, image]);

    try {
      const processedUrl = await removeBackground(file);
      
      // Update image status to completed
      setUploadedImages(prev => 
        prev.map(img => 
          img.id === image.id 
            ? { ...img, processedUrl, status: 'completed' }
            : img
        )
      );

      // Deduct credit
      if (user) {
        updateCredits(user.credits - 1);
      }

      toast.success('Background removed successfully!');
    } catch (error) {
      console.error('Error processing image:', error);
      
      // Update image status to failed
      setUploadedImages(prev => 
        prev.map(img => 
          img.id === image.id 
            ? { ...img, status: 'failed' }
            : img
        )
      );
      
      // Show specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to process image: ${errorMessage}`);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Check authentication
    if (!user) {
      toast.error('Please log in to process images.');
      return;
    }

    if (user.credits <= 0) {
      toast.error('No credits remaining. Please upgrade your plan.');
      return;
    }

    const validFiles = acceptedFiles.filter(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`);
        return false;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 10MB`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    if (validFiles.length > user.credits) {
      toast.error(`You can only process ${user.credits} more images with your remaining credits`);
      return;
    }

    // Process each valid file
    for (const file of validFiles) {
      await processImage(file);
    }
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.bmp', '.tiff']
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const downloadImage = async (processedUrl: string, fileName: string) => {
    try {
      console.log('Downloading image from:', processedUrl);
      
      // Add headers if the URL requires authentication
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      
      if (token && !processedUrl.startsWith('blob:') && !processedUrl.startsWith('data:')) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(processedUrl, {
        headers: headers.Authorization ? headers : undefined,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `processed-${fileName}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to download image: ${errorMessage}`);
    }
  };

  const removeImage = (id: string) => {
    setUploadedImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        // Clean up object URLs to prevent memory leaks
        URL.revokeObjectURL(imageToRemove.originalUrl);
        if (imageToRemove.processedUrl && imageToRemove.processedUrl.startsWith('blob:')) {
          URL.revokeObjectURL(imageToRemove.processedUrl);
        }
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const retryProcessing = async (id: string) => {
    const image = uploadedImages.find(img => img.id === id);
    if (!image) return;

    // Reset status to processing
    setUploadedImages(prev => 
      prev.map(img => 
        img.id === id 
          ? { ...img, status: 'processing' }
          : img
      )
    );

    try {
      const processedUrl = await removeBackground(image.originalFile);
      
      setUploadedImages(prev => 
        prev.map(img => 
          img.id === id 
            ? { ...img, processedUrl, status: 'completed' }
            : img
        )
      );

      toast.success('Image processed successfully!');
    } catch (error) {
      setUploadedImages(prev => 
        prev.map(img => 
          img.id === id 
            ? { ...img, status: 'failed' }
            : img
        )
      );
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Processing failed: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Zone */}
      <motion.div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-purple-500 bg-purple-50 scale-105'
            : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
        }`}
        whileHover={{ scale: isDragActive ? 1.05 : 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          <motion.div 
            className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center"
            animate={isDragActive ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: isDragActive ? Infinity : 0 }}
          >
            <Upload className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <p className="text-xl font-semibold text-gray-700 mb-2">
              {isDragActive ? 'Drop your images here!' : 'Upload your images'}
            </p>
            <p className="text-gray-500 mb-2">
              Drag and drop or click to select images
            </p>
            <p className="text-sm text-gray-400">
              Supports JPG, PNG, WebP, BMP, TIFF • Max 10MB per image
            </p>
          </div>
          {user && (
            <div className="flex items-center space-x-2 text-sm text-purple-600 bg-purple-100 px-4 py-2 rounded-full">
              <span className="font-medium">{user.credits} credits remaining</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Credits Warning */}
      {user && user.credits <= 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"
        >
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">No Credits Remaining</h3>
          <p className="text-red-700 mb-4">
            You've used all your credits. Upgrade your plan to continue processing images.
          </p>
          <a 
            href="/plans" 
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors inline-flex items-center space-x-2"
          >
            <span>Upgrade Plan</span>
          </a>
        </motion.div>
      )}

      {/* Processed Images */}
      <AnimatePresence>
        {uploadedImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800">Your Images</h3>
              <p className="text-sm text-gray-600">
                {uploadedImages.filter(img => img.status === 'completed').length} of {uploadedImages.length} completed
              </p>
            </div>
            
            <div className="space-y-6">
              {uploadedImages.map((image) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          image.status === 'processing' ? 'bg-yellow-400 animate-pulse' :
                          image.status === 'completed' ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {image.fileName}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {image.status === 'processing' && 'Processing...'}
                            {image.status === 'completed' && 'Completed'}
                            {image.status === 'failed' && 'Failed to process'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeImage(image.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Images Side by Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Original Image */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-gray-600">Original</p>
                          <span className="text-xs text-gray-400">
                            {(image.originalFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200">
                          <img
                            src={image.originalUrl}
                            alt="Original"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Processed Image */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-gray-600">Processed</p>
                          {image.status === 'completed' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200 flex items-center justify-center">
                          {image.status === 'processing' && (
                            <div className="text-center">
                              <Loader className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Processing...</p>
                            </div>
                          )}
                          {image.status === 'completed' && image.processedUrl && (
                            <img
                              src={image.processedUrl}
                              alt="Processed"
                              className="w-full h-full object-cover"
                            />
                          )}
                          {image.status === 'failed' && (
                            <div className="text-center">
                              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                              <p className="text-sm text-red-600 mb-3">Processing failed</p>
                              <button
                                onClick={() => retryProcessing(image.id)}
                                className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full hover:bg-red-200 transition-colors"
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {image.status === 'completed' && image.processedUrl && (
                      <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => downloadImage(image.processedUrl, image.fileName)}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <Download className="w-5 h-5" />
                          <span>Download Processed Image</span>
                        </motion.button>
                        
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(image.processedUrl);
                            toast.success('Image URL copied to clipboard!');
                          }}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          Copy URL
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {uploadedImages.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No images uploaded yet</h3>
          <p className="text-gray-500">Upload your first image to get started with AI background removal</p>
        </motion.div>
      )}
    </div>
  );
};

export default ImageUploader;