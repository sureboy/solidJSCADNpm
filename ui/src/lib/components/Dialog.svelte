<!-- Dialog.svelte -->
<script lang="ts" module >
    let dialogEl:HTMLDialogElement|undefined = undefined; 
    let confirmSelf:(()=>void)|undefined = $state(undefined)
    let open = false 
    export function openModal(confirmModal?:()=>void) {
        confirmSelf = confirmModal;
        if (open)return;
        open = true; 
        if (dialogEl) dialogEl.showModal(); 
    }
    export function closeModal() {
        open = false;
        //console.log("close modal")
        if (dialogEl) dialogEl.close(); 
    } 
</script>
<script lang="ts">
  import { onMount } from 'svelte';
  const {
        title,
        closeOnBackdrop,
        closeOnEsc,
        children
    }:{title?:string,closeOnBackdrop?:boolean,closeOnEsc?:boolean,children?:any} = $props()
    //let open = false;           // 控制弹出框显示/隐藏
    //export let title = '提示';          // 标题
    //export let closeOnBackdrop = true; // 点击遮罩是否关闭
    //export let closeOnEsc = true;      // 按 ESC 是否关闭



    // 监听 open 变化，同步调用原生 dialog 方法


    // 点击遮罩关闭
    function handleBackdropClick(e:any) {
        if (closeOnBackdrop && e.target === dialogEl) {
            closeModal();
        }
    }

    // 按 ESC 关闭（原生 dialog 已支持，这里手动同步状态）
    //function handleClose() {
    //    closeModal()
        //if (open) open = false;
    //}

    // 监听键盘 ESC（确保状态同步）
    function handleKeyDown(e:any) {
        if (closeOnEsc && e.key === 'Escape' ) {
            closeModal();
        }
    }

    onMount(() => { 
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });
</script>

<dialog   bind:this={dialogEl} onclick={handleBackdropClick} >
    <div class="dialog-card">
        {#if title}
            <h3 class="dialog-title">{title}</h3>
        {/if}
        <div class="dialog-content">
            {#if children}
             {@render children()}
             {:else}
              <!-- 默认内容：一段文字 + 超链接 -->
                <p><a href="https://www.example.com" target="_blank" rel="noopener noreferrer"> 这是一个简洁弹出框，支持超链接。</a></p>
                <a href="https://www.example.com" target="_blank" rel="noopener noreferrer">访问示例网站 ↗</a>
            {/if} 
        </div>

        <div class="dialog-actions">
            {#if confirmSelf} 
            <button onclick={()=>{
                confirmSelf?.()
                closeModal()
            }} class="dialog-btn">确定</button> 
            {/if}
            <button onclick={closeModal} class="dialog-btn">关闭</button>
        </div>
    </div>
</dialog>

<style>
    dialog {
        border: none;
        border-radius: 28px;
        padding: 0;
        background: transparent;
        max-width: 420px;
        width: 90%;
        animation: fadeIn 0.2s ease-out;
    }

    dialog::backdrop {
        background-color: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(3px);
    }

    .dialog-card {
        background: white;
        border-radius: 28px;
        padding: 1.8rem;
        text-align: center;
        box-shadow: 0 20px 35px rgba(0, 0, 0, 0.2);
    }

    .dialog-title {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: #1e2a3e;
    }

    .dialog-content {
        margin: 1rem 0;
        color: #2c3e44;
        line-height: 1.5;
    }
.dialog-content p a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #eef2ff;
        padding: 6px 16px;
        border-radius: 60px;
        text-decoration: none;
        color: #1e4a76;
        font-weight: 500;
        margin-top: 0.5rem;
        transition: background 0.2s;
    }

    .dialog-content p a:hover {
        background: #e0e8ff;
        text-decoration: underline;
    }
    .dialog-content a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #eef2ff;
        padding: 6px 16px;
        border-radius: 60px;
        text-decoration: none;
        color: #1e4a76;
        font-weight: 500;
        margin-top: 0.5rem;
        transition: background 0.2s;
    }

    .dialog-content a:hover {
        background: #e0e8ff;
        text-decoration: underline;
    }

    .dialog-actions {
        margin-top: 1.2rem;
    }

    .dialog-btn {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        padding: 6px 20px;
        border-radius: 40px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .dialog-btn:hover {
        background: #e2e8f0;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: scale(0.96);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>