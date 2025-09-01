// cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Cargar variables de entorno desde .env
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // tu Cloud Name
  api_key: process.env.CLOUDINARY_API_KEY,       // tu API Key
  api_secret: process.env.CLOUDINARY_API_SECRET, // tu API Secret
});

export default cloudinary;

