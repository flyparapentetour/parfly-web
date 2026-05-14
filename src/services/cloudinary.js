const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'parfly_gallery'

export const isCloudinaryConfigured = () => Boolean(CLOUD_NAME)

export async function uploadImage(file) {
  if (!CLOUD_NAME) {
    throw new Error(
      'Cloudinary no está configurado. Define VITE_CLOUDINARY_CLOUD_NAME en .env.local',
    )
  }
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cloudinary upload falló: ${text}`)
  }
  const data = await res.json()
  return {
    url: data.secure_url,
    cloudinaryId: data.public_id,
    width: data.width,
    height: data.height,
  }
}
