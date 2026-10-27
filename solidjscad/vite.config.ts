//import adapter from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-node'; 
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			 
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			prerender: {
				handleHttpError: 'warn' // 遇到 HTTP 错误时仅发出警告，不中断构建
			},
			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			//adapter: adapter()
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				// 纯静态站点无需 fallback
				fallback: undefined,
				precompress: false,
				strict: true
			})
		})
	]
});
