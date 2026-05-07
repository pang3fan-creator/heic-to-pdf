declare module "libheif-js/wasm-bundle" {
  class HeifDecoder {
    decode(buffer: ArrayBuffer): HeifImage[];
  }

  interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(data: { data: Uint8Array }, callback: (result?: { data: Uint8Array }) => void): void;
  }

  declare const _default: {
    HeifDecoder: typeof HeifDecoder;
  };

  export default _default;
}
