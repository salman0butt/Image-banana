import { expect, test } from "bun:test";
import {
  buildReferenceContent,
  parseReferenceFiles,
} from "./openai-files";

test("normalizes reference files for the OpenAI request", () => {
  expect(
    parseReferenceFiles([
      {
        type: "file",
        mediaType: "image/png",
        filename: "style.png",
        url: " data:image/png;base64,ZmFrZQ== ",
      },
    ]),
  ).toEqual([
    {
      type: "file",
      mediaType: "image/png",
      filename: "style.png",
      url: "data:image/png;base64,ZmFrZQ==",
    },
  ]);
});

test("maps images and documents to Responses content", () => {
  const files = parseReferenceFiles([
    {
      type: "file",
      mediaType: "image/png",
      filename: "style.png",
      url: "data:image/png;base64,ZmFrZQ==",
    },
    {
      type: "file",
      mediaType: "application/pdf",
      filename: "brief.pdf",
      url: "data:application/pdf;base64,ZmFrZQ==",
    },
    {
      type: "file",
      mediaType: "text/plain",
      filename: "notes.txt",
      url: "https://example.com/notes.txt",
    },
  ]);

  expect(buildReferenceContent(files)).toEqual([
    {
      type: "input_image",
      image_url: "data:image/png;base64,ZmFrZQ==",
      detail: "auto",
    },
    {
      type: "input_file",
      file_data: "data:application/pdf;base64,ZmFrZQ==",
      filename: "brief.pdf",
    },
    {
      type: "input_file",
      file_url: "https://example.com/notes.txt",
      filename: "notes.txt",
    },
  ]);
});
