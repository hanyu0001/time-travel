import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants for image processing
const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.8;

/**
 * Resizes and compresses an image to be suitable for the API.
 */
const prepareImageForApi = async (base64String: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_IMAGE_DIMENSION) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
          width = MAX_IMAGE_DIMENSION;
        }
      } else {
        if (height > MAX_IMAGE_DIMENSION) {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      
      // Get the data URL and strip the prefix to get raw base64
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    img.onerror = (e) => reject(e);
    img.src = base64String;
  });
};

/**
 * Uses Gemini 2.5 Flash Image to edit/transform the user's photo into a historical scene.
 */
export const travelThroughTime = async (
  originalImageBase64: string, 
  eraPrompt: string,
  userInstruction?: string
): Promise<string> => {
  try {
    const cleanBase64 = await prepareImageForApi(originalImageBase64);
    
    // Construct a strong system prompt for style transfer/editing
    const editingPrompt = `
      Instructions: Transform this photo into a historical portrait.
      Time Period/Style: ${eraPrompt}.
      ${userInstruction ? `Additional User Request: ${userInstruction}` : ''}
      
      Requirements:
      1. Keep the person's face, facial features, and expression recognizable (Identity Preservation).
      2. Change the clothing, hairstyle, and background completely to match the requested era.
      3. Apply a visual style (film grain, painting style, or photography style) consistent with that era.
      4. High quality, detailed, atmospheric.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: editingPrompt
          }
        ]
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image generated in the response.");
  } catch (error) {
    console.error("Time travel failed:", error);
    throw error;
  }
};

/**
 * Uses Gemini 2.5 Flash Image to edit images based on natural language instructions.
 */
export const editImage = async (
  originalImageBase64: string,
  instruction: string
): Promise<string> => {
  try {
    const cleanBase64 = await prepareImageForApi(originalImageBase64);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: instruction
          }
        ]
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image generated in the response.");
  } catch (error) {
    console.error("Image editing failed:", error);
    throw error;
  }
};

/**
 * Uses Gemini 3 Pro Preview to analyze the image content.
 */
export const analyzeImage = async (
  imageBase64: string
): Promise<string> => {
  try {
    const cleanBase64 = await prepareImageForApi(imageBase64);

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: "Please analyze this image in detail. Describe the subject, setting, lighting, and any notable features. Provide the response in Simplified Chinese."
          }
        ]
      }
    });

    return response.text || "无法分析该图片。";
  } catch (error) {
    console.error("Image analysis failed:", error);
    return "分析过程中发生错误。";
  }
};

/**
 * Uses Gemini 3 Pro Preview to analyze the generated image and create a backstory.
 */
export const generateBackstory = async (
  generatedImageBase64: string,
  eraName: string
): Promise<string> => {
  try {
    const cleanBase64 = generatedImageBase64.includes(',') 
      ? generatedImageBase64.split(',')[1] 
      : generatedImageBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `Analyze this image which depicts a person in the ${eraName} era. 
            Based on their clothing, setting, and expression, invent a short, witty, and creative 
            historical backstory (max 3 sentences) for this character. 
            Who were they? What was their profession or secret?
            Please provide the response in Simplified Chinese.`
          }
        ]
      }
    });

    return response.text || "一段被历史遗忘的故事...";
  } catch (error) {
    console.error("Backstory generation failed:", error);
    return "历史记载对此一片空白。";
  }
};