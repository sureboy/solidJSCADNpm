<script lang="ts">
   import { onMount } from 'svelte';

  // 菜单项列表
  const menuItems_ = [
    { key: 'start', label: '开始',url:"/edit/" },
    { key: 'help', label: '文档',url:"/docs/" }
  ];
let { menuItems }: { menuItems:{key:string,label:string,url:string,click?:(e?:any)=>void,active?:boolean}[]}  = $props();
  // 当前激活的菜单项 key
  let activeKey = $state('start');
  // 移动端菜单是否展开（默认折叠，节省空间）
  let menuOpen = $state(false);
  // 是否为移动端视图（宽度 ≤ 768px）
  let isMobile =$state( false);

  // 切换激活菜单
  function setActive(key:string) {
    activeKey = key;
    // 移动端点击菜单项后自动收起菜单
    if (isMobile) {
      menuOpen = false;
    }
    console.log(`[导航] 当前选中：「${key}」`);
  }

  // 切换菜单展开/收起
  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  // 监听窗口大小变化，更新 isMobile 状态，并自动处理菜单展开
  function checkViewport() {
    const mobileBreakpoint = 768;
    const newIsMobile = window.innerWidth <= mobileBreakpoint;
    if (newIsMobile !== isMobile) {
      isMobile = newIsMobile;
      // 切换到桌面端时，强制展开菜单；切换到移动端时，折叠菜单（节省空间）
      if (!isMobile) {
        menuOpen = true;
      } else {
        menuOpen = false;
      }
    }
  }

  onMount(() => {
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => {
      window.removeEventListener('resize', checkViewport);
    };
  });
