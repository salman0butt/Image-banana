import { expect, test } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Slider } from "./slider";

test("applies the accessible name to the slider thumb", () => {
  const html = renderToStaticMarkup(
    React.createElement(Slider, {
      value: [25],
      min: 5,
      max: 100,
      "aria-label": "Brush size",
    }),
  );

  const thumb = html.match(/<span[^>]*data-slot="slider-thumb"[^>]*>/)?.[0];

  expect(thumb).toBeDefined();
  expect(thumb).toContain('role="slider"');
  expect(thumb).toContain('aria-label="Brush size"');
});
