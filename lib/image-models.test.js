import { expect, test } from "bun:test";
import {
  DEFAULT_IMAGE_MODEL_ID,
  getDefaultImageModelPreset,
  getImageModelPreset,
  getPublicImageModelPresets,
} from "./image-models";

test("resolves only allowlisted image model presets", () => {
  expect(getImageModelPreset("gpt-image-2-fast")?.providerModel).toBe("gpt-image-2");
  expect(getImageModelPreset("gpt-image-2-quality")?.quality).toBe("high");
  expect(getImageModelPreset("gpt-image-1")).toBeNull();
  expect(getImageModelPreset("../../arbitrary-model")).toBeNull();
});

test("default model is present in the server catalog", () => {
  expect(getDefaultImageModelPreset().id).toBe(DEFAULT_IMAGE_MODEL_ID);
});

test("public model data does not expose provider configuration", () => {
  const presets = getPublicImageModelPresets();

  expect(presets).toHaveLength(3);
  for (const preset of presets) {
    expect(preset.creditCost).toBeGreaterThan(0);
    expect("providerModel" in preset).toBe(false);
    expect("quality" in preset).toBe(false);
  }
});
