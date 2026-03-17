// Minimal ambient declarations to keep strict typechecking workable
// in environments where Node/Jest typings are not installed.
// In a full local dev setup, @types/node and @types/jest will provide richer types.

declare const require: (id: string) => any;
