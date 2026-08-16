import { expect, test } from "bun:test";
import { Navbar } from "./navbar";

function findLogoImage(node) {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (node.props?.src === "/logo.png" && node.props?.alt === "Image's Banana Logo") {
    return node;
  }

  const children = node.props?.children;
  const childNodes = Array.isArray(children) ? children : [children];

  for (const child of childNodes) {
    const logoImage = findLogoImage(child);
    if (logoImage) {
      return logoImage;
    }
  }

  return null;
}

test("suppresses hydration warnings on the logo image mutated by browser extensions", () => {
  const logoImage = findLogoImage(Navbar());

  expect(logoImage).not.toBeNull();
  expect(logoImage.props.suppressHydrationWarning).toBe(true);
});
