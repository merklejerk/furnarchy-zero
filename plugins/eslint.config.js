import tseslint from "typescript-eslint";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default tseslint.config(
	{
		ignores: ["eslint.config.js"],
	},
	js.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	prettier,
	{
		plugins: {
			prettier: prettierPlugin,
		},
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
			globals: {
				Furnarchy: "readonly",
				window: "readonly",
				crypto: "readonly",
				WebSocket: "readonly",
				TextEncoder: "readonly",
				TextDecoder: "readonly",
				DataView: "readonly",
				Uint8Array: "readonly",
				ArrayBuffer: "readonly",
				MessageEvent: "readonly",
				document: "readonly",
				console: "readonly",
			},
		},
		rules: {
			"prettier/prettier": "error",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/triple-slash-reference": "off",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/await-thenable": "error",
			"prefer-const": "error",
			"no-empty": "error",
		},
	}
);
