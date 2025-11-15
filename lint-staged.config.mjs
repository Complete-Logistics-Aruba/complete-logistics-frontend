// lint-staged.config.mjs
export default {
	// Format all files with Prettier
	"**/*.{js,jsx,ts,tsx,json,md,mdx,css,html,yml,yaml,scss}": ["prettier --write"],

	// Lint and fix TypeScript/JavaScript files
	"**/*.{js,jsx,ts,tsx}": ["eslint --fix"],

	// Type check TypeScript files
	"**/*.{ts,tsx}": () => "tsc --noEmit",
};
