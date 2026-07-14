import { getCenteredCropForAspect, REGISTRATION_CARD_ASPECT_RATIO } from '../registrationCardImage';

describe('registration card image crop', () => {
  it('crops a portrait camera image to the centered 3:2 card frame', () => {
    expect(getCenteredCropForAspect(3000, 4000)).toEqual({
      originX: 0,
      originY: 1000,
      width: 3000,
      height: 2000,
    });
  });

  it('crops a wide image horizontally', () => {
    expect(getCenteredCropForAspect(4000, 2000)).toEqual({
      originX: 500,
      originY: 0,
      width: 3000,
      height: 2000,
    });
  });

  it('keeps an image that already matches the card ratio', () => {
    const crop = getCenteredCropForAspect(900, 600);
    expect(crop).toEqual({ originX: 0, originY: 0, width: 900, height: 600 });
    expect(crop.width / crop.height).toBe(REGISTRATION_CARD_ASPECT_RATIO);
  });

  it('rejects invalid dimensions', () => {
    expect(() => getCenteredCropForAspect(0, 600)).toThrow('Invalid image dimensions.');
  });
});
