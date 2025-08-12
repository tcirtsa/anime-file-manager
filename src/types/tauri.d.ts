declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      plugins?: {
        dialog?: any;
      };
    };
  }
}

export {};