</script>
<nav class="nav-bar" aria-label="主导航">
  <div class="nav-container">
    <!-- 头部区域：品牌 + 移动端汉堡按钮 -->
    <div class="nav-header">
      
      <div class="brand" aria-label="站点标识">
        <!-- Logo 图标：简约菱形 -->
        <img alt="SolidJScad" class="logo-icon" src="/favicon.png" />  
        <span>SolidJScad</span>
        
      </div>
      <button
        class="hamburger"
        class:active={menuOpen}
        onclick={toggleMenu}
        aria-label="菜单"
        aria-expanded={menuOpen}
      >
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>
    </div>

    <!-- 菜单区域：根据 isMobile + menuOpen 控制显示/隐藏 -->
    <div class="menu" class:menu-visible={!isMobile || menuOpen}>
      <ul class="nav-links" role="list">
        {#each menuItems as item}
          <li
            class="nav-item"
            class:active={ item.active}
            role="listitem"
          >
            <a
              href="{item.url}"
              class="nav-link"
              
              onclick = {()=>{
                item.click?.()
              }}  
            >
              {item.label}
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</nav>

<style>
  /* ---------- RESET & 基础样式 ---------- */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .nav-bar {
    background-color: #ffffff;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03);
    border-bottom: 1px solid #eef2f6;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    min-height: 4rem;
    transition: all 0.2s ease;
  }

  /* 头部区域：品牌 + 汉堡 */
  .nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: auto;
  }

  /* 品牌标识 */
  .brand {
    font-size: 1.35rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    background: linear-gradient(135deg, #1e3c72, #2a5298);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    cursor: default;
  }

  /* 汉堡按钮 (默认隐藏，仅移动端显示) */
  .hamburger {
    display: none;
    flex-direction: column;
    justify-content: space-between;
    width: 26px;
    height: 20px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-left: 1rem;
  }

  .hamburger-line {
    width: 100%;
    height: 2px;
    background-color: #374151;
    border-radius: 2px;
    transition: all 0.2s ease;
  }

  /* 汉堡按钮激活样式（菜单展开时叉号效果） */
  .hamburger.active .hamburger-line:nth-child(1) {
    transform: translateY(9px) rotate(45deg);
  }
  .hamburger.active .hamburger-line:nth-child(2) {
    opacity: 0;
  }
  .hamburger.active .hamburger-line:nth-child(3) {
    transform: translateY(-9px) rotate(-45deg);
  }

  /* 菜单区域 */
  .menu {
    display: flex;
    align-items: center;
  }

  .nav-links {
    display: flex;
    gap: 0.5rem;
    list-style: none;
  }

  .nav-item {
    position: relative;
  }

  .nav-link {
    display: inline-block;
    padding: 0.6rem 1.2rem;
    font-size: 1rem;
    font-weight: 500;
    color: #374151;
    text-decoration: none;
    border-radius: 48px;
    transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
    letter-spacing: 0.3px;
    cursor: pointer;
  }

  .nav-link:hover {
    background-color: #f3f4f6;
    color: #111827;
    transform: translateY(-1px);
  }

  .nav-link:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    border-radius: 48px;
    background-color: #f0f9ff;
  }

  .nav-link:active {
    transform: scale(0.97);
    transition: 0.05s;
  }

  /* 激活状态样式（桌面） */
  .nav-item.active .nav-link {
    background: #eef2ff;
    color: #1e40af;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  }

  .nav-item.active .nav-link::after {
    content: '';
    position: absolute;
    bottom: 6px;
    left: 1.2rem;
    right: 1.2rem;
    height: 2px;
    background: #3b82f6;
    border-radius: 2px;
    opacity: 0.7;
  }

  /* ----- 移动端响应式样式 (宽度 ≤ 768px) ----- */
  @media screen and (max-width: 768px) {
    .nav-container {
      flex-direction: column;
      align-items: stretch;
      padding: 0.5rem 1rem;
      gap: 0;
      min-height: auto;
    }

    .nav-header {
      width: 100%;
      padding: 0.4rem 0;
    }

    /* 显示汉堡按钮 */
    .hamburger {
      display: flex;
    }

    /* 菜单默认隐藏，通过 .menu-visible 类控制显示 */
    .menu {
      width: 100%;
      overflow: hidden;
      transition: max-height 0.3s ease-out, opacity 0.2s ease;
      max-height: 0;
      opacity: 0;
      visibility: hidden;
    }

    .menu.menu-visible {
      max-height: 300px;  /* 足够容纳三个菜单项 */
      opacity: 1;
      visibility: visible;
      margin-top: 0.5rem;
    }

    .nav-links {
      flex-direction: column;
      width: 100%;
      gap: 0.25rem;
      align-items: stretch;
    }

    .nav-item {
      width: 100%;
      text-align: center;
    }

    .nav-link {
      display: block;
      width: 100%;
      padding: 0.55rem 0.5rem;
      font-size: 0.95rem;
      border-radius: 40px;
      background-color: #ffffff;
      border: 1px solid #f0f2f5;
    }

    .nav-link:hover {
      background-color: #f8fafc;
      transform: none;
    }

    /* 移动端激活样式优化 */
    .nav-item.active .nav-link {
      background: #eef2ff;
      border-color: #cbdffc;
    }

    .nav-item.active .nav-link::after {
      display: none;
    }

    .nav-item.active .nav-link {
      border-left: 3px solid #3b82f6;
      border-radius: 40px;
      font-weight: 600;
    }

    /* 品牌字体微调 */
    .brand {
      font-size: 1.2rem;
    }
  }

  /* 超小屏幕进一步紧凑（≤480px） */
  @media screen and (max-width: 480px) {
    .nav-container {
      padding: 0.4rem 0.75rem;
    }
    .nav-link {
      padding: 0.45rem 0.4rem;
      font-size: 0.9rem;
    }
    .brand {
      font-size: 1.1rem;
    }
    .menu.menu-visible {
      max-height: 280px;
    }
  }

  /* 桌面宽屏保持原样 (≥769px) */
  @media screen and (min-width: 769px) {
    /* 确保菜单始终可见 */
    .menu {
      display: flex;
    }
    .nav-header {
      width: auto;
    }
    .hamburger {
      display: none;
    }
  }

  /* 大屏宽屏舒适间距 */
  @media screen and (min-width: 1440px) {
    .nav-container {
      padding: 0 2rem;
    }
    .nav-link {
      padding: 0.65rem 1.4rem;
    }
  }
    .brand {
      font-size: 1.2rem;
      gap: 0.35rem;
    }
    .logo-icon {
      width: 1.3rem;
      height: 1.3rem;
    }
</style>

