import adapter from '@sveltejs/adapter-static';
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
			adapter: adapter({
				pages: '../worker/src/ui',
				assets: '../worker/src/ui',
				//pages: 'build',     // 预渲染页面的输出目录，默认为 'build'
				//assets: 'build',    // 静态资源的输出目录，默认与 pages 相同
				fallback: undefined, // 纯静态站点无需 fallback，此项用于 SPA 模式
				precompress: false, // 是否启用 gzip/brotli 预压缩
				strict: true        // 严格模式，确保所有路由都可预渲染
			})
		})
	]
});
