// script.js (V8.26 - 红包功能终极修复版)
document.addEventListener('DOMContentLoaded', () => {

    // --- IndexedDB 数据库助手 ---
    const db = {
        _db: null,
        init: function() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('AIChatAppDB', 1);
                request.onerror = (event) => reject("数据库打开失败: " + event.target.errorCode);
                request.onsuccess = (event) => {
                    this._db = event.target.result;
                    console.log("数据库初始化成功");
                    resolve();
                };
                request.onupgradeneeded = (event) => {
                    const dbInstance = event.target.result;
                    if (!dbInstance.objectStoreNames.contains('images')) {
                        dbInstance.createObjectStore('images');
                    }
                };
            });
        },
        saveImage: function(key, blob) {
            return new Promise((resolve, reject) => {
                if (!this._db) return reject("数据库未初始化");
                const transaction = this._db.transaction(['images'], 'readwrite');
                const store = transaction.objectStore('images');
                const request = store.put(blob, key);
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject("图片保存失败: " + event.target.errorCode);
            });
        },
        getImage: function(key) {
            return new Promise((resolve, reject) => {
                if (!this._db) return reject("数据库未初始化");
                const transaction = this._db.transaction(['images'], 'readonly');
                const store = transaction.objectStore('images');
                const request = store.get(key);
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject("图片读取失败: " + event.target.errorCode);
            });
        },
        deleteImage: function(key) {
            return new Promise((resolve, reject) => {
                if (!this._db) return reject("数据库未初始化");
                const transaction = this._db.transaction(['images'], 'readwrite');
                const store = transaction.objectStore('images');
                store.delete(key);
                transaction.oncomplete = () => resolve();
                transaction.onerror = (event) => reject("图片删除失败: " + event.target.errorCode);
            });
        }
    };

    // --- 1. 全局数据存储 ---
    let appData = {};
    let activeChatContactId = null;
    let lastReceivedSuggestions = [];
    let stagedUserMessages = [];
    let imageUploadMode = 'upload';
    let stagedImageData = null;
    let isSelectMode = false;
    let selectedMessages = new Set();
    let longPressTimer;
    let lastRenderedTimestamp = 0;
    let loadingBubbleElement = null;

    // --- 2. 元素获取 ---
    const appContainer = document.getElementById('app-container');
    const appNav = document.getElementById('app-nav');
    const views = document.querySelectorAll('.view');
    const navButtons = document.querySelectorAll('.nav-button');
    const csEditMyProfile = document.getElementById('cs-edit-my-profile');
    const addContactButton = document.getElementById('add-contact-button');
    const chatListContainer = document.getElementById('chat-list-container');
    const backToListButton = document.getElementById('back-to-list-button');
    const backFromMomentsBtn = document.getElementById('back-to-list-from-moments');
    const backFromSettingsBtn = document.getElementById('back-to-list-from-settings');
    const chatAiName = document.getElementById('chat-ai-name');
    const chatAiStatus = document.getElementById('chat-ai-status');
    const chatHeaderInfo = document.getElementById('chat-header-info');
    const chatSettingsButton = document.getElementById('chat-settings-button');
    const messageContainer = document.getElementById('message-container');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const voiceBtn = document.getElementById('voice-btn');
    const imageBtn = document.getElementById('image-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const redPacketBtn = document.getElementById('red-packet-btn');
    const emojiBtn = document.getElementById('emoji-btn');
    const aiHelperButton = document.getElementById('ai-helper-button');
    const moreFunctionsButton = document.getElementById('more-functions-button');
    const aiSuggestionPanel = document.getElementById('ai-suggestion-panel');
    const refreshSuggestionsContainer = document.getElementById('refresh-suggestions-container');
    const refreshSuggestionsBtn = document.getElementById('refresh-suggestions-btn');
    const apiTypeSelect = document.getElementById('api-type-select');
    const apiUrlInput = document.getElementById('api-url-input');
    const apiModelSelect = document.getElementById('api-model-select');
    const fetchModelsButton = document.getElementById('fetch-models-button');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveSettingsButton = document.getElementById('save-settings-button');
    const userProfileModal = document.getElementById('user-profile-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const saveProfileButton = document.getElementById('save-profile-button');
    const modalUserNameInput = document.getElementById('modal-user-name-input');
    const modalUserPersonaInput = document.getElementById('modal-user-persona-input');
    const userAvatarUploadArea = document.getElementById('user-avatar-upload-area');
    const userAvatarPreview = document.getElementById('user-avatar-preview');
    const userAvatarUploadInput = document.getElementById('user-avatar-upload-input');
    const chatHeaderNormal = document.getElementById('chat-header-normal');
    const chatHeaderSelect = document.getElementById('chat-header-select');
    const cancelSelectButton = document.getElementById('cancel-select-button');
    const selectCount = document.getElementById('select-count');
    const editSelectedButton = document.getElementById('edit-selected-button');
    const deleteSelectedButton = document.getElementById('delete-selected-button');
    const contactSettingsView = document.getElementById('contact-settings-view');
    const backToChatButton = document.getElementById('back-to-chat-button');
    const csContactAvatar = document.getElementById('cs-contact-avatar');
    const csMyAvatar = document.getElementById('cs-my-avatar');
    const csEditAiProfile = document.getElementById('cs-edit-ai-profile');
    const csPinToggle = document.getElementById('cs-pin-toggle');
    const csClearHistory = document.getElementById('cs-clear-history');
    const csDeleteContact = document.getElementById('cs-delete-contact');
    const aiEditorView = document.getElementById('ai-editor-view');
    const backToContactSettingsButton = document.getElementById('back-to-contact-settings-button');
    const avatarUploadArea = document.getElementById('avatar-upload-area');
    const avatarPreview = document.getElementById('avatar-preview');
    const avatarUploadInput = document.getElementById('avatar-upload-input');
    const photoUploadArea = document.getElementById('photo-upload-area');
    const photoPreview = document.getElementById('photo-preview');
    const photoUploadInput = document.getElementById('photo-upload-input');
    const aiEditorName = document.getElementById('ai-editor-name');
    const aiEditorRemark = document.getElementById('ai-editor-remark');
    const aiEditorPersona = document.getElementById('ai-editor-persona');
    const aiEditorMemory = document.getElementById('ai-editor-memory');
    const aiEditorWorldbook = document.getElementById('ai-editor-worldbook');
    const addWorldbookEntryButton = document.getElementById('add-worldbook-entry-button');
    const saveAiProfileButton = document.getElementById('save-ai-profile-button');
    const voiceInputModal = document.getElementById('voice-input-modal');
    const voiceTextInput = document.getElementById('voice-text-input');
    const cancelVoiceButton = document.getElementById('cancel-voice-button');
    const confirmVoiceButton = document.getElementById('confirm-voice-button');
    const aiImageModal = document.getElementById('ai-image-modal');
    const aiImageDescriptionText = document.getElementById('ai-image-description-text');
    const closeAiImageModalButton = document.getElementById('close-ai-image-modal-button');
    const imageUploadModal = document.getElementById('image-upload-modal');
    const imageUploadTitle = document.getElementById('image-upload-title');
    const userImageUploadArea = document.getElementById('user-image-upload-area');
    const userImagePreview = document.getElementById('user-image-preview');
    const userImageUploadInput = document.getElementById('user-image-upload-input');
    const imageDescriptionInput = document.getElementById('image-description-input');
    const cancelImageUploadButton = document.getElementById('cancel-image-upload-button');
    const confirmImageUploadButton = document.getElementById('confirm-image-upload-button');
    const contextLimitInput = document.getElementById('context-limit-input');
    const customConfirmModal = document.getElementById('custom-confirm-modal');
    const customConfirmTitle = document.getElementById('custom-confirm-title');
    const customConfirmText = document.getElementById('custom-confirm-text');
    const customConfirmCancelBtn = document.getElementById('custom-confirm-cancel-btn');
    const customConfirmOkBtn = document.getElementById('custom-confirm-ok-btn');
    const customAlertModal = document.getElementById('custom-alert-modal');
    const customAlertTitle = document.getElementById('custom-alert-title');
    const customAlertText = document.getElementById('custom-alert-text');
    const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');
    const redPacketInputModal = document.getElementById('red-packet-input-modal');
    const rpInputBlessing = document.getElementById('rp-input-blessing');
    const rpInputAmount = document.getElementById('rp-input-amount');
    const cancelRpInputBtn = document.getElementById('cancel-rp-input-btn');
    const confirmRpInputBtn = document.getElementById('confirm-rp-input-btn');
    const userStickerPanel = document.getElementById('user-sticker-panel');

    // --- 3. 核心功能 ---
    const sleep = ms => new Promise(res => setTimeout(res, ms));

    function formatMessageTimestamp(ts) {
        const date = new Date(ts);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 86400000);
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        let timePeriod = '';
        if (hours < 12) timePeriod = '上午';
        else if (hours < 18) timePeriod = '下午';
        else timePeriod = '晚上';
        if (hours > 12) hours -= 12;
        if (hours === 0) hours = 12;
        const timeStr = `${timePeriod} ${hours}:${minutes}`;
        if (date >= today) {
            return timeStr;
        } else if (date >= yesterday) {
            return `昨天 ${timeStr}`;
        } else {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${minutes}`;
        }
    }

    function openAiImageModal(description) {
        aiImageDescriptionText.innerHTML = description.replace(/\n/g, '<br>');
        aiImageModal.classList.remove('hidden');
    }

    function closeAiImageModal() {
        aiImageModal.classList.add('hidden');
    }

    function openImageUploadModal(mode) {
        imageUploadMode = mode;
        stagedImageData = null;
        imageDescriptionInput.value = '';
        userImagePreview.src = '';
        userImageUploadInput.value = null;
        const descriptionGroup = document.getElementById('image-description-group');
        if (mode === 'upload') {
            imageUploadTitle.textContent = '发送图片';
            document.getElementById('image-preview-area').style.display = 'block';
            descriptionGroup.style.display = 'block'; // 允许对上传图片进行描述
        } else {
            imageUploadTitle.textContent = '发送照片';
            document.getElementById('image-preview-area').style.display = 'none';
            descriptionGroup.style.display = 'block';
            imageDescriptionInput.placeholder = '例如：一张德牧小狗的照片，它正好奇地看着镜头...';
        }
        imageUploadModal.classList.remove('hidden');
    }

    function closeImageUploadModal() {
        imageUploadModal.classList.add('hidden');
    }

    function handleImagePreview(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            stagedImageData = e.target.result;
            userImagePreview.src = stagedImageData;
        };
        reader.readAsDataURL(file);
    }

    function sendImageMessage() {
        const description = imageDescriptionInput.value.trim();
        if (imageUploadMode === 'upload') {
            if (!stagedImageData) { alert('请先选择一张图片！'); return; }
            const message = { type: 'image', content: description || '图片', imageData: stagedImageData };
            stagedUserMessages.push(message);
            displayMessage(message.content, 'user', { isStaged: true, type: 'image', imageData: message.imageData });
        } else {
            if (!description) { alert('请填写图片描述！'); return; }
            const message = { type: 'image', content: description, imageData: null };
            stagedUserMessages.push(message);
            displayMessage(message.content, 'user', { isStaged: true, type: 'image', imageData: null });
        }
        closeImageUploadModal();
    }

    // --- 【全新】红包核心功能 ---
    function openRedPacket(messageId) {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;

        // 【核心修改】先去“聊天记录”里找
        let message = contact.chatHistory.find(msg => msg.id === messageId);
        
        // 【核心修改】如果没找到，就去“待发消息”列表里再找一次！
        if (!message) {
            message = stagedUserMessages.find(msg => msg.id === messageId);
        }

        // 现在，无论红包在哪，我们都能找到了
        if (!message || !message.redPacketData) return;

        const packet = message.redPacketData;

        // 【【【核心修改：增加“门卫”逻辑】】】
        // 在执行任何操作前，先检查红包是不是用户自己发的
        if (message.role === 'user') {
            // 如果是用户自己发的，无论是否领取，都只显示详情，然后立即停止
            showRedPacketDetails(packet, message.role);
            return; 
        }

        // 如果程序能走到这里，说明这一定是AI发的红包，可以继续正常的领取判断
        // 如果已经领过了，就只显示详情，不执行领取逻辑
        if (packet.isOpened) {
            showRedPacketDetails(packet, message.role);
            return;
        }

        // --- 执行领取逻辑 ---
        packet.isOpened = true; // 标记为已领取

        // 1. 显示红包详情模态框
        showRedPacketDetails(packet, message.role);

        // 2. 在聊天界面中插入“领取”的系统消息 (参考图4)
        // 【核心修改1】修正了消息文本的逻辑
        const systemMessageContent = (message.role === 'user') 
            ? `${contact.name} 领取了你的红包` // 当用户发的红包被领取时，显示AI的名字
            : `你领取了 ${packet.senderName} 的红包`; // 当AI发的红包被领取时，显示“你”

        // 【核心修改2】在调用时，明确告诉displayMessage这是一个“system”类型的消息
        displayMessage(systemMessageContent, 'system', { isNew: true, type: 'system' });
        
        // 3. 将聊天气泡变为“已领取”状态
        const messageRow = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageRow) {
            const bubble = messageRow.querySelector('.message-red-packet');
            bubble.classList.add('opened');
            // 【核心修改】我们不再移除点击功能，以便用户可以随时查看详情
            bubble.querySelector('.rp-bubble-info span').textContent = '已被领取';
        }

        // 4. 保存数据
        saveAppData();
    }
    /**
     * 【全新辅助函数】用于显示红包详情模态框
     * @param {object} packet - 红包数据对象
     * @param {string} senderRole - 发送者的角色 ('user' 或 'assistant')
     */
    function showRedPacketDetails(packet, senderRole) {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;

        const modal = document.getElementById('red-packet-modal');
        
        // 根据发送者角色，决定头像和名字
        const senderAvatar = (senderRole === 'user') ? contact.userAvatarUrl : contact.avatarUrl;
        const senderName = packet.senderName;
        
        // 填充模态框上半部分（这部分总会显示）
        modal.querySelector('#rp-sender-avatar').src = senderAvatar;
        modal.querySelector('#rp-sender-name').textContent = `${senderName}发送的红包`;
        modal.querySelector('#rp-blessing').textContent = packet.blessing;
        modal.querySelector('#rp-amount').textContent = packet.amount.toFixed(2);
        
        // 【【【核心修改：增加状态检查】】】
        const receiverList = modal.querySelector('#rp-receiver-list');

        // 只有当红包的 isOpened 状态为 true 时，才显示领取人信息
        if (packet.isOpened) {
            const receiverName = (senderRole === 'user') ? contact.name : contact.userProfile.name;
            const receiverAvatar = (senderRole === 'user') ? contact.avatarUrl : contact.userAvatarUrl;
            
            receiverList.innerHTML = `
                <div class="receiver-item">
                    <img src="${receiverAvatar}" class="avatar">
                    <div class="receiver-info">
                        <span class="receiver-name">${receiverName}</span>
                        <span class="receiver-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <span class="receiver-amount">${packet.amount.toFixed(2)}元</span>
                </div>
            `;
        } else {
            // 如果红包还没被领取，就清空领取人列表区域
            receiverList.innerHTML = '';
        }

        // 最后再显示整个模态框
        modal.classList.remove('hidden');
    }

    async function initialize() {
        await db.init();
        loadAppData();
        await renderChatList();
        renderSettingsUI();
        bindEventListeners();
        switchToView('chat-list-view');
    }
    
    function loadAppData() {
        const savedData = localStorage.getItem('myAiChatApp_V8_Data');
        if (savedData) { appData = JSON.parse(savedData); } 
        else { appData = { aiContacts: [], appSettings: { apiType: 'openai_proxy', apiUrl: '', apiKey: '', apiModel: '', contextLimit: 20 } }; }

        if (appData.currentUser) {
            appData.aiContacts.forEach(contact => { if (!contact.userProfile) { contact.userProfile = appData.currentUser; } });
            delete appData.currentUser;
        }
        if (!appData.appSettings) { appData.appSettings = { apiType: 'openai_proxy', apiUrl: '', apiKey: '', apiModel: '', contextLimit: 20 }; }
        if (appData.appSettings.contextLimit === undefined) { appData.appSettings.contextLimit = 20; }
        if (!appData.aiContacts) { appData.aiContacts = []; }
        appData.aiContacts.forEach(c => {
            if (!c.remark) c.remark = c.name;
            if (c.isPinned === undefined) c.isPinned = false;
            if (!c.userProfile) { c.userProfile = { name: '你', persona: '我是一个充满好奇心的人。' }; }
            if (!c.chatHistory) { c.chatHistory = []; }
            // 【【【核心修复：为老角色兼容表情包分组】】】
            if (!c.stickerGroups) c.stickerGroups = []; 
        });
        // 【终极修复】确保全局AI表情包仓库存在，防止打开AI编辑器时出错
        if (!appData.globalAiStickers) {
            appData.globalAiStickers = {};
        }
        saveAppData();
    }
    function saveAppData() {
        localStorage.setItem('myAiChatApp_V8_Data', JSON.stringify(appData));
    }
    
    function switchToView(viewId) {
        views.forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        if (viewId === 'chat-list-view' || viewId === 'moments-view' || viewId === 'settings-view') {
            appNav.classList.remove('hidden');
            appContainer.style.paddingBottom = '50px';
        } else {
            appNav.classList.add('hidden');
            appContainer.style.paddingBottom = '0px';
        }
        navButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.view === viewId);
        });
    }

    async function renderChatList() {
        chatListContainer.innerHTML = '';
        if (!appData.aiContacts || appData.aiContacts.length === 0) { 
            chatListContainer.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">点击右上角+号添加AI联系人</p>';
            return; 
        }
        const sortedContacts = [...appData.aiContacts].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        for (const contact of sortedContacts) {
            const avatarBlob = await db.getImage(`${contact.id}_avatar`);
            const avatarUrl = avatarBlob ? URL.createObjectURL(avatarBlob) : 'https://i.postimg.cc/kXq06mNq/ai-default.png';
            const lastMessage = (contact.chatHistory && contact.chatHistory.length > 0) ? contact.chatHistory[contact.chatHistory.length - 1] : { content: '...' };
            const item = document.createElement('div');
            item.className = 'chat-list-item';
            if (contact.isPinned) { item.classList.add('pinned'); }
            item.dataset.contactId = contact.id;
            item.innerHTML = `<img class="avatar" src="${avatarUrl}" alt="avatar"><div class="chat-list-item-info"><div class="chat-list-item-top"><span class="chat-list-item-name">${contact.remark}</span><span class="chat-list-item-time">昨天</span></div><div class="chat-list-item-msg">${lastMessage.content || '...'}</div></div>`;
            item.addEventListener('click', () => openChat(contact.id));
            chatListContainer.appendChild(item);
        }
    }
    
    function renderSettingsUI() {
        const settings = appData.appSettings;
        apiTypeSelect.value = settings.apiType;
        apiUrlInput.value = settings.apiUrl;
        apiKeyInput.value = settings.apiKey;
        if (settings.apiModel) {
            apiModelSelect.innerHTML = `<option value="${settings.apiModel}">${settings.apiModel}</option>`;
        } else {
            apiModelSelect.innerHTML = '';
        }
        updateSettingsUI();
        contextLimitInput.value = settings.contextLimit;
    }

    function updateSettingsUI() {
        const modelArea = document.getElementById('model-area');
        modelArea.style.display = apiTypeSelect.value === 'gemini_direct' ? 'none' : 'block';
    }

    async function openChat(contactId) {
        activeChatContactId = contactId;
        exitSelectMode();
        lastReceivedSuggestions = [];
        stagedUserMessages = [];
        lastRenderedTimestamp = 0;
        aiSuggestionPanel.classList.add('hidden');
        
        // 【终极修复】每次进入聊天界面时，都确保表情包面板是关闭的
        userStickerPanel.classList.remove('is-open');

        const contact = appData.aiContacts.find(c => c.id === contactId);
        if (!contact) return;
        const avatarBlob = await db.getImage(`${contact.id}_avatar`);
        contact.avatarUrl = avatarBlob ? URL.createObjectURL(avatarBlob) : 'https://i.postimg.cc/kXq06mNq/ai-default.png';
        const userAvatarBlob = await db.getImage(`${contact.id}_user_avatar`);
        contact.userAvatarUrl = userAvatarBlob ? URL.createObjectURL(userAvatarBlob) : 'https://i.postimg.cc/cLPP10Vm/4.jpg';
        chatAiName.textContent = contact.remark;
        messageContainer.innerHTML = '';
        contact.chatHistory.forEach((msg, index) => {
            msg.id = msg.id || `${Date.now()}-${index}`;
            displayMessage(msg.content, msg.role, { isNew: false, ...msg });
        });
        switchToView('chat-window-view');
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
    
    function displayMessage(text, role, options = {}) {
        const { isNew = false, isLoading = false, type = 'text', isStaged = false, id = null, timestamp = null } = options;
        
        const messageId = id || `${Date.now()}-${Math.random()}`;
        const currentTimestamp = timestamp || Date.now();
        const TIME_GAP = 3 * 60 * 1000;
        let timestampDiv = null;

        // 【核心修复】我们删除了 !isStaged 条件，让预览消息也能创建时间戳
        if (!isLoading && (lastRenderedTimestamp === 0 || currentTimestamp - lastRenderedTimestamp > TIME_GAP)) {
            timestampDiv = document.createElement('div');
            timestampDiv.className = 'timestamp-display';
            timestampDiv.textContent = formatMessageTimestamp(currentTimestamp);
        }
        // 【核心修复】我们也删除了这里的 !isStaged 条件，让程序能记住预览消息的时间
        if (!isLoading) { lastRenderedTimestamp = currentTimestamp; }
        
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);

        if (type === 'system') {
            const systemDiv = document.createElement('div');
            systemDiv.className = 'system-message';
            systemDiv.textContent = text;
            if (timestampDiv) messageContainer.appendChild(timestampDiv);
            messageContainer.appendChild(systemDiv);
            messageContainer.scrollTop = messageContainer.scrollHeight;
            if (isNew && !isStaged && contact) {
                 contact.chatHistory.push({ id: messageId, role: 'system', content: text, type: 'system', timestamp: currentTimestamp });
                 saveAppData();
            }
            return;
        }

        const messageRow = document.createElement('div');
        messageRow.className = `message-row ${role}-row`;
        messageRow.dataset.messageId = messageId;
        messageRow.dataset.role = role;
        if (isLoading && role === 'assistant') { loadingBubbleElement = messageRow; }
        if (isStaged) { messageRow.dataset.staged = 'true'; }

        const avatarUrl = role === 'user' ? (contact ? contact.userAvatarUrl : '') : (contact ? contact.avatarUrl : '');
        let messageContentHTML;

        switch(type) {
            case 'image':
                if (role === 'user') {
                    messageContentHTML = options.imageData ? `<div class="message message-image-user"><img src="${options.imageData}" alt="${text}"></div>` : `<div class="message">🖼️ [图片] ${text}</div>`;
                } else {
                    const escapedDescription = text ? text.replace(/"/g, '&quot;') : '';
                    messageContentHTML = `<div class="message message-image-ai-direct" data-description="${escapedDescription}"><img src="https://i.postimg.cc/vTdmV48q/a31b84cf45ff18f18b320470292a02c8.jpg" alt="AI生成的图片"></div>`;
                }
                break;
            case 'voice':
                const duration = Math.max(1, Math.round((text || '').length / 4));
                const bubbleWidth = Math.min(220, 100 + duration * 10);
                let waveBarsHTML = Array.from({length: 15}, () => `<div class="wave-bar" style="height: ${Math.random() * 80 + 20}%;"></div>`).join('');
                messageContentHTML = `
                    <div class="message message-voice" style="width: ${bubbleWidth}px;">
                        <div class="play-icon-container"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></div>
                        <div class="sound-wave">${waveBarsHTML}</div>
                        <span class="voice-duration">${duration}"</span>
                    </div>
                    <div class="voice-text-content">${text}</div>
                `;
                break;
            case 'red-packet':
                const packet = options.redPacketData || {};
                const isOpened = packet.isOpened || false;
                const bubbleClass = isOpened ? 'message-red-packet opened' : 'message-red-packet';
                
                // 【核心修改】我们把 onclick 事件的绑定交还给JS，而不是写在HTML里
                messageRow.dataset.action = 'open-red-packet';
                messageRow.dataset.messageId = messageId;
                
                messageContentHTML = `
                    <div class="${bubbleClass}">
                        <div class="rp-bubble-content">
                            <span class="rp-bubble-icon">🧧</span>
                            <div class="rp-bubble-info">
                                <p>${text || '恭喜发财'}</p>
                                <span>${isOpened ? '已被领取' : '点击领取红包'}</span>
                            </div>
                        </div>
                    </div>
                `;
                break;
                // 【核心新增】处理表情包消息的显示
            case 'sticker':
                const stickerUrl = options.stickerUrl || '';
                messageContentHTML = `<div class="message message-sticker"><img src="${stickerUrl}" alt="sticker"></div>`;
                break;
            default:
                messageContentHTML = `<div class="message">${text}</div>`;
        }
        
        messageRow.innerHTML = `
            <div class="select-checkbox hidden"></div>
            <img class="avatar" src="${avatarUrl}">
            <div class="message-content">${messageContentHTML}</div>
        `;
        
        addSelectListeners(messageRow);
        
        if (type === 'voice') {
            const voiceBubble = messageRow.querySelector('.message-voice');
            const voiceTextContent = messageRow.querySelector('.voice-text-content');
            setTimeout(() => voiceBubble.classList.add('playing'), 100);
            voiceBubble.addEventListener('click', () => {
                const isHidden = voiceTextContent.style.display === 'none' || voiceTextContent.style.display === '';
                voiceTextContent.style.display = isHidden ? 'block' : 'none';
            });
        }
        
        if (timestampDiv) { messageContainer.appendChild(timestampDiv); }
        messageContainer.appendChild(messageRow);
        const aiImageBubble = messageRow.querySelector('.message-image-ai-direct');
        if (aiImageBubble) {
            aiImageBubble.addEventListener('click', () => {
                const description = aiImageBubble.dataset.description;
                openAiImageModal(description);
            });
        }
        if (!isLoading) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }

        if (isNew && !isLoading && !isStaged && contact) {
            const messageToSave = {
                id: messageId,
                role: role,
                content: text,
                type: type,
                timestamp: currentTimestamp,
            };
            if (options.imageData) { messageToSave.imageData = options.imageData; }
            if (options.redPacketData) { messageToSave.redPacketData = options.redPacketData; }
            contact.chatHistory.push(messageToSave);
            saveAppData();
            renderChatList();
        }
    }

    function removeLoadingBubble() {
        if (loadingBubbleElement) { loadingBubbleElement.remove(); loadingBubbleElement = null; }
    }
    
    function stageUserMessage() {
        const text = chatInput.value.trim();
        if (text === '') return;
        stagedUserMessages.push({ content: text, type: 'text' });
        displayMessage(text, 'user', { isStaged: true, type: 'text' });
        chatInput.value = '';
    }

    function commitAndSendStagedMessages() {
        if (chatInput.value.trim() !== '') {
            stageUserMessage();
        }
        if (stagedUserMessages.length === 0) return;
        document.querySelectorAll('[data-staged="true"]').forEach(el => el.remove());
        stagedUserMessages.forEach(msg => {
            displayMessage(msg.content, 'user', { isNew: true, ...msg });
        });
        stagedUserMessages = [];
        getAiResponse();
    }

    async function getAiResponse() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        removeLoadingBubble();
        lastReceivedSuggestions = [];
        aiSuggestionPanel.classList.add('hidden');
        displayMessage('对方正在输入...', 'assistant', { isLoading: true });
        messageContainer.scrollTop = messageContainer.scrollHeight;
        const worldBookString = (contact.worldBook && contact.worldBook.length > 0) ? contact.worldBook.map(entry => `- ${entry.key}: ${entry.value}`).join('\n') : '无';
        const contextLimit = appData.appSettings.contextLimit || 50;
        const recentHistory = contact.chatHistory.slice(-contextLimit);
        // 【核心新增】准备AI可用的表情包列表
        let availableStickersPrompt = "你没有任何可用的表情包。";
        const availableStickers = [];
        contact.stickerGroups.forEach(groupName => {
            const group = appData.globalAiStickers[groupName] || [];
            group.forEach(sticker => availableStickers.push(sticker));
        });

        if (availableStickers.length > 0) {
            availableStickersPrompt = "你可以使用以下表情包来增强表达（请优先使用表情包而不是Emoji）：\n";
            availableStickers.forEach(sticker => {
                // 为每个表情包创建一个唯一的ID，格式为 [分组名_时间戳]
                sticker.id = sticker.id || `${sticker.group}_${Date.now()}_${Math.random()}`; 
                availableStickersPrompt += `- [STICKER:${sticker.id}] 描述: ${sticker.desc}\n`;
            });
        }
        // 这部分 messagesForApi 的构建逻辑是正确的，保持不变
        const messagesForApi = recentHistory
            .filter(msg => msg.role === 'user' || msg.role === 'assistant') 
            .map(msg => {
                const role = msg.role;
                const content = msg.content || '';
                if (role === 'user' && msg.type === 'image' && msg.imageData) {
                    return {
                        role: 'user',
                        content: [
                            { type: "text", text: content },
                            { type: "image_url", image_url: { url: msg.imageData } }
                        ]
                    };
                }
                let contentPrefix = '';
                if (msg.type === 'voice') {
                    contentPrefix = '[语音]';
                } else if (msg.type === 'red-packet') {
                    contentPrefix = '[红包]';
                }
                return {
                    role: role,
                    content: `${contentPrefix}${content}`
                };
            });

        const userPersona = (contact.userProfile && contact.userProfile.persona) 
            ? contact.userProfile.persona 
            : '我是一个普通人。';

        // 这部分 finalPrompt 的构建逻辑也是正确的，保持不变
        const finalPrompt = `# 任务: 角色扮演
        你是一个AI角色，你正在和一个真实用户聊天。你的所有回复都必须严格以角色的身份进行。

## 1. 核心身份
- 你的名字是: "${contact.name}"
- 你的核心人设是: 
\`\`\`
${contact.persona}
\`\`\`

## 2. 背景设定 (优先级高于个人记忆)
- 附加设定(世界书): ${worldBookString}
- 你的专属记忆: ${contact.memory}

## 3. 行为准则
- **重要背景**: 你正在通过聊天软件与用户（人设：${userPersona}）进行【线上对话】。当前时间: ${new Date().toLocaleString('zh-CN')}。
- **沟通风格参考**: ${contact.chatStyle || '自然发挥即可'}
- **回复风格**: 模拟真实聊天，将一个完整的思想拆分成【2-8条】独立的短消息。
- **禁止括号**: 【绝对不能】包含任何括号内的动作、神态描写。
- **回应图片**: 如果用户的消息包含图片，你【必须】先针对图片内容进行回应，然后再进行其他对话。
- **发送图片**: 如果你想发图片，请使用格式 \`[IMAGE: 这是图片的详细文字描述]\` 来单独发送它。
- **发送语音**: 如果某条回复更适合用语音表达（如唱歌、叹气、笑声），请在回复前加上 \`[voice]\` 标签。例如：\`[voice]嗯...让我想想。\`
- **发送红包**: 在特殊节日、为了表达感谢或在剧情需要时，你可以发红包。请【严格使用】以下格式：\`[REDPACKET:祝福语,金额]\`。例如：\`[REDPACKET:节日快乐！,8.88]\`
- **【【【核心规则：领取红包】】】**: 当用户给你发红包后，你【必须自己决定】是否领取。如果你决定领取，你的回复中【必须】单独包含一行暗号 \`[ACCEPT_REDPACKET]\`。你可以把感谢的话和这个暗号分开说。例如：
  \`[ACCEPT_REDPACKET]\`
  \`谢谢你的红包，我收下啦！\`
  如果你决定不领取，就【绝对不要】发送这个暗号，直接说出你拒绝的理由即可。
- **【【【发送表情包】】】**: 当你需要表达特定情绪时，你可以发送表情包。请从下面的可用列表中选择，并使用格式 \`[STICKER:表情包ID]\` 单独作为一条消息发送。

### 可用的表情包列表
${availableStickersPrompt}

---
# 【【【严格的输出格式要求】】】
你的回复【必须】是一个能被JSON解析的、单一的JSON对象。
你的输出【禁止】包含任何聊天内容、解释、或 \`\`\`json 标记。直接开始输出JSON对象。
这个JSON对象必须包含 "reply" 和 "suggestions" 两个键。

- **"reply"**: 一个字符串数组，包含了你作为角色的所有聊天消息（包括特殊指令）。
- **"suggestions"**: 一个包含4条字符串的数组，是为用户准备的回复建议（两条积极，一条中立，一条挑战）。

**格式示例:**
// ▼▼▼ 核心修复就在下面这一行 ▼▼▼
\\\`\\\`\\\`json
{
  "reply": [
    "这是第一条聊天消息。",
    "[STICKER:happy_cat_01]",
    "这是第三条消息。"
  ],
  "suggestions": [
    "哇，你太棒了！",
    "听起来很有趣，多和我说说。",
    "为什么会这样想呢？",
    "我不太同意你的看法。"
  ]
}
// ▲▲▲ 和上面这一行就是修复的关键 ▲▲▲
\\\`\\\`\\\`

## 开始对话
请根据上面的所有设定和下面的对话历史，对用户的最新消息做出回应，并只输出符合上述格式的JSON对象。`;
        
        const finalMessagesForApi = [ { role: "system", content: finalPrompt }, ...messagesForApi ];
        
        try {
            let requestUrl = appData.appSettings.apiUrl;
            if (!requestUrl.endsWith('/chat/completions')) { requestUrl = requestUrl.endsWith('/') ? requestUrl + 'chat/completions' : requestUrl + '/chat/completions'; }
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appData.appSettings.apiKey}` },
                body: JSON.stringify({ model: appData.appSettings.apiModel, messages: finalMessagesForApi, temperature: 0.8 })
            });
            
            removeLoadingBubble();
            if (!response.ok) throw new Error(`HTTP 错误 ${response.status}: ${await response.text()}`);
            
            const data = await response.json();
            if (data.error) throw new Error(`API返回错误: ${data.error.message}`);
            if (!data.choices || data.choices.length === 0) throw new Error("API返回了无效的数据结构。");
            
            // ▼▼▼ 核心修正在这里：加上了 [0] ▼▼▼
            let responseText = data.choices[0].message.content;
            // ▲▲▲ 修正结束 ▲▲▲

            let replies = [];
            lastReceivedSuggestions = [];

            try {
                // 【终极修复】第一步：从AI的回复中，精准地提取出JSON部分
                const jsonMatch = responseText.match(/{[\s\S]*}/);

                if (jsonMatch && jsonMatch) {
                    // 如果成功提取出了 {...} 这部分，就只解析这部分
                    const parsedResponse = JSON.parse(jsonMatch);

                    // 第二步：从解析后的对象中，安全地提取聊天和建议
                    if (parsedResponse.reply && Array.isArray(parsedResponse.reply)) {
                        replies = parsedResponse.reply;
                    }
                    if (parsedResponse.suggestions && Array.isArray(parsedResponse.suggestions)) {
                        lastReceivedSuggestions = parsedResponse.suggestions;
                    }

                } else {
                    // 如果连 {...} 的结构都找不到，就主动触发失败，执行降级方案
                    throw new Error("在AI回复中未找到有效的JSON结构。");
                }

            } catch (error) {
                console.error("解析AI返回的JSON失败:", error);
                // 降级兼容：如果上述所有步骤都失败了，再当作普通文本处理
                replies = responseText.split('\n').filter(line => line.trim() !== '');
            }


            // 3. 遍历处理每一条消息 (这部分逻辑也是对的)
            if (replies.length > 0) {
                for (const msg of replies) {
                    if (msg.startsWith('[REDPACKET:')) {
                        // ... (发送红包的代码保持不变)
                    } else if (msg.startsWith('[voice]')) {
                        // ... (发送语音的代码保持不变)
                    } else if (msg.startsWith('[IMAGE:')) {
                        // ... (发送图片的代码保持不变)
                    } else if (msg.trim().startsWith('[STICKER:')) {
                        // 【核心新增】处理AI发送表情包的指令
                        const stickerId = msg.trim().substring(9, msg.length - 1);
                        let foundSticker = null;
                        // 在所有全局表情包中查找这个ID
                        for (const groupName in appData.globalAiStickers) {
                            const sticker = appData.globalAiStickers[groupName].find(s => s.id === stickerId);
                            if (sticker) {
                                foundSticker = sticker;
                                break;
                            }
                        }
                        if (foundSticker) {
                            displayMessage('', 'assistant', { isNew: true, type: 'sticker', stickerUrl: foundSticker.url });
                        }
                        continue; // 处理完指令后跳过
                    } else if (msg.trim() === '[ACCEPT_REDPACKET]') {
                        // 【终极修复】在这里执行领取红包的完整逻辑
                        // 1. 从后往前，找到用户发的最后一个、还没被领取的红包
                        const userRedPacketMsg = [...contact.chatHistory].reverse().find(
                            m => m.role === 'user' && m.type === 'red-packet' && m.redPacketData && !m.redPacketData.isOpened
                        );

                        // 2. 如果找到了这个红包
                        if (userRedPacketMsg) {
                            // 2a. 在数据层面，把它标记为“已打开”
                            userRedPacketMsg.redPacketData.isOpened = true;

                            // 2b. 在界面层面，找到那个红包气泡并更新它的样式
                            const messageRow = document.querySelector(`[data-message-id="${userRedPacketMsg.id}"]`);
                            if (messageRow) {
                                const bubble = messageRow.querySelector('.message-red-packet');
                                bubble.classList.add('opened');
                                bubble.querySelector('.rp-bubble-info span').textContent = '已被领取';
                            }

                            // 2c. 显示“xx已领取你的红包”的系统提示消息
                            displayMessage(`${contact.name} 领取了你的红包`, 'system', { isNew: true, type: 'system' });
                        }
                        
                        // 3. 这是一个“听而不闻”的静默指令，直接跳过，不要显示它
                        continue; 
                        
                    } else {
                        displayMessage(msg, 'assistant', { isNew: true, type: 'text' });
                    }
                    await sleep(Math.random() * 400 + 300);
                }
            }
            
            messageContainer.scrollTop = messageContainer.scrollHeight;

        } catch (error) {
            console.error('API调用失败:', error);
            removeLoadingBubble();
            displayMessage(`(｡•́︿•̀｡) 哎呀，出错了: ${error.message}`, 'assistant', { isNew: true });
        }
    }

    async function refreshSuggestions() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        const suggestionsContainer = aiSuggestionPanel.querySelector('.suggestion-buttons-container');
        if (suggestionsContainer) { suggestionsContainer.innerHTML = `<span style="color:#999; font-size:13px; width:100%; text-align:left;">正在努力刷新...</span>`; }
        const refreshButton = document.getElementById('refresh-suggestions-btn');
        refreshButton.classList.add('spinning');
        refreshButton.disabled = true;
        const lastAiReplies = [];
        for (let i = contact.chatHistory.length - 1; i >= 0; i--) {
            if (contact.chatHistory[i].role === 'assistant') { lastAiReplies.unshift(contact.chatHistory[i].content); } 
            else if (contact.chatHistory[i].role === 'user') { break; }
        }
        if (lastAiReplies.length === 0) {
            refreshButton.classList.remove('spinning');
            refreshButton.disabled = false;
            return;
        }
        const refreshPrompt = `# 你的任务
- 你是 AI 助手 "${contact.name}"。
- 你刚刚发送了以下消息: "${lastAiReplies.join(' ')}"
- 现在，请**只**为用户（人设：${contact.userProfile.persona}）生成一套**全新的、与上次不同**的4条回复建议。
- **建议1 & 2 (温和正面)**: 设计两条【温和或积极】的回答。其中一条【必须】是你最期望听到的、能让关系升温的回答。
- **建议3 (中立探索)**: 设计一条【中立或疑问】的回答。
- **建议4 (挑战/负面)**: 设计一条【带有挑战性或负面情绪】的回答，但要符合恋爱逻辑。
# 输出格式要求
你的回复【必须】是一个能被JSON解析的对象，并且【只包含 suggestions 字段】:
{
  "suggestions": ["全新的建议1", "全新的建议2", "全新的建议3", "全新的建议4"]
}`;
        try {
            const requestUrl = appData.appSettings.apiUrl.endsWith('/chat/completions') ? appData.appSettings.apiUrl : appData.appSettings.apiUrl + '/chat/completions';
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appData.appSettings.apiKey}` },
                body: JSON.stringify({ model: appData.appSettings.apiModel, messages: [{ role: 'user', content: refreshPrompt }] })
            });
            if (!response.ok) throw new Error(`HTTP 错误 ${response.status}`);
            const data = await response.json();
            if (!data.choices || data.choices.length === 0) throw new Error("API返回了无效的数据。");
            const responseText = data.choices[0].message.content;
            const jsonMatch = responseText.match(/{[\s\S]*}/);
            if (jsonMatch) {
                const responseData = JSON.parse(jsonMatch[0]);
                if (responseData.suggestions && responseData.suggestions.length > 0) { lastReceivedSuggestions = responseData.suggestions; } 
                else { lastReceivedSuggestions = []; }
            } else { throw new Error("返回的建议格式不正确。"); }
        } catch (error) {
            console.error('刷新建议失败:', error);
            lastReceivedSuggestions.push('刷新失败了，请稍后再试~');
        } finally {
            displaySuggestions();
        }
    }
    
    function displaySuggestions() {
        aiSuggestionPanel.innerHTML = '';
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'suggestion-buttons-container';
        if (lastReceivedSuggestions.length === 0) {
            buttonsContainer.innerHTML = `<span style="color:#999;font-size:12px;">暂时没有建议哦~</span>`;
            aiSuggestionPanel.appendChild(buttonsContainer);
        } else {
            lastReceivedSuggestions.forEach(text => {
                const button = document.createElement('button');
                button.className = 'suggestion-button';
                button.textContent = text;
                button.onclick = () => { chatInput.value = text; aiSuggestionPanel.classList.add('hidden'); };
                buttonsContainer.appendChild(button);
            });
            const refreshButton = document.createElement('button');
            refreshButton.id = 'refresh-suggestions-btn';
            refreshButton.title = '换一批';
            refreshButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`;
            refreshButton.addEventListener('click', refreshSuggestions);
            aiSuggestionPanel.appendChild(buttonsContainer);
            aiSuggestionPanel.appendChild(refreshButton);
        }
        aiSuggestionPanel.classList.remove('hidden');
    }

    function showSuggestionUI() {
        aiSuggestionPanel.classList.remove('hidden');
        refreshSuggestionsContainer.classList.remove('hidden');
    }

    function hideSuggestionUI() {
        aiSuggestionPanel.classList.add('hidden');
        refreshSuggestionsContainer.classList.add('hidden');
    }

    async function fetchModels() {
        const url = apiUrlInput.value.trim();
        const key = apiKeyInput.value.trim();
        if (!url || !key) { alert('请先填写 API 地址和密钥！'); return; }
        fetchModelsButton.textContent = '...';
        fetchModelsButton.disabled = true;
        try {
            const modelsUrl = url.replace(/\/chat\/completions\/?$/, '') + '/models';
            const response = await fetch(modelsUrl, { headers: { 'Authorization': `Bearer ${key}` } });
            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            if (!data.data || !Array.isArray(data.data)) throw new Error("模型列表格式不正确。");
            const models = data.data.map(model => model.id).sort();
            apiModelSelect.innerHTML = '';
            models.forEach(modelId => {
                const option = document.createElement('option');
                option.value = modelId;
                option.textContent = modelId;
                apiModelSelect.appendChild(option);
            });
            if (appData.appSettings.apiModel && models.includes(appData.appSettings.apiModel)) { apiModelSelect.value = appData.appSettings.apiModel; }
            alert('模型列表已成功拉取！');
        } catch (error) {
            alert(`拉取模型失败: ${error.message}`);
        } finally {
            fetchModelsButton.textContent = '拉取';
            fetchModelsButton.disabled = false;
        }
    }

    async function openProfileModal() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        modalUserNameInput.value = contact.userProfile.name;
        modalUserPersonaInput.value = contact.userProfile.persona;
        const userAvatarBlob = await db.getImage(`${activeChatContactId}_user_avatar`);
        userAvatarPreview.src = userAvatarBlob ? URL.createObjectURL(userAvatarBlob) : 'https://i.postimg.cc/cLPP10Vm/4.jpg';
        userProfileModal.classList.remove('hidden');
    }

    function closeProfileModal() {
        userProfileModal.classList.add('hidden');
    }

    function openVoiceModal() {
        voiceTextInput.value = '';
        voiceInputModal.classList.remove('hidden');
        voiceTextInput.focus();
    }

    function closeVoiceModal() {
        voiceInputModal.classList.add('hidden');
    }

    function sendVoiceMessage() {
        const text = voiceTextInput.value.trim();
        if (!text) { alert("请输入语音内容！"); return; }
        stagedUserMessages.push({ content: text, type: 'voice' });
        displayMessage(text, 'user', { isStaged: true, type: 'voice' });
        closeVoiceModal();
    }

    async function openContactSettings() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        document.querySelector('.contact-settings-container').scrollTop = 0;
        const aiAvatarBlob = await db.getImage(`${contact.id}_avatar`);
        csContactAvatar.src = aiAvatarBlob ? URL.createObjectURL(aiAvatarBlob) : 'https://i.postimg.cc/kXq06mNq/ai-default.png';
        const myAvatarBlob = await db.getImage(`${contact.id}_user_avatar`);
        csMyAvatar.src = myAvatarBlob ? URL.createObjectURL(myAvatarBlob) : 'https://i.postimg.cc/cLPP10Vm/4.jpg';
        csPinToggle.checked = contact.isPinned || false;
        switchToView('contact-settings-view');
    }

    async function openAiEditor() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        // ... (前面获取头像、姓名等的代码保持不变) ...
        const avatarBlob = await db.getImage(`${contact.id}_avatar`);
        avatarPreview.src = avatarBlob ? URL.createObjectURL(avatarBlob) : '';
        const photoBlob = await db.getImage(`${contact.id}_photo`);
        photoPreview.src = photoBlob ? URL.createObjectURL(photoBlob) : '';
        aiEditorName.value = contact.name;
        aiEditorRemark.value = contact.remark;
        aiEditorPersona.value = contact.persona;
        document.getElementById('ai-editor-chat-style').value = contact.chatStyle || '';
        aiEditorMemory.value = contact.memory;
        aiEditorWorldbook.innerHTML = '';
        if (contact.worldBook && contact.worldBook.length > 0) {
            contact.worldBook.forEach(entry => renderWorldbookEntry(entry.key, entry.value));
        }

        // 【核心新增】渲染可用的表情包分组
        const stickerGroupsContainer = document.getElementById('ai-sticker-groups-container');
        stickerGroupsContainer.innerHTML = '';
        const allGroupNames = Object.keys(appData.globalAiStickers);

        if (allGroupNames.length === 0) {
            stickerGroupsContainer.innerHTML = '<p class="placeholder-text">请先在 全局设置 -> AI表情包管理 中添加分组</p>';
        } else {
            allGroupNames.forEach(groupName => {
                const isChecked = contact.stickerGroups.includes(groupName);
                const checkboxWrapper = document.createElement('div');
                checkboxWrapper.className = 'checkbox-item';
                checkboxWrapper.innerHTML = `
                    <input type="checkbox" id="sticker-group-${groupName}" value="${groupName}" ${isChecked ? 'checked' : ''}>
                    <label for="sticker-group-${groupName}">${groupName}</label>
                `;
                stickerGroupsContainer.appendChild(checkboxWrapper);
            });
        }
        
        switchToView('ai-editor-view');
    }
    
    function handleImageUpload(file, key, previewElement) {
        if (!file || !file.type.startsWith('image/')) { alert('请选择一个图片文件！'); return; }
        previewElement.src = URL.createObjectURL(file);
        db.saveImage(key, file).catch(err => { console.error(err); alert('图片保存失败！'); });
    }

    function renderWorldbookEntry(key = '', value = '') {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'worldbook-entry';
        entryDiv.innerHTML = `
            <div class="worldbook-header">
                <input type="text" class="worldbook-key" placeholder="关键词" value="${key}">
                <button class="worldbook-delete-btn">-</button>
            </div>
            <textarea class="worldbook-value" placeholder="内容...">${value}</textarea>
        `;
        entryDiv.querySelector('.worldbook-delete-btn').onclick = () => entryDiv.remove();
        aiEditorWorldbook.appendChild(entryDiv);
    }

    function saveAiProfile() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        
        contact.name = aiEditorName.value.trim() || 'AI伙伴';
        contact.remark = aiEditorRemark.value.trim() || contact.name;
        contact.persona = aiEditorPersona.value;
        contact.chatStyle = document.getElementById('ai-editor-chat-style').value;
        contact.memory = aiEditorMemory.value;
        
        contact.worldBook = [];
        aiEditorWorldbook.querySelectorAll('.worldbook-entry').forEach(entryDiv => {
            const key = entryDiv.querySelector('.worldbook-key').value.trim();
            // 【【【核心修复：修正了致命的拼写错误】】】
            const value = entryDiv.querySelector('.worldbook-value').value.trim(); 
            if (key) { contact.worldBook.push({ key, value }); }
        });

        contact.stickerGroups = [];
        const selectedCheckboxes = document.querySelectorAll('#ai-sticker-groups-container input[type="checkbox"]:checked');
        selectedCheckboxes.forEach(checkbox => {
            contact.stickerGroups.push(checkbox.value);
        });

        saveAppData();
        chatAiName.textContent = contact.remark;
        renderChatList();
        alert('AI信息已保存！');
        switchToView('contact-settings-view');
    }
    
    function clearActiveChatHistory() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        showCustomConfirm(`清空确认`, `确定要清空与 ${contact.remark} 的所有聊天记录吗？\n此操作无法撤销。`, () => {
            contact.chatHistory = [];
            saveAppData();
            messageContainer.innerHTML = '';
            renderChatList();
            showCustomAlert('操作成功', '聊天记录已清空。');
        });
    }

    function togglePinActiveChat() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        contact.isPinned = csPinToggle.checked;
        saveAppData();
        renderChatList();
    }

    function addSelectListeners(element) {
        element.addEventListener('mousedown', (e) => { if (isSelectMode || e.button !== 0) return; longPressTimer = setTimeout(() => enterSelectMode(element), 500); });
        element.addEventListener('mouseup', () => clearTimeout(longPressTimer));
        element.addEventListener('mouseleave', () => clearTimeout(longPressTimer));
        element.addEventListener('touchstart', (e) => { if (isSelectMode) return; longPressTimer = setTimeout(() => enterSelectMode(element), 500); });
        element.addEventListener('touchend', () => clearTimeout(longPressTimer));
        element.addEventListener('touchmove', () => clearTimeout(longPressTimer));
        element.addEventListener('click', () => { if (isSelectMode) toggleMessageSelection(element); });
    }

    function enterSelectMode(element) {
        isSelectMode = true;
        chatHeaderNormal.classList.add('hidden');
        chatHeaderSelect.classList.remove('hidden');
        messageContainer.querySelectorAll('.message-row').forEach(row => {
            row.classList.add('in-select-mode');
            row.querySelector('.select-checkbox').classList.remove('hidden');
        });
        if (element) toggleMessageSelection(element);
    }

    function exitSelectMode() {
        isSelectMode = false;
        selectedMessages.clear();
        chatHeaderNormal.classList.remove('hidden');
        chatHeaderSelect.classList.add('hidden');
        editSelectedButton.classList.add('hidden');
        messageContainer.querySelectorAll('.message-row').forEach(row => {
            row.classList.remove('in-select-mode');
            const checkbox = row.querySelector('.select-checkbox');
            if (checkbox) { checkbox.classList.add('hidden'); checkbox.classList.remove('checked'); }
        });
    }

    function toggleMessageSelection(element) {
        const messageId = element.dataset.messageId;
        const checkbox = element.querySelector('.select-checkbox');
        if (!checkbox) return;
        if (selectedMessages.has(messageId)) {
            selectedMessages.delete(messageId);
            checkbox.classList.remove('checked');
        } else {
            selectedMessages.add(messageId);
            checkbox.classList.add('checked');
        }
        selectCount.textContent = `已选择${selectedMessages.size}项`;
        deleteSelectedButton.disabled = selectedMessages.size === 0;
        const firstSelectedId = selectedMessages.values().next().value;
        const firstSelectedEl = messageContainer.querySelector(`[data-message-id="${firstSelectedId}"]`);
        if (selectedMessages.size === 1 && firstSelectedEl && firstSelectedEl.dataset.role === 'user') {
            editSelectedButton.classList.remove('hidden');
        } else {
            editSelectedButton.classList.add('hidden');
        }
    }
    
    function editSelectedMessage() {
        if (selectedMessages.size !== 1) return;
        const messageId = selectedMessages.values().next().value;
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        const messageData = contact.chatHistory.find(msg => msg.id === messageId);
        if (!messageData || messageData.role !== 'user') return;
        const newText = prompt("编辑你的消息：", messageData.content);
        if (newText !== null && newText.trim() !== '') {
            messageData.content = newText.trim();
            saveAppData();
            const messageElement = messageContainer.querySelector(`[data-message-id="${messageId}"] .message`);
            if (messageElement) { messageElement.textContent = newText.trim(); }
            renderChatList();
        }
        exitSelectMode();
    }

    function deleteSelectedMessages() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        contact.chatHistory = contact.chatHistory.filter(msg => !selectedMessages.has(msg.id));
        saveAppData();
        selectedMessages.forEach(id => {
            const el = messageContainer.querySelector(`[data-message-id="${id}"]`);
            if (el) el.remove();
        });
        exitSelectMode();
        renderChatList();
    }

    let confirmCallback = null;
    function showCustomConfirm(title, text, onConfirm) {
        customConfirmTitle.textContent = title;
        customConfirmText.textContent = text;
        confirmCallback = onConfirm;
        customConfirmModal.classList.remove('hidden');
    }

    function closeCustomConfirm() {
        customConfirmModal.classList.add('hidden');
        confirmCallback = null;
    }

    function showCustomAlert(title, text) {
        customAlertTitle.textContent = title;
        customAlertText.textContent = text;
        customAlertModal.classList.remove('hidden');
    }

    function closeCustomAlert() {
        customAlertModal.classList.add('hidden');
    }

    function deleteActiveContact() {
        const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
        if (!contact) return;
        showCustomConfirm('删除确认', `真的要删除角色 "${contact.remark}" 吗？\n\n与TA的所有聊天记录和设定都将被永久清除，此操作无法撤销！`, () => {
            appData.aiContacts = appData.aiContacts.filter(c => c.id !== activeChatContactId);
            saveAppData();
            db.deleteImage(`${activeChatContactId}_avatar`);
            db.deleteImage(`${activeChatContactId}_user_avatar`);
            db.deleteImage(`${activeChatContactId}_photo`);
            showCustomAlert('删除成功', `角色 "${contact.remark}" 已被删除。`);
            switchToView('chat-list-view');
            renderChatList();
        });
    }
    
    function addNewContact() {
        const newContactId = Date.now();
        const newContact = {
            id: newContactId,
            name: `新伙伴 ${newContactId.toString().slice(-4)}`,
            remark: `新伙伴 ${newContactId.toString().slice(-4)}`,
            persona: `新伙伴 ${newContactId.toString().slice(-4)}\n这是一个新创建的AI伙伴，等待你为TA注入灵魂。`,
            chatStyle: '',
            userProfile: { name: '你', persona: '我是一个充满好奇心的人。' },
            worldBook: [], 
            memory: '', 
            chatHistory: [], 
            moments: [], 
            isPinned: false,
            // 【【【核心修复：为新角色初始化表情包分组】】】
            stickerGroups: [] 
        };
        appData.aiContacts.push(newContact);
        saveAppData();
        renderChatList();
        activeChatContactId = newContactId;
        openContactSettings();
    }

    function bindEventListeners() {
    // 【全新】使用事件委托处理红包点击
    messageContainer.addEventListener('click', (e) => {
            const targetRow = e.target.closest('.message-row[data-action="open-red-packet"]');
            if (targetRow) {
                openRedPacket(targetRow.dataset.messageId);
            }
        });

        navButtons.forEach(button => button.addEventListener('click', () => switchToView(button.dataset.view)));
        backToListButton.addEventListener('click', () => switchToView('chat-list-view'));
        backFromMomentsBtn.addEventListener('click', () => switchToView('chat-list-view'));
        backFromSettingsBtn.addEventListener('click', () => switchToView('chat-list-view'));
        chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stageUserMessage(); } });
        sendButton.addEventListener('click', () => { commitAndSendStagedMessages(); });
        saveSettingsButton.addEventListener('click', () => {
            appData.appSettings.apiType = apiTypeSelect.value;
            appData.appSettings.apiUrl = apiUrlInput.value.trim();
            appData.appSettings.apiKey = apiKeyInput.value.trim();
            appData.appSettings.apiModel = apiModelSelect.value;
            appData.appSettings.contextLimit = parseInt(contextLimitInput.value) || 50;
            saveAppData();
            alert('设置已保存！');
        });
        apiTypeSelect.addEventListener('change', updateSettingsUI);
        fetchModelsButton.addEventListener('click', fetchModels);
        csEditMyProfile.addEventListener('click', openProfileModal);
        closeModalButton.addEventListener('click', closeProfileModal);
        saveProfileButton.addEventListener('click', async () => {
            const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
            if (!contact) return;
            contact.userProfile.name = modalUserNameInput.value.trim();
            contact.userProfile.persona = modalUserPersonaInput.value;
            saveAppData();
            const myAvatarBlob = await db.getImage(`${contact.id}_user_avatar`);
            csMyAvatar.src = myAvatarBlob ? URL.createObjectURL(myAvatarBlob) : 'https://i.postimg.cc/cLPP10Vm/4.jpg';
            closeProfileModal();
            alert('此对话中的身份已保存！');
        });
        userAvatarUploadArea.addEventListener('click', () => userAvatarUploadInput.click());
        userAvatarUploadInput.addEventListener('change', (e) => handleImageUpload(e.target.files[0], `${activeChatContactId}_user_avatar`, userAvatarPreview));
        addContactButton.addEventListener('click', addNewContact);
        chatSettingsButton.addEventListener('click', openContactSettings);
        backToChatButton.addEventListener('click', () => switchToView('chat-window-view'));
        csEditAiProfile.addEventListener('click', openAiEditor);
        backToContactSettingsButton.addEventListener('click', () => switchToView('contact-settings-view'));
        addWorldbookEntryButton.addEventListener('click', () => renderWorldbookEntry());
        saveAiProfileButton.addEventListener('click', saveAiProfile);
        chatHeaderInfo.addEventListener('click', openAiEditor);
        voiceBtn.addEventListener('click', openVoiceModal);
        cancelVoiceButton.addEventListener('click', closeVoiceModal);
        confirmVoiceButton.addEventListener('click', sendVoiceMessage);
        imageBtn.addEventListener('click', () => openImageUploadModal('upload'));
        cameraBtn.addEventListener('click', () => openImageUploadModal('simulate'));
        // 【核心修改】将所有红包相关的逻辑，都移到我们的新弹窗里
        function openRedPacketInputModal() {
            rpInputBlessing.value = '恭喜发财'; // 每次打开都重置为默认祝福语
            rpInputAmount.value = ''; // 清空上次输入的金额
            redPacketInputModal.classList.remove('hidden');
            rpInputBlessing.focus(); // 自动聚焦到祝福语输入框
        }

        function closeRedPacketInputModal() {
            redPacketInputModal.classList.add('hidden');
        }

        function handleConfirmRedPacket() {
            const blessing = rpInputBlessing.value.trim();
            const amount = parseFloat(rpInputAmount.value);

            if (!blessing) {
                showCustomAlert('提示', '请输入红包祝福语！');
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                showCustomAlert('提示', '请输入有效的金额！');
                return;
            }

            const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
            const tempMessageId = `staged-${Date.now()}-${Math.random()}`;
            const newRedPacket = { id: `rp-${Date.now()}`, senderName: contact.userProfile.name, blessing: blessing, amount: amount, isOpened: false };
            
            // 【【【核心修复：在这里补上了 'role: 'user'】】】
            stagedUserMessages.push({ id: tempMessageId, role: 'user', content: blessing, type: 'red-packet', redPacketData: newRedPacket });
            
            displayMessage(blessing, 'user', { isStaged: true, type: 'red-packet', redPacketData: newRedPacket, id: tempMessageId });
            
            closeRedPacketInputModal(); // 完成后关闭弹窗
        }
        function renderUserStickerPanel() {
            userStickerPanel.innerHTML = ''; // 清空旧内容

            // 1. 创建“添加”按钮
            const addBtn = document.createElement('div');
            addBtn.className = 'sticker-item sticker-add-btn';
            addBtn.textContent = '+';
            addBtn.title = '添加新表情';
            addBtn.onclick = () => { alert('此功能将在后续版本中开放，请先通过AI表情包管理添加并授权使用。'); };
            userStickerPanel.appendChild(addBtn);
            
            // 2. 渲染用户可用的表情包 (当前版本中，用户使用的是AI授权的表情包)
            const contact = appData.aiContacts.find(c => c.id === activeChatContactId);
            if (!contact) return;

            contact.stickerGroups.forEach(groupName => {
                const groupStickers = appData.globalAiStickers[groupName] || [];
                groupStickers.forEach(sticker => {
                    const stickerItem = document.createElement('div');
                    stickerItem.className = 'sticker-item';
                    stickerItem.innerHTML = `<img src="${sticker.url}" alt="${sticker.desc}">`;
                    stickerItem.onclick = () => sendStickerMessage(sticker);
                    userStickerPanel.appendChild(stickerItem);
                });
            });
        }

        function sendStickerMessage(sticker) {
            // 发送表情包消息是一种新的消息类型
            displayMessage('', 'user', { isNew: true, type: 'sticker', stickerUrl: sticker.url });
            userStickerPanel.classList.remove('is-open'); // 发送后自动关闭面板
            getAiResponse(); // 立即获取AI回应
        }

        // 现在，点击红包图标只会打开我们漂亮的弹窗
        redPacketBtn.addEventListener('click', openRedPacketInputModal);

        // 为新弹窗的按钮绑定功能
        cancelRpInputBtn.addEventListener('click', closeRedPacketInputModal);
        confirmRpInputBtn.addEventListener('click', handleConfirmRedPacket);
        // 【核心修改】点击表情按钮，现在会切换表情包面板
        emojiBtn.addEventListener('click', () => {
            // 在面板即将被打开前，先渲染内容
            if (!userStickerPanel.classList.contains('is-open')) {
                renderUserStickerPanel();
            }
            // 直接切换我们新的 .is-open 类，实现优雅的滑动开关
            userStickerPanel.classList.toggle('is-open');
        });
        moreFunctionsButton.addEventListener('click', () => alert("开发中！"));
        aiHelperButton.addEventListener('click', () => {
            if (aiSuggestionPanel.classList.contains('hidden')) { displaySuggestions(); } 
            else { hideSuggestionUI(); }
        });
        cancelSelectButton.addEventListener('click', exitSelectMode);
        editSelectedButton.addEventListener('click', editSelectedMessage);
        deleteSelectedButton.addEventListener('click', deleteSelectedMessages);
        avatarUploadArea.addEventListener('click', () => avatarUploadInput.click());
        avatarUploadInput.addEventListener('change', (e) => handleImageUpload(e.target.files[0], `${activeChatContactId}_avatar`, avatarPreview));
        photoUploadArea.addEventListener('click', () => photoUploadInput.click());
        photoUploadInput.addEventListener('change', (e) => handleImageUpload(e.target.files[0], `${activeChatContactId}_photo`, photoPreview));
        contactSettingsView.querySelectorAll('.settings-item').forEach(item => {
            if (item.id !== 'cs-edit-ai-profile' && item.id !== 'cs-edit-my-profile' && item.id !== 'cs-clear-history' && item.id !== 'cs-delete-contact' && !item.querySelector('.switch')) {
                item.addEventListener('click', () => alert('功能开发中，敬请期待！'));
            }
        });
        csClearHistory.addEventListener('click', clearActiveChatHistory);
        csDeleteContact.addEventListener('click', deleteActiveContact);
        csPinToggle.addEventListener('change', togglePinActiveChat);
        customConfirmCancelBtn.addEventListener('click', closeCustomConfirm);
        customAlertOkBtn.addEventListener('click', closeCustomAlert);
        customConfirmOkBtn.addEventListener('click', () => { if (confirmCallback) { confirmCallback(); } closeCustomConfirm(); });
        userImageUploadArea.addEventListener('click', () => userImageUploadInput.click());
        userImageUploadInput.addEventListener('change', handleImagePreview);
        cancelImageUploadButton.addEventListener('click', closeImageUploadModal);
        confirmImageUploadButton.addEventListener('click', sendImageMessage);
        if(closeAiImageModalButton) { closeAiImageModalButton.addEventListener('click', closeAiImageModal); }
        refreshSuggestionsBtn.addEventListener('click', refreshSuggestions);
        document.getElementById('close-rp-modal-button').addEventListener('click', () => {
            document.getElementById('red-packet-modal').classList.add('hidden');
        });
    // 【全新】点击消息区域，自动关闭表情包面板
        messageContainer.addEventListener('click', () => {
            if (userStickerPanel.classList.contains('is-open')) {
                userStickerPanel.classList.remove('is-open');
            }
        });

        // ▲▲▲ 请把上面这段全新的代码，粘贴在这里 ▲▲▲
    }
    
    initialize();
});
