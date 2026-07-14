export const REGISTRATION_CARD_ASPECT_RATIO = 3 / 2;

export interface ImageCrop {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export const getCenteredCropForAspect = (
  imageWidth: number,
  imageHeight: number,
  targetAspect = REGISTRATION_CARD_ASPECT_RATIO,
): ImageCrop => {
  if (imageWidth <= 0 || imageHeight <= 0 || targetAspect <= 0) {
    throw new Error('Invalid image dimensions.');
  }

  const imageAspect = imageWidth / imageHeight;
  if (imageAspect > targetAspect) {
    const width = Math.round(imageHeight * targetAspect);
    return {
      originX: Math.round((imageWidth - width) / 2),
      originY: 0,
      width,
      height: imageHeight,
    };
  }

  const height = Math.round(imageWidth / targetAspect);
  return {
    originX: 0,
    originY: Math.round((imageHeight - height) / 2),
    width: imageWidth,
    height,
  };
};
