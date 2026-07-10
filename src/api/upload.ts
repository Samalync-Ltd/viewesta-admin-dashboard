import axios from "axios";
import { api } from "./client";

export interface PresignedUrlResponse {
  uploadUrl: string;
  assetUrl: string;
  s3Key: string;
}

export const uploadApi = {
  getPresignedUrl: async (
    file: File,
    assetType: string = "video"
  ): Promise<PresignedUrlResponse> => {
    const payload = {
      asset_type: assetType,
      content_type: file.type || "application/octet-stream",
      file_name: file.name,
      file_size: file.size,
    };

    const { data } = await api.post("/movies/upload-url", payload);
    const uploadData = data.data?.upload || data.data;

    return {
      uploadUrl: uploadData.upload_url || uploadData.uploadUrl || uploadData.url,
      assetUrl: uploadData.asset_url || uploadData.assetUrl,
      s3Key: uploadData.s3_key || uploadData.object_key || uploadData.objectKey,
    };
  },

  uploadToS3: async (
    uploadUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ) => {
    // We use a raw axios instance to prevent our api interceptors from injecting Authorization 
    // headers that S3 will reject (CORS / Signature mismatch)
    return axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },

  uploadFileFlow: async (
    file: File,
    assetType: string,
    onProgress?: (progress: number) => void
  ) => {
    const presigned = await uploadApi.getPresignedUrl(file, assetType);
    if (!presigned.uploadUrl) {
      throw new Error(`No upload URL returned for ${assetType}`);
    }

    await uploadApi.uploadToS3(presigned.uploadUrl, file, onProgress);

    return {
      fileUrl: presigned.assetUrl || presigned.uploadUrl.split("?")[0],
      s3Key: presigned.s3Key,
      fileSize: file.size,
    };
  },
};
