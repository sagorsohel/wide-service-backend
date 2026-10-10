import { Request, Response } from "express";

export const getImageServerConfig = (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      imageServerUrl: process.env.IMAGE_SERVER_URL || "https://image.streamespn.org",
      publicImageBaseUrl: process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "https://image.streamespn.org",
      isConfigured: Boolean(process.env.IMAGE_SERVER_API_KEY),
    },
  });
};
