/*
  IMPORTANT:
  - Do NOT put your Cloudinary API Secret in frontend code.
  - Create an UNSIGNED upload preset from Cloudinary settings.
  - Put its name below.

  Your cloud name from the screenshot appears to be: dbpzeqzvl
*/

const CLOUDINARY_CLOUD_NAME = "dbpzeqzvl";
const CLOUDINARY_UPLOAD_PRESET = "lateagain_profiles"; // Change this to your unsigned upload preset name.

export async function uploadProfilePicture(file) {
  if (!file) return "";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "lateagain_profiles");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Cloudinary upload failed. Check your unsigned upload preset.");
  }

  return data.secure_url;
}
