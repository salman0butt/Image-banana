import { afterEach, expect, test } from "bun:test";

const originalWindow = globalThis.window;

afterEach(() => {
  globalThis.window = originalWindow;
});

test("connects the editor store to Redux DevTools", async () => {
  const connectCalls = [];
  const initializedStates = [];
  const sentActions = [];
  const connection = {
    init: (state) => initializedStates.push(state),
    send: (action, state) => sentActions.push({ action, state }),
    subscribe: () => () => {},
  };

  globalThis.window = {
    __REDUX_DEVTOOLS_EXTENSION__: {
      connect: (options) => {
        connectCalls.push(options);
        return connection;
      },
    },
  };

  const { useEditorStore } = await import("./useEditorState");

  expect(connectCalls).toHaveLength(1);
  expect(connectCalls[0]).toEqual({ name: "EditorStore" });
  expect(initializedStates).toHaveLength(1);
  expect(initializedStates[0].image).toBeNull();

  useEditorStore.getState().setImage("data:image/png;base64,test");

  expect(sentActions.at(-1)).toEqual({
    action: { type: "setImage" },
    state: expect.objectContaining({ image: "data:image/png;base64,test" }),
  });
  expect(useEditorStore.getState().history).toEqual(["data:image/png;base64,test"]);
});

test("does not update the store when selecting the active history item", async () => {
  const { useEditorStore } = await import("./useEditorState");

  useEditorStore.getState().setImage("data:image/png;base64,active");
  const stateBeforeSelection = useEditorStore.getState();

  useEditorStore.getState().setHistoryIndex(0);

  expect(useEditorStore.getState()).toBe(stateBeforeSelection);
});
