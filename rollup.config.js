import typescript from "rollup-plugin-typescript2";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import minifyPrivatesTransformer from "ts-transformer-minify-privates";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.js",
      format: "esm",
      sourcemap: true,
    },
    {
      file: "dist/index.min.js",
      format: "esm",
      sourcemap: true,
      plugins: [
        terser({
          ecma: 2020,
          module: true,
          toplevel: true,
          compress: {
            passes: 5,
            unsafe: true,
            unsafe_math: true,
            unsafe_methods: true,
            pure_getters: true,
            keep_fargs: false,
            drop_console: true,
            drop_debugger: true,
          },
          mangle: {
            properties: {
              regex: /^_/,
              reserved: ["__esModule"],
            },
          },
          format: {
            comments: false,
            preserve_annotations: false,
          },
        }),
      ],
    },
  ],
  plugins: [
    nodeResolve({ extensions: [".js", ".ts"] }),
    typescript({
      tsconfig: "tsconfig.json",
      useTsconfigDeclarationDir: true,
      transformers: [
        (service) => ({
          before: [minifyPrivatesTransformer.default(service.getProgram())],
          after: [],
        }),
      ],
    }),
  ],
  external: [],
};
