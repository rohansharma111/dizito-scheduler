import cloudinary
from "@/lib/cloudinary";

export async function POST(
  request: Request
) {

  const formData =
    await request.formData();

  const file =
    formData.get("file") as File;

  if (!file) {
    return Response.json(
      { error: "No file" },
      { status: 400 }
    );
  }

  const bytes =
    await file.arrayBuffer();

  const buffer =
    Buffer.from(bytes);

  const base64 =
    `data:${file.type};base64,${buffer.toString("base64")}`;

  const result =
    await cloudinary.uploader.upload(
      base64,
      {
        folder:
          "dizito-scheduler",
      }
    );

  return Response.json({
    url:
      result.secure_url,
  });

}