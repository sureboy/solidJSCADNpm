/**
 * 全屏 & 屏幕常亮 一体化管理器
 * 功能：进入全屏时自动防止熄屏，退出全屏（含ESC）时自动恢复系统熄屏策略
 */
class FullscreenWakeLockManager {
  // 私有属性：WakeLockSentinel 是 DOM 内置类型
  private wakeLock: WakeLockSentinel | null = null;

  // 绑定事件处理函数的 this 上下文
  private readonly handleFullscreenChange: () => void;
  private readonly handleVisibilityChange: () => void;

  constructor() {
    // 绑定 this，确保在 addEventListener 中调用时上下文正确
    this.handleFullscreenChange = this.onFullscreenChange.bind(this);
    this.handleVisibilityChange = this.onVisibilityChange.bind(this);

    // 监听全屏变化事件
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    // 监听页面可见性变化（解决切后台锁丢失问题）
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * 核心：请求屏幕唤醒锁（防止熄屏）
   * @returns {Promise<boolean>} 是否成功获取锁
   */
  private async requestWakeLock(): Promise<boolean> {
    // 1. 检查浏览器是否支持
    if (!('wakeLock' in navigator)) {
      console.warn('当前浏览器不支持 Screen Wake Lock API');
      return false;
    }

    // 2. 如果已有锁，不重复申请
    if (this.wakeLock) {
      return true;
    }

    try {
      // 3. 发起请求
      this.wakeLock = await navigator.wakeLock.request('screen');
      
      // 4. 监听锁被系统强制释放（如切到后台）
      this.wakeLock.addEventListener('release', () => {
        console.log('⏳ 唤醒锁被系统释放（如切后台）');
        this.wakeLock = null;
      });

      console.log('✅ 屏幕常亮已开启');
      return true;
    } catch (error) {
      // 错误类型：NotAllowedError, NotSupportedError 等
      const err = error as Error;
      console.warn(`❌ 获取唤醒锁失败: ${err.name} - ${err.message}`);
      this.wakeLock = null;
      return false;
    }
  }

  /**
   * 手动释放唤醒锁（恢复系统默认熄屏策略）
   */
  private releaseWakeLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release()
        .then(() => {
          console.log('🔓 屏幕常亮已关闭，恢复系统默认熄屏');
          this.wakeLock = null;
        })
        .catch((error) => {
          console.warn('释放唤醒锁失败:', error);
        });
    }
  }

  /**
   * 进入全屏（必须在用户手势事件中调用）
   * @param element 需要全屏的元素，默认 html 根节点
   * @returns {Promise<void>}
   */
  public async enterFullscreen(element: HTMLElement = document.documentElement): Promise<void> {
    try {
      // 如果已经在全屏状态，直接返回
      if (document.fullscreenElement) {
        console.warn('页面已处于全屏状态');
        return;
      }
      await element.requestFullscreen();
      // 注意：申请锁的逻辑将在 onFullscreenChange 事件中触发，因为它是异步的
      // 但为了保险，如果事件没触发，这里兜底调用一下
      if (document.fullscreenElement) {
        await this.requestWakeLock();
      }
    } catch (error) {
      const err = error as Error;
      console.warn(`全屏请求被拒绝: ${err.message}`);
    }
  }

  /**
   * 退出全屏（无需用户手势）
   * @returns {Promise<void>}
   */
  public async exitFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      // 锁的释放由 onFullscreenChange 事件处理，此处无需额外操作
    }
  }

  /**
   * 事件处理器：监听全屏状态变化
   * 进入全屏 -> 开锁；退出全屏（ESC触发） -> 释放锁
   */
  private async onFullscreenChange(): Promise<void> {
    if (document.fullscreenElement) {
      // 进入全屏：开启防熄屏
      await this.requestWakeLock();
    } else {
      // 退出全屏（包括按 ESC）：关闭防熄屏，恢复默认
      this.releaseWakeLock();
    }
  }

  /**
   * 事件处理器：监听页面可见性变化
   * 解决用户切到其他 App 再回来时，锁丢失但全屏状态仍在的问题
   */
  private async onVisibilityChange(): Promise<void> {
    // 当页面可见、处于全屏状态、但锁却意外丢失时，重新申请
    if (
      document.visibilityState === 'visible' &&
      document.fullscreenElement &&
      !this.wakeLock
    ) {
      console.log('🔄 检测到页面切回前台，且在全屏状态，重新申请唤醒锁');
      await this.requestWakeLock();
    }
  }

  /**
   * 销毁管理器，移除所有事件监听，释放锁（主要用于 React/Vue 组件卸载时）
   */
  public destroy(): void {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
    console.log('🧹 FullscreenWakeLockManager 已清理');
  }
}

// 导出供外部使用（如果你在模块环境中）
export default FullscreenWakeLockManager;