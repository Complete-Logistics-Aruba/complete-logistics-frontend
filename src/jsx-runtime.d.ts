// This declaration ensures JSX works without React in scope
// It tells TypeScript that JSX elements are handled by the runtime

// Using React 17+ automatic JSX transform
declare global {
	namespace JSX {
		interface IntrinsicElements {
			[elemName: string]: Record<string, unknown>;
		}
	}
}
